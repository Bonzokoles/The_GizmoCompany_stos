// @ts-nocheck
import type { OverviewTabProps } from "./types";

export function OverviewTab({
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  aiPrompt,
  setAiPrompt,
  aiResponse,
  aiLoading,
  jimboOnline,
  jimboLoading,
  jimboToolEvents,
  handleJimboSearch,
  handleJimboAsk,
  handleSearch,
  handleAI,
  onlineApis,
  apis,
  sites,
}: OverviewTabProps) {
  return (
    <div className="tab-content">
      {/* Search */}
      <section className="card search-section">
        <h2>[SEARCH] Global Web &amp; Knowledge Index</h2>
        <div className="input-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search the web via ZENO..."
          />
          <button onClick={handleSearch} disabled={searching}>
            {searching ? "[RUN]..." : "[RUN] Search"}
          </button>
        </div>
        {searchResults && (
          <div className="results">
            {searchResults.length === 0 ? (
              <p className="muted">No results found.</p>
            ) : (
              searchResults.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-item"
                >
                  <strong>{r.title}</strong>
                  <span className="result-url">{r.url}</span>
                  <p>{r.content}</p>
                </a>
              ))
            )}
          </div>
        )}
      </section>

      {/* AI Gate */}
      <section className="card ai-section">
        <h2>
          [AI_GATE] Autonomous Prompt Engine{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="input-row">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Enter prompt or task specification..."
            rows={3}
          />
          <button onClick={handleAI} disabled={aiLoading}>
            {aiLoading ? "[RUN]..." : "[RUN] Ask AI"}
          </button>
          <button
            onClick={() => handleJimboAsk(aiPrompt)}
            disabled={jimboLoading || aiLoading}
          >
            {jimboLoading ? "[RUN]..." : "[RUN] Ask JIMbo"}
          </button>
        </div>
        <div className="input-row" style={{ marginTop: 8 }}>
          <button
            onClick={() => handleJimboSearch(searchQuery)}
            disabled={searching || jimboLoading}
          >
            {searching ? "[RUN]..." : "[RUN] JIMbo Search"}
          </button>
        </div>
        {jimboToolEvents?.length > 0 && (
          <div className="status-list" style={{ marginTop: 8 }}>
            {jimboToolEvents.map((evt, idx) => (
              <div key={idx} className="status-row">
                {evt}
              </div>
            ))}
          </div>
        )}
        {aiResponse && (
          <div className="ai-output">
            <pre>{aiResponse}</pre>
          </div>
        )}
      </section>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        <section className="card">
          <h2>
            [API_TELEMETRY] ({onlineApis}/{apis.length})
          </h2>
          <div className="status-list">
            {apis.map((svc) => (
              <div key={svc.name} className="status-row">
                <span className={`dot ${svc.status}`} />
                <span className="name">{svc.name}</span>
                <code>{svc.endpoint}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>[TOPOLOGY] Connected Sites ({sites.length})</h2>
          <div className="status-list">
            {sites.map((site) => (
              <div key={site.name} className="status-row">
                <span className={`dot ${site.status}`} />
                <a href={site.url} target="_blank" rel="noopener noreferrer">
                  {site.name}
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>[WEBGATE] Edge Proxy</h2>
          <p className="muted">CORS-free web proxy on Cloudflare Edge</p>
          <div className="endpoint-list">
            <code>POST /api/webgate/fetch</code>
            <code>POST /api/webgate/scrape</code>
          </div>
        </section>

        <section className="card">
          <h2>[DESKTOP_CLIENT] Electron Release</h2>
          <p className="muted">Full ZENO Browser experience with Electron</p>
          <div className="downloads">
            <a
              href="https://github.com/Bonzokoles/The_GizmoCompany_stos/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              [FETCH] GitHub Releases
            </a>
          </div>
        </section>

        <section className="card">
          <h2>[AI_HUB] Dedicated Workspace</h2>
          <p className="muted">
            Direct access to dedicated AI Hub and agent orchestrator
          </p>
          <div className="downloads">
            <a
              href="/ai-hub/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              [ENTER] AI Hub Console
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
