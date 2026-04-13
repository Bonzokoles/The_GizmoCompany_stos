// @ts-nocheck
import type { RenderTabProps } from "./types";

export function RenderTab({
  renderUrl,
  setRenderUrl,
  renderAction,
  setRenderAction,
  renderSelectors,
  setRenderSelectors,
  renderPrompt,
  setRenderPrompt,
  handleRender,
  renderLoading,
  renderResult,
  jimboOnline,
  jimboResponse,
  deployments,
  deployLog,
  setDeployLog,
  handleTriggerDeploy,
  handleAnalyzeDeployError,
}: RenderTabProps) {
  return (
    <div className="tab-content">
      <h2>
        🌐 Browser Rendering{" "}
        <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Screenshot, PDF, Scrape, Markdown &amp; AI JSON extraction via
        Cloudflare Browser Rendering
      </p>
      <section className="card">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>URL</label>
            <input
              type="text"
              value={renderUrl}
              onChange={(e) => setRenderUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="form-group">
            <label>Action</label>
            <select
              value={renderAction}
              onChange={(e) => setRenderAction(e.target.value as any)}
            >
              <option value="screenshot">📸 Screenshot</option>
              <option value="pdf">📄 PDF</option>
              <option value="scrape">🔍 Scrape</option>
              <option value="markdown">📝 Markdown</option>
              <option value="json">🤖 AI JSON Extract</option>
            </select>
          </div>
          {renderAction === "scrape" && (
            <div className="form-group">
              <label>CSS Selectors (comma-separated)</label>
              <input
                type="text"
                value={renderSelectors}
                onChange={(e) => setRenderSelectors(e.target.value)}
                placeholder="h1, h2, p, a"
              />
            </div>
          )}
          {renderAction === "json" && (
            <div className="form-group full-width">
              <label>AI Prompt</label>
              <textarea
                value={renderPrompt}
                onChange={(e) => setRenderPrompt(e.target.value)}
                placeholder="Extract the main products with names and prices..."
                rows={2}
              />
            </div>
          )}
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleRender}
              disabled={renderLoading}
            >
              {renderLoading ? "Rendering..." : "Render"}
            </button>
          </div>
        </div>
      </section>

      {renderResult && (
        <section className="card render-result">
          <h3>Result</h3>
          {renderResult.error && (
            <p className="error-text">❌ {renderResult.error}</p>
          )}

          {/* Screenshot preview */}
          {renderResult.image && (
            <div className="render-preview">
              <div className="render-meta">
                <span>📸 {renderResult.url}</span>
                <span>{(renderResult.size / 1024).toFixed(1)} KB</span>
                <a
                  href={renderResult.image}
                  download={`screenshot-${Date.now()}.png`}
                  className="btn-sm btn-accent"
                >
                  Download PNG
                </a>
              </div>
              <img
                src={renderResult.image}
                alt="Screenshot"
                className="render-screenshot"
              />
            </div>
          )}

          {/* PDF download */}
          {renderResult.data && renderResult.format === "pdf" && (
            <div className="render-preview">
              <div className="render-meta">
                <span>📄 {renderResult.url}</span>
                <span>{(renderResult.size / 1024).toFixed(1)} KB</span>
                <a
                  href={renderResult.data}
                  download={`page-${Date.now()}.pdf`}
                  className="btn-sm btn-accent"
                >
                  Download PDF
                </a>
              </div>
              <iframe
                src={renderResult.data}
                className="render-pdf-preview"
                title="PDF Preview"
              />
            </div>
          )}

          {/* Markdown output */}
          {renderResult.markdown && (
            <div className="render-preview">
              <div className="render-meta">
                <span>📝 Markdown from {renderResult.url}</span>
                <button
                  className="btn-sm"
                  onClick={() =>
                    navigator.clipboard.writeText(renderResult.markdown)
                  }
                >
                  Copy
                </button>
              </div>
              <pre className="render-markdown">{renderResult.markdown}</pre>
            </div>
          )}

          {/* Scrape results */}
          {renderResult.result && renderAction === "scrape" && (
            <div className="render-preview">
              <div className="render-meta">
                <span>
                  🔍 Scraped {renderResult.selectors?.length || 0} selectors
                  from {renderResult.url}
                </span>
              </div>
              {Array.isArray(renderResult.result) &&
                renderResult.result.map((group: any, gi: number) => (
                  <div key={gi} className="scrape-group">
                    <h4>
                      <code>{group.selector}</code> (
                      {group.results?.length || 0} matches)
                    </h4>
                    <div className="scrape-items">
                      {group.results
                        ?.slice(0, 20)
                        .map((item: any, ii: number) => (
                          <div key={ii} className="scrape-item">
                            <span className="scrape-text">{item.text}</span>
                            {item.attributes?.find(
                              (a: any) => a.name === "href",
                            ) && (
                              <code className="scrape-href">
                                {
                                  item.attributes.find(
                                    (a: any) => a.name === "href",
                                  ).value
                                }
                              </code>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* JSON AI result */}
          {renderResult.result && renderAction === "json" && (
            <div className="render-preview">
              <div className="render-meta">
                <span>🤖 AI extracted from {renderResult.url}</span>
                <span>Prompt: {renderResult.prompt}</span>
              </div>
              <pre className="render-json">
                {JSON.stringify(renderResult.result, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}
      <section className="card">
        <h3>🚀 Deploy Tools</h3>
        <div className="input-row">
          <button
            className="btn-sm"
            onClick={() => handleTriggerDeploy("zenbrowsers-org")}
          >
            Trigger Deploy
          </button>
          <input
            value={deployLog}
            onChange={(e) => setDeployLog(e.target.value)}
            placeholder="Wklej log błędu deploy"
          />
          <button
            className="btn-sm btn-accent"
            onClick={() => handleAnalyzeDeployError(deployLog)}
            disabled={!deployLog.trim()}
          >
            Analizuj błąd
          </button>
        </div>
        {deployments?.length > 0 && (
          <p className="muted">Deployments: {deployments.length}</p>
        )}
        {jimboResponse && (
          <div className="ai-output">
            <pre>{jimboResponse}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
