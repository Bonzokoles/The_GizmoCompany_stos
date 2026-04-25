oReg} onChange={e => setFileAutoReg(e.target.checked)} />
                    Auto-rejestruj w katalogu
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} title="Zapisuje do REPORTS/ tylko gdy raport ma wartościowe insights">
                    <input type="checkbox" checked={fileSaveRep} onChange={e => setFileSaveRep(e.target.checked)} />
                    Zapisz raport (REPORTS/)
                  </label>
                </div>
                <button
                  className="ah-send-btn"
                  onClick={runFileAnalyze}
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
                  onChange={e => setScanDir(e.target.value)}
                  style={{ width: '100%', marginBottom: '6px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#8b949e' }}>Głębokość:</label>
                  <input
                    type="number" min={1} max={5} value={scanDepth}
                    onChange={e => setScanDepth(Number(e.target.value))}
                    style={{ width: '50px', background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}
                  />
                </div>
                <button
                  className="ah-send-btn"
                  onClick={runFileScan}
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
                  <button className="ah-act-btn" onClick={loadFileCatalog}>↺ odśwież</button>
                </div>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {fileCatalog.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Brak wpisów — użyj Analyze lub Scan</div>
                  ) : fileCatalog.map(entry => (
                    <div key={entry.id} style={{ marginBottom: '6px', borderBottom: '1px solid #21262d', paddingBottom: '6px' }}>
                      <div
                        style={{ fontSize: '11px', color: '#58a6ff', cursor: 'pointer', wordBreak: 'break-all' }}
                        onClick={() => { setFilePath(entry.path); setRightTab('files'); }}
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
          )}

          {/* ── Polaczek tab ── */}
          {rightTab === 'polaczek' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600 }}>POLACZEK AGENTS — lokalne pomocniki Ollama</div>

              {/* Agent picker */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {polaczekList.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setPolaczekActive(polaczekActive === a.id ? null : a.id)}
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
                          setPolaczekImageName(f.name);
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const b64 = (ev.target?.result as string).split(',')[1];
                            setPolaczekImage(b64);
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                    </label>
                    {polaczekImageName && (
                      <>
                        <span style={{ fontSize: '10px', color: '#4ade80' }}>OK {polaczekImageName}</span>
                        <button onClick={() => { setPolaczekImage(null); setPolaczekImageName(''); }}
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
                    onChange={e => setPolaczekProvider(e.target.value as typeof polaczekProvider)}
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
                      onChange={e => setPolaczekApiKey(e.target.value)}
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
                    onChange={e => setPolaczekModelOverride(e.target.value)}
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
                  onChange={e => setPolaczekTask(e.target.value)}
                  placeholder={polaczekActive ? `Zadanie dla ${polaczekActive}... (np. T-001 lub własna instrukcja)` : 'Wybierz agenta powyżej'}
                  disabled={!polaczekActive || polaczekBusy}
                  rows={3}
                  style={{
                    width: '100%', background: '#0d1117', border: '1px solid #30363d',
                    borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '6px',
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) runPolaczek(); }}
                />
                <button
                  onClick={runPolaczek}
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
                      setPolaczekOutput('');
                      setPolaczekBusy(true);
                      try {
                        await fetch('http://localhost:4225/run/all', { method: 'POST' });
                        setPolaczekOutput('Pipeline uruchomiony — sprawdź http://localhost:4225/reports/latest po zakończeniu');
                      } catch { setPolaczekOutput('Watchdog nie dziala (port 4225)'); }
                      finally { setPolaczekBusy(false); }
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
                        setPolaczekOutput(JSON.stringify(d, null, 2));
                      } catch { setPolaczekOutput('Brak raportów lub watchdog wyłączony'); }
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
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('zeno:open-panel', { detail: { panelId: 'pi-terminal' } }));
                  }}
                  style={{ padding: '3px 10px', fontSize: '10px', background: '#161b22', border: '1px solid #388bfd', borderRadius: '4px', color: '#58a6ff', cursor: 'pointer' }}
                >
                  Pi Terminal
                </button>
                <span style={{ color: '#484f58' }}>qwen3.5:2b · Ollama / API key</span>
              </div>
            </div>
          )}

          {/* ── Tasks tab ── */}
          <div className="ah-task-output" ref={taskBottomRef}
            style={{ display: rightTab === 'tasks' ? undefined : 'none' }}>
            {tasks.length === 0 && (
              <p className="ah-empty">Wpisz instrukcję — Goose wykona ją i pokaże output tutaj<br />
                <span className="ah-empty-hint">Shift+Enter = uruchom · → wyśle output do chatu</span>
              </p>
            )}
            {tasks.map(task => {
              const urls = extractUrls(taskOutput(task));
              const isCollapsed = task.collapsed && task.status !== 'running';
              return (
                <div key={task.id} className={`ah-task ah-task-${task.status}${isCollapsed ? ' ah-task-collapsed' : ''}`}>
                  <div className="ah-task-hdr" onClick={() => toggleTaskCollapse(task.id)} style={{ cursor: 'pointer' }}>
                    <span className="ah-task-icon">
                      {task.status === 'running' ? '⟳' : task.status === 'done' ? '✓' : '✗'}
                    </span>
                    <span className="ah-task-instr" title={task.instructions}>
                      {task.instructions.slice(0, 70)}{task.instructions.length > 70 ? '…' : ''}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {task.reflexionScore != null && (
                        <span
                          title={task.reflexionImprovement ?? task.reflexionVerdict ?? ''}
                          style={{
                            fontSize: '10px', padding: '1px 5px', borderRadius: '10px',
                            background: task.reflexionScore >= 0.7 ? '#1a3a1a' : '#3a1a1a',
                            color: task.reflexionScore >= 0.7 ? '#4ade80' : '#f87171',
                            border: `1px solid ${task.reflexionScore >= 0.7 ? '#4ade80' : '#f87171'}`,
                          }}
                        >
                          {task.reflexionVerdict === 'success' ? '✓' : task.reflexionVerdict === 'failure' ? '✗' : '~'} {(task.reflexionScore * 100).toFixed(0)}%
                        </span>
                      )}
                      {task.retryNum != null && (
                        <span style={{ fontSize: '10px', color: '#fbbf24' }} title="Auto-retry w toku">
                          ↺{task.retryNum}/{task.maxRetries}
                        </span>
                      )}
                      {task.durationMs != null &&
                        <span className="ah-task-dur">{(task.durationMs / 1000).toFixed(1)}s</span>}
                      <span className="ah-task-toggle">{isCollapsed ? '▶' : '▼'}</span>
                    </span>
                  </div>
                  {!isCollapsed && <>
                    <pre className="ah-task-lines">
                      {task.lines.map((l, i) => (
                        <span key={i} className={l.isStderr ? 'ah-line-err' : ''}>{l.text}</span>
                      ))}
                      {task.status === 'running' && <span className="ah-typing">▋</span>}
                    </pre>
                    <div className="ah-task-actions">
                      <button className="ah-act-btn" onClick={e => { e.stopPropagation(); copy(taskOutput(task)); }} title="Kopiuj output">⎘ kopiuj</button>
                      <button className="ah-act-btn" onClick={e => { e.stopPropagation(); sendToChat(taskOutput(task).slice(0, 3000)); }} title="Wyślij do chatu">→ chat</button>
                      {urls.map(url => (
                        <button key={url} className="ah-act-btn ah-act-url" onClick={e => { e.stopPropagation(); openIframe(url); }} title={url}>
                          ⊞ {new URL(url).hostname.replace('www.', '')}
                        </button>
                      ))}
                    </div>
                  </>}
                </div>
              );
            })}
          </div>

          {rightTab === 'tasks' && (
            <div className="ah-input-bar">
              <textarea
                className="ah-textarea"
                placeholder={
                  !hubOnline ? 'Hub offline'
                  : !gooseAvail ? 'Goose offline — uruchom hub z Goose'
                  : 'Instrukcja dla Goose… (Shift+Enter = uruchom)'
                }
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); runTask(); } }}
                rows={2}
                disabled={taskRunning || !gooseAvail}
              />
              <button className="ah-btn-run" onClick={runTask}
                disabled={taskRunning || !gooseAvail || !taskInput.trim()}>
                {taskRunning ? '⟳' : '⚡'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Iframe / Sandbox ── */}
      {showIframe && (
        <div className="ah-iframe-pane">
          <div className="ah-iframe-bar">
            <span className="ah-pane-title">⊟ SANDBOX</span>
            <input
              className="ah-iframe-input"
              type="url"
              placeholder="https://..."
              value={iframeInput || iframeUrl}
              onChange={e => setIframeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setIframeUrl(iframeInput || iframeUrl); setIframeInput(''); } }}
            />
            <button className="ah-btn-go"
              onClick={() => { setIframeUrl(iframeInput || iframeUrl); setIframeInput(''); }}>
              GO
            </button>
            <button className="ah-act-btn" onClick={() => copy(iframeUrl)} title="Kopiuj URL">⎘</button>
            <button className="ah-act-btn" onClick={() => setShowIframe(false)} title="Zamknij">✕</button>
          </div>
          {iframeUrl ? (
            <iframe
              className="ah-iframe"
              src={iframeUrl}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Agent HUB Sandbox"
            />
          ) : (
            <div className="ah-iframe-empty">
              Wpisz URL lub kliknij ⊞ przy URL w outputcie Goose
            </div>
          )}
        </div>
      )}
    </div>
  );
}
