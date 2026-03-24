/**
 * TerminalPanel — Panel terminala po prawej stronie przeglądarki
 * 3 zakładki: 🐚 Shell | ⚡ JS | 📋 Komendy (paleta komend)
 * Rozbudowany system komend + zarządzanie cwd + historia
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface TerminalPanelProps {
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

type TerminalTab = 'shell' | 'js' | 'commands';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'info' | 'system';
  content: string;
  timestamp: number;
}

interface QuickCommand {
  label: string;
  cmd: string;
  icon: string;
  description: string;
}

interface CommandCategory {
  name: string;
  icon: string;
  commands: QuickCommand[];
}

const api = () => (window as any).electronAPI;

// ── Pre-built command categories ───────────────────────────────

const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    name: 'System',
    icon: '💻',
    commands: [
      { label: 'Info systemowe', cmd: 'systeminfo | Select-String "OS Name|OS Version|System Type|Total Physical Memory"', icon: '🖥', description: 'System operacyjny i pamięć' },
      { label: 'Dyski', cmd: 'Get-PSDrive -PSProvider FileSystem | Format-Table Name,Used,Free,Root -AutoSize', icon: '💾', description: 'Wolne miejsce na dyskach' },
      { label: 'Procesy (Top 10)', cmd: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,Id,CPU,WorkingSet | Format-Table -AutoSize', icon: '📊', description: 'Procesy wg CPU' },
      { label: 'Pamięć RAM', cmd: '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1).ToString() + " GB wolne / " + [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1).ToString() + " GB"', icon: '🧠', description: 'Użycie pamięci RAM' },
      { label: 'Zmienne środowiskowe', cmd: 'Get-ChildItem Env: | Sort-Object Name | Format-Table Name,Value -Wrap', icon: '🔧', description: 'Wszystkie zmienne env' },
      { label: 'Uptime', cmd: '(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | ForEach-Object { "$($_.Days)d $($_.Hours)h $($_.Minutes)m" }', icon: '⏱', description: 'Czas działania systemu' },
      { label: 'Temp folder', cmd: 'Get-ChildItem $env:TEMP | Measure-Object -Property Length -Sum | ForEach-Object { "Plików: $($_.Count), Rozmiar: $([math]::Round($_.Sum/1MB,1)) MB" }', icon: '🗑', description: 'Rozmiar folderu temp' },
    ],
  },
  {
    name: 'Sieć',
    icon: '🌐',
    commands: [
      { label: 'Adres IP', cmd: 'Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" } | Select-Object InterfaceAlias,IPAddress | Format-Table -AutoSize', icon: '📡', description: 'Adresy IP interfejsów' },
      { label: 'Ping Google', cmd: 'Test-Connection google.com -Count 3 | Format-Table Address,Latency -AutoSize', icon: '🏓', description: 'Sprawdź łączność' },
      { label: 'DNS Resolve', cmd: 'Resolve-DnsName google.com | Format-Table Name,Type,IPAddress -AutoSize', icon: '🔍', description: 'Rozwiąż DNS' },
      { label: 'Otwarte porty', cmd: 'Get-NetTCPConnection -State Listen | Select-Object -First 15 LocalPort,OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize', icon: '🚪', description: 'Nasłuchujące porty TCP' },
      { label: 'Połączenia aktywne', cmd: 'Get-NetTCPConnection -State Established | Select-Object -First 15 LocalPort,RemoteAddress,RemotePort | Format-Table -AutoSize', icon: '🔗', description: 'Aktywne połączenia TCP' },
      { label: 'Publiczne IP', cmd: '(Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip', icon: '🌍', description: 'Twoje publiczne IP' },
      { label: 'WiFi profil', cmd: 'netsh wlan show interfaces | Select-String "SSID|Signal|Radio|Band"', icon: '📶', description: 'Info o połączeniu WiFi' },
    ],
  },
  {
    name: 'Git',
    icon: '🔀',
    commands: [
      { label: 'Status', cmd: 'git status --short', icon: '📋', description: 'Stan repozytorium' },
      { label: 'Log (10)', cmd: 'git log --oneline -10 --graph --decorate', icon: '📜', description: 'Ostatnie 10 commitów' },
      { label: 'Branch', cmd: 'git branch -a', icon: '🌿', description: 'Lista gałęzi' },
      { label: 'Diff', cmd: 'git diff --stat', icon: '📊', description: 'Statystyki zmian' },
      { label: 'Stash list', cmd: 'git stash list', icon: '📦', description: 'Lista schowków' },
      { label: 'Remote', cmd: 'git remote -v', icon: '☁', description: 'Zdalne repozytoria' },
      { label: 'Contributors', cmd: 'git shortlog -sn --all | Select-Object -First 10', icon: '👥', description: 'Top autorzy commitów' },
    ],
  },
  {
    name: 'Podman / Docker',
    icon: '🐳',
    commands: [
      { label: 'Kontenery', cmd: 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', icon: '📦', description: 'Działające kontenery' },
      { label: 'Wszystkie kontenery', cmd: 'docker ps -a --format "table {{.Names}}\\t{{.Status}}\\t{{.Image}}"', icon: '📋', description: 'Wszystkie kontenery' },
      { label: 'Obrazy', cmd: 'docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}"', icon: '💿', description: 'Lokalne obrazy' },
      { label: 'Wolumeny', cmd: 'docker volume ls', icon: '💾', description: 'Lista wolumenów' },
      { label: 'Sieci', cmd: 'docker network ls', icon: '🌐', description: 'Sieci Docker' },
      { label: 'Zużycie zasobów', cmd: 'docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"', icon: '📊', description: 'CPU/RAM kontenerów' },
    ],
  },
  {
    name: 'NPM / Node',
    icon: '📦',
    commands: [
      { label: 'Wersje', cmd: 'Write-Output "Node: $(node -v)"; Write-Output "NPM: $(npm -v)"', icon: '📌', description: 'Wersje Node i NPM' },
      { label: 'Zależności', cmd: 'npm ls --depth=0 2>$null', icon: '🌳', description: 'Drzewo zależności' },
      { label: 'Outdated', cmd: 'npm outdated 2>$null', icon: '⚡', description: 'Przestarzałe pakiety' },
      { label: 'Audyt', cmd: 'npm audit --omit=dev 2>$null | Select-String "found|severity"', icon: '🔒', description: 'Audyt bezpieczeństwa' },
      { label: 'Scripts', cmd: 'npm run 2>$null | Select-Object -Skip 1', icon: '📜', description: 'Dostępne skrypty NPM' },
      { label: 'Cache clean', cmd: 'npm cache verify', icon: '🧹', description: 'Weryfikuj cache NPM' },
      { label: 'Globalne', cmd: 'npm ls -g --depth=0 2>$null', icon: '🌐', description: 'Globalne pakiety' },
    ],
  },
  {
    name: 'ZENO Browser',
    icon: '⚡',
    commands: [
      { label: 'Build dev', cmd: 'npm run dev', icon: '🔧', description: 'Uruchom serwer deweloperski' },
      { label: 'Build prod', cmd: 'npm run build', icon: '📦', description: 'Zbuduj wersję produkcyjną' },
      { label: 'TS Check', cmd: 'npx tsc --noEmit', icon: '✅', description: 'Sprawdź typy TypeScript' },
      { label: 'Lint', cmd: 'npx eslint src/ --ext .ts,.tsx 2>$null', icon: '🔍', description: 'Uruchom ESLint' },
      { label: 'MCP Status', cmd: 'curl -s http://127.0.0.1:3847/sse 2>$null | Select-Object -First 3', icon: '🤖', description: 'Status serwera MCP' },
      { label: 'SearXNG Status', cmd: 'try { $r = Invoke-RestMethod "http://localhost:8888/healthz" -TimeoutSec 3; "SearXNG: OK" } catch { "SearXNG: Offline" }', icon: '🔎', description: 'Status wyszukiwarki' },
      { label: 'Rozmiar projektu', cmd: 'Get-ChildItem -Recurse -File src/,src-electron/ | Measure-Object -Property Length -Sum | ForEach-Object { "Plików: $($_.Count), Rozmiar: $([math]::Round($_.Sum/1KB,1)) KB" }', icon: '📏', description: 'Rozmiar kodu źródłowego' },
    ],
  },
  {
    name: 'Pliki',
    icon: '📁',
    commands: [
      { label: 'Bieżący katalog', cmd: 'Get-Location | ForEach-Object { $_.Path }', icon: '📍', description: 'Pokaż CWD' },
      { label: 'Lista plików', cmd: 'Get-ChildItem | Format-Table Mode,Length,Name -AutoSize', icon: '📄', description: 'Pliki w bieżącym katalogu' },
      { label: 'Drzewo (2 poziomy)', cmd: 'Get-ChildItem -Recurse -Depth 2 -Directory | ForEach-Object { $indent = "  " * ($_.FullName.Split([IO.Path]::DirectorySeparatorChar).Count - (Get-Location).Path.Split([IO.Path]::DirectorySeparatorChar).Count); "$indent📁 $($_.Name)" }', icon: '🌳', description: 'Drzewo katalogów' },
      { label: 'Największe pliki', cmd: 'Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 10 @{N="Size(MB)";E={[math]::Round($_.Length/1MB,2)}},FullName | Format-Table -AutoSize', icon: '🐘', description: 'Top 10 największych plików' },
      { label: 'Szukaj pliku...', cmd: 'Get-ChildItem -Recurse -File -Filter "*.ts" -ErrorAction SilentlyContinue | Select-Object -First 20 FullName', icon: '🔎', description: 'Szukaj plików .ts' },
    ],
  },
  {
    name: 'AI Tools',
    icon: '🤖',
    commands: [
      { label: 'AI Providers', cmd: 'providers', icon: '🔌', description: 'Lista dostawców AI' },
      { label: 'AI Metryki', cmd: 'metrics', icon: '📊', description: 'Metryki AI Gateway' },
      { label: 'MCP Narzędzia', cmd: 'mcp-tools', icon: '🛠', description: 'Lista narzędzi MCP' },
      { label: 'Otwarte karty', cmd: 'tabs', icon: '📑', description: 'Pokaż otwarte karty' },
      { label: 'Statystyki sieci', cmd: 'network', icon: '📡', description: 'Statystyki sieciowe przeglądarki' },
    ],
  },
];

// Sanitize user input to prevent injection
function sanitizeShellInput(cmd: string): string {
  const blocked = [
    /rm\s+(-rf?|--recursive)\s+[/\\]/i,
    /format\s+[a-z]:/i,
    /del\s+\/[sfq]/i,
    /:(fork|bomb)/i,
    /%0[aAdD]/,
  ];
  for (const pattern of blocked) {
    if (pattern.test(cmd)) {
      throw new Error('Polecenie zablokowane ze względów bezpieczeństwa');
    }
  }
  return cmd;
}

// ── Quick Command Palette ──────────────────────────────────────

function CommandPalette({ onRun }: { onRun: (cmd: string) => void }) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => { filterRef.current?.focus(); }, []);

  const filtered = COMMAND_CATEGORIES.map(cat => ({
    ...cat,
    commands: cat.commands.filter(c =>
      !filter || c.label.toLowerCase().includes(filter.toLowerCase()) ||
      c.description.toLowerCase().includes(filter.toLowerCase()) ||
      c.cmd.toLowerCase().includes(filter.toLowerCase())
    ),
  })).filter(cat => cat.commands.length > 0);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
      <input
        ref={filterRef}
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="🔍 Filtruj komendy..."
        style={cmdFilterStyle}
        spellCheck={false}
      />
      {filtered.map(cat => (
        <div key={cat.name} style={{ marginBottom: '6px' }}>
          <button
            onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}
            style={catHeaderStyle}
          >
            <span>{cat.icon} {cat.name}</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              {cat.commands.length} {expanded === cat.name ? '▾' : '▸'}
            </span>
          </button>
          {(expanded === cat.name || filter) && cat.commands.map(c => (
            <button
              key={c.label}
              onClick={() => onRun(c.cmd)}
              style={cmdItemStyle}
              title={c.cmd}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{c.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{c.description}</div>
                </div>
              </div>
              <span style={{ fontSize: '16px', color: '#475569', flexShrink: 0 }}>▶</span>
            </button>
          ))}
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#475569', padding: '24px', fontSize: '13px' }}>
          Brak komend pasujących do "{filter}"
        </div>
      )}
    </div>
  );
}

// ── Main Terminal Panel ────────────────────────────────────────

export function TerminalPanel({ onClose, onNavigate }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<TerminalTab>('shell');
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '🖥 Terminal ZENO Browser v2.0\nWpisz "help" aby zobaczyć komendy. Użyj zakładki 📋 Komendy dla szybkich akcji.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState('~');
  const [isWide, setIsWide] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  // Load initial cwd
  useEffect(() => {
    void (async () => {
      try {
        const result = await api()?.terminal?.getCwd?.();
        if (result) setCwd(result);
      } catch { /* ignore */ }
    })();
  }, []);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines(prev => [
      ...prev,
      {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // ── Built-in commands ──────────────────────────────────────

  const handleBuiltinCommand = useCallback(
    (cmd: string): boolean => {
      const lower = cmd.toLowerCase().trim();

      if (lower === 'help') {
        addLine('info', [
          '📋 Komendy wbudowane:',
          '  help              — ta pomoc',
          '  clear / cls       — wyczyść terminal',
          '  exit              — zamknij terminal',
          '  cd <ścieżka>     — zmień katalog roboczy',
          '  pwd               — pokaż bieżący katalog',
          '  providers         — dostawcy AI',
          '  metrics           — metryki AI Gateway',
          '  mcp-tools         — lista narzędzi MCP',
          '  tabs              — otwarte karty',
          '  network           — statystyki sieci',
          '  navigate <url>    — nawiguj kartę',
          '  sysinfo           — informacje systemowe',
          '  env [nazwa]       — zmienne środowiskowe',
          '  kill <pid>        — zakończ proces',
          '  alias             — pokaż aliasy',
          '  history           — historia komend',
          '',
          '💡 Przełącz na zakładkę 📋 Komendy by zobaczyć gotowe akcje',
        ].join('\n'));
        return true;
      }

      if (lower === 'clear' || lower === 'cls') { setLines([]); return true; }
      if (lower === 'exit') { onClose(); return true; }

      if (lower === 'pwd') {
        addLine('output', cwd);
        return true;
      }

      if (lower.startsWith('cd ')) {
        const dir = cmd.slice(3).trim();
        void (async () => {
          try {
            const result = await api()?.terminal?.setCwd?.(dir);
            if (result?.success) {
              setCwd(result.cwd);
              addLine('info', `📁 ${result.cwd}`);
            } else {
              addLine('error', result?.error ?? 'Nie można zmienić katalogu');
            }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'history') {
        if (history.length === 0) { addLine('info', 'Historia pusta'); return true; }
        addLine('output', history.map((h, i) => `  ${i + 1}. ${h}`).join('\n'));
        return true;
      }

      if (lower === 'alias') {
        addLine('info', [
          '🏷 Aliasy:',
          '  providers → AI providers list',
          '  metrics   → AI Gateway metrics',
          '  tabs      → lista kart',
          '  network   → statystyki sieci',
          '  sysinfo   → info systemowe',
          '  mcp-tools → narzędzia MCP',
        ].join('\n'));
        return true;
      }

      if (lower === 'sysinfo') {
        void (async () => {
          try {
            const result = await api()?.terminal?.getSystemInfo?.();
            if (result) {
              addLine('output', [
                '💻 System Info:',
                `  Platform: ${result.platform}`,
                `  Arch: ${result.arch}`,
                `  Node: ${result.nodeVersion}`,
                `  Electron: ${result.electronVersion}`,
                `  Chrome: ${result.chromeVersion}`,
                `  Uptime: ${Math.floor(result.uptime / 3600)}h ${Math.floor((result.uptime % 3600) / 60)}m`,
                `  RAM: ${result.freeMemory} MB wolne / ${result.totalMemory} MB`,
                `  CPUs: ${result.cpuCount}`,
                `  Home: ${result.homeDir}`,
              ].join('\n'));
            } else {
              addLine('error', 'Nie można pobrać informacji systemowych');
            }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'env' || lower.startsWith('env ')) {
        const name = cmd.slice(3).trim();
        void (async () => {
          try {
            const result = await api()?.terminal?.getEnv?.(name || undefined);
            if (result) {
              if (typeof result === 'string') {
                addLine('output', result);
              } else {
                const entries = Object.entries(result as Record<string, string>);
                const text = entries.slice(0, 40).map(([k, v]) =>
                  `  ${k}=${String(v).slice(0, 100)}`
                ).join('\n');
                addLine('output', `🔧 Zmienne środowiskowe (${entries.length}):\n${text}`);
                if (entries.length > 40) addLine('info', `... i ${entries.length - 40} więcej`);
              }
            }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower.startsWith('kill ')) {
        const pidStr = cmd.slice(5).trim();
        const pid = parseInt(pidStr, 10);
        if (isNaN(pid)) { addLine('error', 'Podaj prawidłowy PID'); return true; }
        void (async () => {
          try {
            const result = await api()?.terminal?.killProcess?.(pid);
            if (result?.success) {
              addLine('info', `✅ Proces ${pid} zakończony`);
            } else {
              addLine('error', result?.error ?? `Nie można zakończyć procesu ${pid}`);
            }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'mcp-tools') {
        void (async () => {
          try {
            const tools = await api()?.mcp?.listTools?.();
            if (Array.isArray(tools) && tools.length > 0) {
              addLine('output', `🛠 Narzędzia MCP (${tools.length}):\n${tools.map((t: string) => `  • ${t}`).join('\n')}`);
            } else {
              addLine('output', '🛠 Brak dostępnych narzędzi MCP');
            }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'providers') {
        void (async () => {
          try {
            const result = await api()?.ai?.getProviders?.();
            if (Array.isArray(result) && result.length > 0) {
              const text = result.map((p: any) =>
                `  ${p.enabled ? '●' : '○'} ${p.displayName ?? p.name} (priorytet: ${p.priority})`
              ).join('\n');
              addLine('output', `🔌 Dostawcy AI:\n${text}`);
            } else {
              addLine('output', '🔌 Brak dostępnych dostawców AI');
            }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'metrics') {
        void (async () => {
          try {
            const result = await api()?.ai?.getMetrics?.();
            if (result) {
              addLine('output', [
                '📊 Metryki AI Gateway:',
                `  Zapytania: ${result.totalRequests ?? 0}`,
                `  Avg latency: ${(result.avgLatency ?? 0).toFixed(0)}ms`,
                `  Koszt: $${(result.totalCost ?? 0).toFixed(4)}`,
                `  Cache: ${result.cacheSize ?? 0} wpisów`,
              ].join('\n'));
            } else { addLine('output', '📊 Brak danych metryk'); }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'tabs') {
        void (async () => {
          try {
            const result = await api()?.browser?.getTabs?.();
            if (Array.isArray(result) && result.length > 0) {
              const text = result.map((t: any, i: number) =>
                `  ${i + 1}. ${t.title ?? 'Bez tytułu'} — ${t.url}`
              ).join('\n');
              addLine('output', `📑 Otwarte karty:\n${text}`);
            } else { addLine('output', '📑 Brak otwartych kart'); }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower === 'network') {
        void (async () => {
          try {
            const result = await api()?.network?.getStats?.();
            if (result) {
              addLine('output', [
                '📡 Statystyki sieciowe:',
                `  Zapytania: ${result.total ?? 0}`,
                `  Domeny: ${JSON.stringify(result.byDomain ?? {})}`,
                `  Metody: ${JSON.stringify(result.byMethod ?? {})}`,
              ].join('\n'));
            } else { addLine('output', '📡 Brak danych sieciowych'); }
          } catch (e: any) { addLine('error', e.message); }
        })();
        return true;
      }

      if (lower.startsWith('navigate ')) {
        const url = cmd.slice(9).trim();
        if (url) {
          addLine('info', `🌐 Nawigacja do: ${url}`);
          onNavigate?.(url);
        }
        return true;
      }

      return false;
    },
    [addLine, onClose, onNavigate, cwd, history]
  );

  // ── Shell execution ────────────────────────────────────────

  const executeShellCommand = useCallback(
    async (cmd: string) => {
      try {
        const safe = sanitizeShellInput(cmd);
        const result = await api()?.terminal?.execute?.(safe, cwd === '~' ? undefined : cwd);
        if (result?.success) {
          if (result.stdout?.trim()) addLine('output', result.stdout.trim());
          if (result.stderr?.trim()) addLine('error', result.stderr.trim());
          if (!result.stdout?.trim() && !result.stderr?.trim()) addLine('info', '(wykonane bez wyjścia)');
          // Update cwd if the command might have changed it
          if (result.cwd) setCwd(result.cwd);
        } else {
          addLine('error', result?.error ?? 'Nie można wykonać polecenia');
        }
      } catch (e: any) {
        addLine('error', `Błąd: ${e.message}`);
      }
    },
    [addLine, cwd]
  );

  // ── JS execution ───────────────────────────────────────────

  const executeJS = useCallback(
    (code: string) => {
      try {
        const fn = new Function('api', 'console', `
          const log = (...args) => console.log(...args);
          return (async () => { ${code} })();
        `);
        const logs: string[] = [];
        const fakeConsole = {
          log: (...args: any[]) => logs.push(args.map(String).join(' ')),
          error: (...args: any[]) => logs.push('ERROR: ' + args.map(String).join(' ')),
          warn: (...args: any[]) => logs.push('WARN: ' + args.map(String).join(' ')),
          info: (...args: any[]) => logs.push('INFO: ' + args.map(String).join(' ')),
        };
        const resultPromise = fn(api(), fakeConsole);
        if (resultPromise?.then) {
          resultPromise
            .then((result: any) => {
              if (logs.length > 0) addLine('output', logs.join('\n'));
              if (result !== undefined) addLine('output', `→ ${JSON.stringify(result, null, 2)}`);
            })
            .catch((err: any) => {
              if (logs.length > 0) addLine('output', logs.join('\n'));
              addLine('error', `❌ ${err.message ?? err}`);
            });
        } else {
          if (logs.length > 0) addLine('output', logs.join('\n'));
        }
      } catch (e: any) {
        addLine('error', `❌ Błąd JS: ${e.message}`);
      }
    },
    [addLine]
  );

  // ── Submit handler ─────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;

    setHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)];
      return next.slice(0, 100);
    });
    setHistoryIndex(-1);

    const prefix = activeTab === 'js' ? '> ' : '$ ';
    addLine('input', `${prefix}${trimmed}`);
    setInput('');

    if (handleBuiltinCommand(trimmed)) return;

    setIsRunning(true);
    try {
      if (activeTab === 'js') {
        executeJS(trimmed);
      } else {
        await executeShellCommand(trimmed);
      }
    } finally {
      setIsRunning(false);
    }
  }, [input, activeTab, isRunning, addLine, handleBuiltinCommand, executeShellCommand, executeJS]);

  // Run a command from the palette
  const handlePaletteRun = useCallback((cmd: string) => {
    // If it's a built-in alias, handle directly
    const lower = cmd.toLowerCase().trim();
    const builtins = ['providers', 'metrics', 'tabs', 'network', 'mcp-tools', 'sysinfo'];
    if (builtins.includes(lower)) {
      addLine('input', `$ ${cmd}`);
      handleBuiltinCommand(cmd);
      setActiveTab('shell');
      return;
    }
    // Otherwise run as shell command
    addLine('input', `$ ${cmd}`);
    setActiveTab('shell');
    setIsRunning(true);
    executeShellCommand(cmd).finally(() => setIsRunning(false));
  }, [addLine, handleBuiltinCommand, executeShellCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length > 0) {
          const next = Math.min(historyIndex + 1, history.length - 1);
          setHistoryIndex(next);
          setInput(history[next]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) { const n = historyIndex - 1; setHistoryIndex(n); setInput(history[n]); }
        else { setHistoryIndex(-1); setInput(''); }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault(); setLines([]);
      }
    },
    [handleSubmit, history, historyIndex]
  );

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return '#93c5fd';
      case 'output': return '#d1d5db';
      case 'error': return '#fca5a5';
      case 'info': return '#86efac';
      case 'system': return '#a78bfa';
      default: return '#e2e8f0';
    }
  };

  const panelWidth = isWide ? '720px' : '520px';

  return (
    <div style={{ ...panelStyle, width: panelWidth }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>⌨ Terminal</span>
          <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cwd}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => setIsWide(v => !v)} style={hdrBtnStyle} title={isWide ? 'Zwęź' : 'Rozszerz'}>
            {isWide ? '◁' : '▷'}
          </button>
          <button onClick={() => setLines([])} style={hdrBtnStyle} title="Wyczyść">🗑</button>
          <button onClick={onClose} style={hdrBtnStyle}>✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabBarStyle}>
        {([
          ['shell', '🐚 Shell'],
          ['js', '⚡ JavaScript'],
          ['commands', '📋 Komendy'],
        ] as [TerminalTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...tabBtnStyle,
              borderBottom: activeTab === key ? '2px solid #60a5fa' : '2px solid transparent',
              color: activeTab === key ? '#60a5fa' : '#64748b',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Commands palette tab */}
      {activeTab === 'commands' ? (
        <CommandPalette onRun={handlePaletteRun} />
      ) : (
        <>
          {/* Output area */}
          <div ref={scrollRef} style={outputStyle}>
            {lines.map(line => (
              <div
                key={line.id}
                style={{
                  color: lineColor(line.type),
                  fontSize: '12px',
                  fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                  padding: '1px 0',
                }}
              >
                {line.content}
              </div>
            ))}
            {isRunning && (
              <div style={{ color: '#fbbf24', fontSize: '12px', fontFamily: 'monospace' }}>
                ⏳ Wykonywanie...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={inputContainerStyle}>
            <span style={{ color: activeTab === 'js' ? '#a78bfa' : '#60a5fa', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}>
              {activeTab === 'js' ? '>' : '$'}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeTab === 'js' ? 'Wpisz kod JavaScript...' : 'Wpisz polecenie...'}
              disabled={isRunning}
              style={termInputStyle}
              spellCheck={false}
              autoFocus
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  background: '#0a0e1a',
  borderLeft: '1px solid #1e293b',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
  color: '#ccd6f6',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  transition: 'width 0.2s ease',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: '1px solid #1e293b',
  background: '#0f1629',
};

const hdrBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 6px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0',
  borderBottom: '1px solid #1e293b',
  background: '#0d1220',
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  padding: '8px 4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  transition: 'color 0.2s',
};

const outputStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '8px 12px',
  background: '#0a0e1a',
};

const inputContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderTop: '1px solid #1e293b',
  background: '#0f1629',
};

const termInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  color: '#e2e8f0',
  fontSize: '13px',
  fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  outline: 'none',
};

const cmdFilterStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1f2e',
  border: '1px solid #2d3548',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: '13px',
  outline: 'none',
  marginBottom: '8px',
  boxSizing: 'border-box' as const,
};

const catHeaderStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#111827',
  border: '1px solid #1e293b',
  borderRadius: '6px',
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '2px',
};

const cmdItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#0d1220',
  border: '1px solid transparent',
  borderRadius: '4px',
  padding: '6px 12px 6px 24px',
  cursor: 'pointer',
  color: '#e2e8f0',
  textAlign: 'left' as const,
  marginBottom: '1px',
  transition: 'background 0.15s',
};
