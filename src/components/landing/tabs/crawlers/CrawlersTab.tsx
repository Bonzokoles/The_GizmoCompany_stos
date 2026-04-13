// @ts-nocheck
import type { CrawlersTabProps } from "./types";

export function CrawlersTab({
  crawlersPeriod,
  setCrawlersPeriod,
  loadCrawlers,
  crawlersLoading,
  crawlersData,
  crawlerFilter,
  setCrawlerFilter,
  crawlerProfiles,
  jimboOnline,
  jimboLoading,
  jimboResponse,
  jimboToolEvents,
  crawlUrl,
  setCrawlUrl,
  crawlResult,
  kbItems,
  handleJimboCrawl,
  handleKbSave,
}: CrawlersTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          🕷️ Crawlers & Bots Monitor{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="tab-actions">
          <select
            value={crawlersPeriod}
            onChange={(e) => setCrawlersPeriod(e.target.value)}
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            className="btn-sm"
            onClick={loadCrawlers}
            disabled={crawlersLoading}
          >
            Refresh
          </button>
          <button
            className="btn-sm btn-accent"
            onClick={() => handleJimboCrawl(crawlUrl)}
            disabled={jimboLoading || !crawlUrl.trim()}
          >
            {jimboLoading ? "..." : "Crawluj URL"}
          </button>
        </div>
      </div>
      <section className="card" style={{ marginBottom: 12 }}>
        <div className="input-row">
          <input
            value={crawlUrl}
            onChange={(e) => setCrawlUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <button
            onClick={() => handleJimboCrawl(crawlUrl)}
            disabled={jimboLoading || !crawlUrl.trim()}
          >
            Ask JIMbo
          </button>
          <button
            onClick={() => handleKbSave(crawlResult)}
            disabled={!crawlResult}
          >
            Save to KB
          </button>
        </div>
        {jimboToolEvents?.length > 0 && (
          <div className="status-list" style={{ marginTop: 8 }}>
            {jimboToolEvents.map((evt, i) => (
              <div key={i} className="status-row">
                {evt}
              </div>
            ))}
          </div>
        )}
        {jimboResponse && (
          <div className="ai-output" style={{ marginTop: 8 }}>
            <pre>{jimboResponse}</pre>
          </div>
        )}
        {kbItems?.length > 0 && (
          <p className="muted" style={{ marginTop: 8 }}>
            KB items: {kbItems.length}
          </p>
        )}
      </section>

      {crawlersLoading && <div className="loading-bar" />}

      {crawlersData?.summary && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">
                {crawlersData.summary.totalRequests?.toLocaleString() || "—"}
              </span>
              <span className="stat-label">Total Requests</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {crawlersData.summary.humanRequests?.toLocaleString() || "—"}
              </span>
              <span className="stat-label">Human</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {crawlersData.summary.botRequests?.toLocaleString() || "—"}
              </span>
              <span className="stat-label">Bot Requests</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {crawlersData.summary.botPercentage}%
              </span>
              <span className="stat-label">Bot Traffic</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {crawlersData.summary.uniqueCrawlers || "—"}
              </span>
              <span className="stat-label">Unique Crawlers</span>
            </div>
          </div>

          {/* By Type */}
          {crawlersData.byType && (
            <section className="card">
              <h3>📊 Requests by Crawler Type</h3>
              <div className="crawler-type-grid">
                {Object.entries(crawlersData.byType)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([type, count]: any) => (
                    <div key={type} className="crawler-type-item">
                      <span className={`badge badge-${type}`}>{type}</span>
                      <span className="crawler-type-count">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Detected Crawlers */}
          {crawlersData.crawlers?.length > 0 && (
            <section className="card">
              <h3>🤖 Detected Crawlers ({crawlersData.crawlers.length})</h3>
              <div className="filter-bar">
                <button
                  className={`filter-btn ${crawlerFilter === "all" ? "active" : ""}`}
                  onClick={() => setCrawlerFilter("all")}
                >
                  All
                </button>
                {[
                  ...new Set(crawlersData.crawlers.map((c: any) => c.type)),
                ].map((type: any) => (
                  <button
                    key={type}
                    className={`filter-btn ${crawlerFilter === type ? "active" : ""}`}
                    onClick={() => setCrawlerFilter(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="crawlers-list">
                {crawlersData.crawlers
                  .filter(
                    (c: any) =>
                      crawlerFilter === "all" || c.type === crawlerFilter,
                  )
                  .map((c: any) => (
                    <div key={c.name} className="crawler-row">
                      <div className="crawler-info">
                        <span className="crawler-name">{c.name}</span>
                        <span className={`badge badge-${c.type}`}>
                          {c.type}
                        </span>
                      </div>
                      <span className="crawler-count">
                        {c.count.toLocaleString()} req
                      </span>
                      <p className="crawler-desc">{c.description}</p>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Unknown Bots */}
          {crawlersData.unknownBots?.length > 0 && (
            <section className="card">
              <h3>❓ Unknown Bots ({crawlersData.unknownBots.length})</h3>
              <div className="crawlers-list">
                {crawlersData.unknownBots.map((b: any, i: number) => (
                  <div key={i} className="crawler-row unknown">
                    <div className="crawler-info">
                      <code className="crawler-ua">{b.userAgent}</code>
                    </div>
                    <span className="crawler-count">
                      {b.count.toLocaleString()} req
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {crawlersData?.note && !crawlersData?.summary && (
        <section className="card">
          <p className="muted">⚠️ {crawlersData.note}</p>
          {crawlersData.crawlersByType && (
            <div className="mini-stats" style={{ marginTop: 12 }}>
              {Object.entries(crawlersData.crawlersByType).map(
                ([type, count]: any) => (
                  <span key={type}>
                    {type}: {count}
                  </span>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {/* Known Crawler Profiles */}
      {crawlerProfiles.length > 0 && (
        <section className="card">
          <h3>📋 Known Crawler Profiles ({crawlerProfiles.length})</h3>
          <div className="crawlers-list compact">
            {crawlerProfiles.map((p: any) => (
              <div key={p.name} className="crawler-row">
                <div className="crawler-info">
                  <span className="crawler-name">{p.name}</span>
                  <span className={`badge badge-${p.type}`}>{p.type}</span>
                </div>
                <p className="crawler-desc">{p.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!crawlersData && !crawlersLoading && (
        <section className="card">
          <p className="muted">Click Refresh to load crawler data.</p>
        </section>
      )}
    </div>
  );
}
