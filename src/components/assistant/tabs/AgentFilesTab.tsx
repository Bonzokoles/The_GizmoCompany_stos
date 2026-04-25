import type { FileReport, ScanResult, FileCatalogEntry } from '../agentHubTypes';

interface AgentFilesTabProps {
  filePath: string;
  fileQuery: string;
  fileSync: boolean;
  fileAutoReg: boolean;
  fileSaveRep: boolean;
  fileBusy: boolean;
  fileReport: FileReport | null;
  fileTaskId: string | null;
  scanDir: string;
  scanDepth: number;
  scanBusy: boolean;
  scanResult: ScanResult | null;
  fileCatalog: FileCatalogEntry[];
  onRunFileAnalyze: () => void;
  onRunFileScan: () => void;
  onLoadFileCatalog: () => void;
  onFilePathChange: (v: string) => void;
  onFileQueryChange: (v: string) => void;
  onFileSyncChange: (v: boolean) => void;
  onFileAutoRegChange: (v: boolean) => void;
  onFileSaveRepChange: (v: boolean) => void;
  onScanDirChange: (v: string) => void;
  onScanDepthChange: (v: number) => void;
  onSelectCatalogPath: (path: string) => void;
}

export function AgentFilesTab({
  filePath, fileQuery, fileSync, fileAutoReg, fileSaveRep,
  fileBusy, fileReport, fileTaskId,
  scanDir, scanDepth, scanBusy, scanResult,
  fileCatalog,
  onRunFileAnalyze, onRunFileScan, onLoadFileCatalog,
  onFilePathChange, onFileQueryChange, onFileSyncChange, onFileAutoRegChange, onFileSaveRepChange,
  onScanDirChange, onScanDepthChange, onSelectCatalogPath,
}: AgentFilesTabProps) {
  return (
    <div className="ah-skills-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px' }}>

      {/* Analyze section */}
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '10px' }}>
        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px', fontWeight: 600 }}>ANALYZE FILE / FOLDER</div>
        <input
          className="ah-task-input"
          placeholder="Ścieżka absolutna (np. U:\projekt\src)"
          value={filePath}
          onChange={e => onFilePathChange(e.target.value)}
          style={{ width: '100%', marginBottom: '6px', boxSizing: 'border-box' }}
        />
        <input
          className="ah-task-input"
          placeholder="Zapytanie (np. Przeanalizuj architekturę)"
          value={fileQuery}
          onChange={e => onFileQueryChange(e.target.value)}
          style={{ width: '100%', marginBottom: '6px', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '11px', color: '#8b949e' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input type="checkbox" checked={fileSync} onChange={e => onFileSyncChange(e.target.checked)} />
            Sync (czeka na raport)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input type="checkbox" checked={fileAutoReg} onChange={e => onFileAutoRegChange(e.target.checked)} />
            Auto-rejestruj w katalogu
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} title="Zapisuje do REPORTS/ tylko gdy raport ma wartościowe insights">
            <input type="checkbox" checked={fileSaveRep} onChange={e => onFileSaveRepChange(e.target.checked)} />
            Zapisz raport (REPORTS/)
          </label>
        </div>
        <button
          className="ah-send-btn"
          onClick={onRunFileAnalyze}
          disabled={fileBusy || !filePath.trim()}
          style={{ width: '100%' }}
        >
          {fileBusy ? '⟳ Analizuję...' : '🔍 Analizuj'}
        </button>
        {fileTaskId && !fileReport && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#4ade80' }}>
            Task uruchomiony: <code style={{ fontSize: '10px' }}>{fileTaskId.slice(0, 8)}…</code> — wynik pojawi się w zakładce TASKS
          </div>
        )}
        {fileReport && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#58a6ff', marginBottom: '6px' }}>
              📄 {fileReport.fileType.toUpperCase()} — Raport
            </div>
            <div style={{ fontSize: '11px', color: '#e6edf3', marginBottom: '8px', lineHeight: '1.5' }}>
              {fileReport.summary}
            </div>
            {fileReport.insights.length > 0 && (
              <ul style={{ margin: '0 0 8px', paddingLeft: '16px', fontSize: '11px', color: '#8b949e' }}>
                {fileReport.insights.map((ins, i) => <li key={i}>{ins}</li>)}
              </ul>
            )}
            {fileReport.actionItems.length > 0 && (
              <div style={{ fontSize: '11px', color: '#fbbf24' }}>
                <strong>Action items:</strong>
                <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                  {fileReport.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {fileReport.tags.map(t => (
                <span key={t} style={{ fontSize: '10px', background: '#1f2937', color: '#6b7280', padding: '1px 6px', borderRadius: '10px' }}>{t}</span>
              ))}
            </div>
            <details style={{ marginTop: '8px' }}>
              <summary style={{ fontSize: '10px', color: '#6b7280', cursor: 'pointer' }}>Raw Goose output</summary>
              <pre style={{ fontSize: '10px', color: '#8b949e', maxHeight: '150px', overflow: 'auto', margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {fileReport.rawOutput}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Scan section */}
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '10px' }}>
        <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px', fontWeight: 600 }}>SCAN DIRECTORY</div>
        <input
          className="ah-task-input"
          placeholder="Folder do skanowania"
          value={scanDir}
          onChange={e => onScanDirChange(e.target.value)}
          style={{ width: '100%', marginBottom: '6px', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', color: '#8b949e' }}>Głębokość:</label>
          <input
            type="number" min={1} max={5} value={scanDepth}
            onChange={e => onScanDepthChange(Number(e.target.value))}
            style={{ width: '50px', background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}
          />
        </div>
        <button
          className="ah-send-btn"
          onClick={onRunFileScan}
          disabled={scanBusy || !scanDir.trim()}
          style={{ width: '100%' }}
        >
          {scanBusy ? '⟳ Skanuję...' : '📁 Skanuj i kataloguj'}
        </button>
        {scanResult && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#8b949e' }}>
            <div style={{ color: '#4ade80', marginBottom: '6px' }}>
              ✓ Znaleziono {scanResult.scanned}, skatalogowano {scanResult.cataloged}
            </div>
            <div style={{ maxHeight: '160px', overflow: 'auto' }}>
              {scanResult.catalog.map((entry, i) => (
                <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #21262d', paddingBottom: '4px' }}>
                  <div style={{ color: entry.type === 'dir' ? '#58a6ff' : '#e6edf3', fontSize: '10px', wordBreak: 'break-all' }}>
                    {entry.type === 'dir' ? '📁' : '📄'} {entry.path.split(/[\\/]/).pop()}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '10px' }}>{entry.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Catalog section */}
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600 }}>KATALOG ({fileCatalog.length})</div>
          <button className="ah-act-btn" onClick={onLoadFileCatalog}>↺ odśwież</button>
        </div>
        <div style={{ maxHeight: '200px', overflow: 'auto' }}>
          {fileCatalog.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Brak wpisów — użyj Analyze lub Scan</div>
          ) : fileCatalog.map(entry => (
            <div key={entry.id} style={{ marginBottom: '6px', borderBottom: '1px solid #21262d', paddingBottom: '6px' }}>
              <div
                style={{ fontSize: '11px', color: '#58a6ff', cursor: 'pointer', wordBreak: 'break-all' }}
                onClick={() => onSelectCatalogPath(entry.path)}
                title="Kliknij żeby użyć tej ścieżki"
              >
                {entry.path.split(/[\\/]/).pop() ?? entry.path}
              </div>
              <div style={{ fontSize: '10px', color: '#8b949e' }}>{entry.description}</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                {entry.tags.slice(0, 4).map(t => (
                  <span key={t} style={{ fontSize: '9px', background: '#1f2937', color: '#6b7280', padding: '1px 4px', borderRadius: '8px' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
