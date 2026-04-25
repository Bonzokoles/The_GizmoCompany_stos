import type { PolaczekAgent } from '../agentHubTypes';

interface AgentPolaczekTabProps {
  polaczekList: PolaczekAgent[];
  polaczekTask: string;
  polaczekActive: string | null;
  polaczekBusy: boolean;
  polaczekOutput: string;
  polaczekImage: string | null;
  polaczekImageName: string;
  polaczekProvider: 'ollama' | 'openrouter' | 'openai' | 'anthropic';
  polaczekApiKey: string;
  polaczekModelOverride: string;
  onRunPolaczek: () => void;
  onSetPolaczekTask: (v: string) => void;
  onSetPolaczekActive: (id: string | null) => void;
  onSetPolaczekImage: (b64: string | null) => void;
  onSetPolaczekImageName: (name: string) => void;
  onSetPolaczekProvider: (p: 'ollama' | 'openrouter' | 'openai' | 'anthropic') => void;
  onSetPolaczekApiKey: (v: string) => void;
  onSetPolaczekModelOverride: (v: string) => void;
  onSetPolaczekOutput: (v: string) => void;
  onSetPolaczekBusy: (v: boolean) => void;
  onOpenPiTerminal: () => void;
}

export function AgentPolaczekTab({
  polaczekList, polaczekTask, polaczekActive, polaczekBusy, polaczekOutput,
  polaczekImage, polaczekImageName,
  polaczekProvider, polaczekApiKey, polaczekModelOverride,
  onRunPolaczek,
  onSetPolaczekTask, onSetPolaczekActive,
  onSetPolaczekImage, onSetPolaczekImageName,
  onSetPolaczekProvider, onSetPolaczekApiKey, onSetPolaczekModelOverride,
  onSetPolaczekOutput, onSetPolaczekBusy,
  onOpenPiTerminal,
}: AgentPolaczekTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', overflowY: 'auto', flex: 1 }}>
      <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600 }}>POLACZEK AGENTS — lokalne pomocniki Ollama</div>

      {/* Agent picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {polaczekList.map(a => (
          <button
            key={a.id}
            onClick={() => onSetPolaczekActive(polaczekActive === a.id ? null : a.id)}
            style={{
              padding: '4px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
              background: polaczekActive === a.id ? '#1f6feb' : '#21262d',
              border: `1px solid ${polaczekActive === a.id ? '#388bfd' : '#30363d'}`,
              color: a.status === 'planned' ? '#6b7280' : '#e6edf3',
              opacity: a.status === 'planned' ? 0.6 : 1,
            }}
            title={`${a.description}\nModel: ${a.model}`}
          >
            {a.icon ?? a.id.split('_').pop()} {a.id.replace(/Polaczek_\d+_/, '')}
            {a.status === 'planned' && ' (wkrótce)'}
          </button>
        ))}
        {polaczekList.length === 0 && (
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            Brak agentów — sprawdź czy HUB działa (port 4224)
          </div>
        )}
      </div>

      {/* Active agent info */}
      {polaczekActive && (() => {
        const a = polaczekList.find(x => x.id === polaczekActive);
        return a ? (
          <div style={{ background: '#0d1117', border: '1px solid #1f6feb', borderRadius: '6px', padding: '8px', fontSize: '11px' }}>
            <div style={{ color: '#58a6ff', fontWeight: 600, marginBottom: '4px' }}>{a.icon ?? ''} {a.id}</div>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>{a.description}</div>
            <div style={{ color: '#4ade80' }}>Model: {a.model}</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
              {a.tags.map(t => <span key={t} style={{ background: '#21262d', padding: '1px 6px', borderRadius: '3px', color: '#8b949e', fontSize: '10px' }}>{t}</span>)}
            </div>
          </div>
        ) : null;
      })()}

      {/* Upload obrazu — tylko dla Skanera (accepts_image) */}
      {polaczekList.find(a => a.id === polaczekActive)?.accepts_image && (
        <div style={{ background: '#0d1117', border: '1px dashed #388bfd', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '10px', color: '#58a6ff', marginBottom: '6px', fontWeight: 600 }}>[S] GLM-OCR — wgraj obraz do skanowania</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <label style={{ padding: '4px 10px', fontSize: '11px', background: '#21262d', border: '1px solid #388bfd', borderRadius: '4px', color: '#58a6ff', cursor: 'pointer' }}>
              [+] Wybierz plik
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  onSetPolaczekImageName(f.name);
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const b64 = (ev.target?.result as string).split(',')[1];
                    onSetPolaczekImage(b64);
                  };
                  reader.readAsDataURL(f);
                }}
              />
            </label>
            {polaczekImageName && (
              <>
                <span style={{ fontSize: '10px', color: '#4ade80' }}>OK {polaczekImageName}</span>
                <button onClick={() => { onSetPolaczekImage(null); onSetPolaczekImageName(''); }}
                  style={{ padding: '2px 6px', fontSize: '10px', background: 'transparent', border: '1px solid #6b7280', borderRadius: '3px', color: '#6b7280', cursor: 'pointer' }}>
                  ✕
                </button>
              </>
            )}
            {!polaczekImageName && <span style={{ fontSize: '10px', color: '#6b7280' }}>PNG, JPG, WebP — dokument, faktura, zrzut ekranu</span>}
          </div>
        </div>
      )}

      {/* Backend — provider + API key */}
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '10px', color: '#8b949e', fontWeight: 600, marginBottom: '2px' }}>BACKEND</div>

        {/* Provider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#8b949e', width: '60px', flexShrink: 0 }}>Provider:</label>
          <select
            value={polaczekProvider}
            onChange={e => onSetPolaczekProvider(e.target.value as typeof polaczekProvider)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '3px 6px' }}
          >
            <option value="ollama">Ollama  (lokalny — bez klucza)</option>
            <option value="openrouter">OpenRouter  (API key)</option>
            <option value="openai">OpenAI  (API key)</option>
            <option value="anthropic">Anthropic  (API key)</option>
          </select>
        </div>

        {/* API key — tylko dla chmury */}
        {polaczekProvider !== 'ollama' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', color: '#8b949e', width: '60px', flexShrink: 0 }}>API Key:</label>
            <input
              type="password"
              value={polaczekApiKey}
              onChange={e => onSetPolaczekApiKey(e.target.value)}
              placeholder={
                polaczekProvider === 'openrouter' ? 'sk-or-...' :
                polaczekProvider === 'anthropic'  ? 'sk-ant-...' :
                'sk-...'
              }
              style={{
                flex: 1, background: '#0d1117',
                border: `1px solid ${polaczekApiKey ? '#4ade80' : '#f59e0b'}`,
                borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '3px 6px',
              }}
            />
            {!polaczekApiKey && <span style={{ fontSize: '10px', color: '#f59e0b', flexShrink: 0 }}>wymagany</span>}
          </div>
        )}

        {/* Model override — opcjonalne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#8b949e', width: '60px', flexShrink: 0 }}>Model:</label>
          <input
            type="text"
            value={polaczekModelOverride}
            onChange={e => onSetPolaczekModelOverride(e.target.value)}
            placeholder={
              polaczekProvider === 'ollama'      ? 'domyślny z registry' :
              polaczekProvider === 'openrouter'  ? 'anthropic/claude-3-5-haiku' :
              polaczekProvider === 'openai'      ? 'gpt-4o-mini' :
              'claude-3-5-haiku-20241022'
            }
            style={{
              flex: 1, background: '#0d1117', border: '1px solid #30363d',
              borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '3px 6px',
            }}
          />
        </div>

        {polaczekProvider === 'ollama' && (
          <div style={{ fontSize: '10px', color: '#484f58' }}>
            Lokalne Ollama — model z registry ({polaczekList.find(a => a.id === polaczekActive)?.model ?? '—'})
          </div>
        )}
      </div>

      {/* Task input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <textarea
          value={polaczekTask}
          onChange={e => onSetPolaczekTask(e.target.value)}
          placeholder={polaczekActive ? `Zadanie dla ${polaczekActive}... (np. T-001 lub własna instrukcja)` : 'Wybierz agenta powyżej'}
          disabled={!polaczekActive || polaczekBusy}
          rows={3}
          style={{
            width: '100%', background: '#0d1117', border: '1px solid #30363d',
            borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '6px',
            resize: 'vertical', fontFamily: 'inherit',
          }}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) onRunPolaczek(); }}
        />
        <button
          onClick={onRunPolaczek}
          disabled={!polaczekActive || !polaczekTask.trim() || polaczekBusy}
          style={{
            padding: '6px 12px', fontSize: '11px', borderRadius: '4px',
            background: polaczekBusy ? '#21262d' : '#1f6feb',
            border: '1px solid #388bfd', color: '#fff', cursor: polaczekBusy ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-end',
          }}
        >
          {polaczekBusy ? '... Pracuje' : '▶ Uruchom (Ctrl+Enter)'}
        </button>
      </div>

      {/* Output */}
      {polaczekOutput && (
        <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#e6edf3', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ color: '#4ade80', marginBottom: '6px', fontSize: '10px' }}>OUTPUT</div>
          {polaczekOutput}
        </div>
      )}

      {/* Pipeline — uruchom wszystkich po kolei */}
      <div style={{ borderTop: '1px solid #21262d', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '10px', color: '#8b949e', fontWeight: 600 }}>PIPELINE (wszystkie po kolei)</div>
        <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
          [B] Bibliotekarz → [S] Skaner → [P] Porzadkowy → [A] Analityk
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={async () => {
              onSetPolaczekOutput('');
              onSetPolaczekBusy(true);
              try {
                await fetch('http://localhost:4225/run/all', { method: 'POST' });
                onSetPolaczekOutput('Pipeline uruchomiony — sprawdź http://localhost:4225/reports/latest po zakończeniu');
              } catch { onSetPolaczekOutput('Watchdog nie dziala (port 4225)'); }
              finally { onSetPolaczekBusy(false); }
            }}
            disabled={polaczekBusy}
            style={{ padding: '5px 12px', fontSize: '11px', background: polaczekBusy ? '#21262d' : '#1f6feb', border: '1px solid #388bfd', borderRadius: '4px', color: '#fff', cursor: polaczekBusy ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            {polaczekBusy ? 'Trwa...' : 'URUCHOM WSZYSTKICH'}
          </button>
          <button
            onClick={async () => {
              try {
                const r = await fetch('http://localhost:4225/reports/latest');
                const d = await r.json();
                onSetPolaczekOutput(JSON.stringify(d, null, 2));
              } catch { onSetPolaczekOutput('Brak raportów lub watchdog wyłączony'); }
            }}
            style={{ padding: '5px 8px', fontSize: '10px', background: '#21262d', border: '1px solid #30363d', borderRadius: '4px', color: '#8b949e', cursor: 'pointer' }}
          >
            ostatni raport
          </button>
        </div>
      </div>

      {/* Pi Terminal link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #21262d', paddingTop: '8px', fontSize: '10px', color: '#6b7280' }}>
        <span style={{ fontFamily: 'monospace', color: '#58a6ff', fontWeight: 600 }}>π</span>
        <button
          onClick={onOpenPiTerminal}
          style={{ padding: '3px 10px', fontSize: '10px', background: '#161b22', border: '1px solid #388bfd', borderRadius: '4px', color: '#58a6ff', cursor: 'pointer' }}
        >
          Pi Terminal
        </button>
        <span style={{ color: '#484f58' }}>qwen3.5:2b · Ollama / API key</span>
      </div>
    </div>
  );
}
