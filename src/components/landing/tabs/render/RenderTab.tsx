import type {
  RenderTabProps,
  RenderActionType,
  ScrapeGroup,
  ScrapeItem,
} from "./types";

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
      <div className="tab-header" style={{ marginBottom: 16 }}>
        <h2>
          [RENDER] BROWSER RUN MATRIX{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <p className="muted">
          Edge Browser Rendering engine via Cloudflare Workers BROWSER binding &amp; REST API.
          Stateless execution: Screenshot, PDF, DOM Scrape, Markdown, and AI JSON extraction.
        </p>
      </div>

      <section className="card">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>[TARGET_URL]</label>
            <input
              type="text"
              value={renderUrl}
              onChange={(e) => setRenderUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="form-group">
            <label>[ACTION]</label>
            <select
              value={renderAction}
              onChange={(e) => setRenderAction(e.target.value as RenderActionType)}
            >
              <option value="screenshot">[SCREENSHOT] Screenshot (PNG)</option>
              <option value="pdf">[PDF] PDF Document</option>
              <option value="scrape">[SCRAPE] DOM Element Extraction</option>
              <option value="markdown">[MARKDOWN] Markdown Conversion</option>
              <option value="json">[JSON] AI Structured Extract</option>
            </select>
          </div>
          {renderAction === "scrape" && (
            <div className="form-group">
              <label>[CSS_SELECTORS] (comma-separated)</label>
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
              <label>[AI_EXTRACTION_PROMPT]</label>
              <textarea
                value={renderPrompt}
                onChange={(e) => setRenderPrompt(e.target.value)}
                placeholder="Extract structured products with names, prices, and availability..."
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
              {renderLoading ? "[RUNNING...]" : "[EXECUTE_RENDER]"}
            </button>
          </div>
        </div>
      </section>

      {renderResult && (
        <section className="card render-result">
          <h3>[OUTPUT_TELEMETRY]</h3>
          {renderResult.error && (
            <div className="error-box" style={{ padding: "8px 12px", border: "1px solid #ef4444", marginBottom: 12 }}>
              <p className="error-text" style={{ margin: 0, color: "#ef4444", fontFamily: "monospace" }}>
                [ERR] {renderResult.error}
              </p>
            </div>
          )}

          {/* Screenshot preview */}
          {renderResult.image && (
            <div className="render-preview">
              <div className="render-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>[PNG] {renderResult.url}</span>
                <span>{((renderResult.size ?? 0) / 1024).toFixed(1)} KB</span>
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
                alt="Rendered Screenshot"
                className="render-screenshot"
                style={{ maxWidth: "100%", border: "1px solid #1a202c" }}
              />
            </div>
          )}

          {/* PDF download */}
          {renderResult.data && renderResult.format === "pdf" && (
            <div className="render-preview">
              <div className="render-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>[PDF] {renderResult.url}</span>
                <span>{((renderResult.size ?? 0) / 1024).toFixed(1)} KB</span>
                <a
                  href={renderResult.data}
                  download={`document-${Date.now()}.pdf`}
                  className="btn-sm btn-accent"
                >
                  Download PDF
                </a>
              </div>
              <iframe
                src={renderResult.data}
                className="render-pdf-preview"
                title="PDF Preview"
                style={{ width: "100%", height: 500, border: "1px solid #1a202c" }}
              />
            </div>
          )}

          {/* Markdown output */}
          {renderResult.markdown && (
            <div className="render-preview">
              <div className="render-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>[MARKDOWN] Source: {renderResult.url}</span>
                <button
                  className="btn-sm"
                  onClick={() => {
                    if (renderResult.markdown) {
                      navigator.clipboard.writeText(renderResult.markdown);
                    }
                  }}
                >
                  [COPY_MARKDOWN]
                </button>
              </div>
              <pre
                className="render-markdown"
                style={{
                  maxHeight: 400,
                  overflow: "auto",
                  padding: 12,
                  background: "#0a0e14",
                  border: "1px solid #1a202c",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {renderResult.markdown}
              </pre>
            </div>
          )}

          {/* Scrape results */}
          {renderResult.result && renderAction === "scrape" && (
            <div className="render-preview">
              <div className="render-meta" style={{ marginBottom: 8 }}>
                <span>
                  [SCRAPE_DATA] Selectors: {renderResult.selectors?.length ?? 0} | Target: {renderResult.url}
                </span>
              </div>
              {Array.isArray(renderResult.result) &&
                (renderResult.result as ScrapeGroup[]).map((group: ScrapeGroup, gi: number) => (
                  <div key={gi} className="scrape-group" style={{ marginBottom: 12 }}>
                    <h4>
                      <code>{group.selector}</code> ({group.results?.length ?? 0} matches)
                    </h4>
                    <div className="scrape-items">
                      {group.results?.slice(0, 20).map((item: ScrapeItem, ii: number) => (
                        <div key={ii} className="scrape-item" style={{ padding: "4px 0" }}>
                          <span className="scrape-text">{item.text}</span>
                          {item.attributes?.find((a) => a.name === "href") && (
                            <code className="scrape-href" style={{ marginLeft: 8, color: "#00e5ff" }}>
                              {item.attributes.find((a) => a.name === "href")?.value}
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
              <div className="render-meta" style={{ marginBottom: 8 }}>
                <span>[AI_EXTRACTED_JSON] Target: {renderResult.url}</span>
                {renderResult.prompt && <p className="muted" style={{ margin: "4px 0" }}>Prompt: {renderResult.prompt}</p>}
              </div>
              <pre
                className="render-json"
                style={{
                  maxHeight: 400,
                  overflow: "auto",
                  padding: 12,
                  background: "#0a0e14",
                  border: "1px solid #1a202c",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(renderResult.result, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h3>[DEPLOY] CLOUDFLARE PAGES CONTROL</h3>
        <div className="input-row">
          <button
            className="btn-sm"
            onClick={() => handleTriggerDeploy("zenbrowsers-org")}
          >
            [TRIGGER_DEPLOY]
          </button>
          <input
            value={deployLog}
            onChange={(e) => setDeployLog(e.target.value)}
            placeholder="Paste build/deployment error log..."
          />
          <button
            className="btn-sm btn-accent"
            onClick={() => handleAnalyzeDeployError(deployLog)}
            disabled={!deployLog.trim()}
          >
            [ANALYZE_ERROR]
          </button>
        </div>
        {deployments?.length > 0 && (
          <p className="muted" style={{ marginTop: 8 }}>Deployments recorded: {deployments.length}</p>
        )}
        {jimboResponse && (
          <div className="ai-output" style={{ marginTop: 12, padding: 12, background: "#0a0e14", border: "1px solid #1a202c" }}>
            <pre style={{ margin: 0, fontFamily: "monospace" }}>{jimboResponse}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
