// @ts-nocheck
import type { AnalyticsTabProps } from "./types";

export function AnalyticsTab({
  analyticsSource,
  setAnalyticsSource,
  analyticsPeriod,
  setAnalyticsPeriod,
  loadAnalytics,
  analyticsLoading,
  analyticsData,
  ANALYTICS_SOURCES,
  jimboOnline,
  analyticsInsights,
  analysisLoading,
  handleAiAnalysis,
}: AnalyticsTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          📈 Analytics Hub{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="tab-actions">
          <select
            value={analyticsSource}
            onChange={(e) =>
              setAnalyticsSource(e.target.value as AnalyticsSource)
            }
          >
            {ANALYTICS_SOURCES.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
          <select
            value={analyticsPeriod}
            onChange={(e) => {
              setAnalyticsPeriod(e.target.value);
            }}
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            className="btn-sm"
            onClick={loadAnalytics}
            disabled={analyticsLoading}
          >
            Refresh
          </button>
          <button
            className="btn-sm btn-accent"
            onClick={handleAiAnalysis}
            disabled={analysisLoading || !analyticsData}
          >
            {analysisLoading ? "Analiza..." : "Analizuj z AI"}
          </button>
        </div>
      </div>

      {analyticsLoading && <div className="loading-bar" />}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="mini-stats">
          <span>
            🔌 Source:{" "}
            <strong>
              {ANALYTICS_SOURCES.find((s) => s.id === analyticsSource)?.label}
            </strong>
          </span>
          <span>
            ⏱ Period: <strong>{analyticsPeriod}</strong>
          </span>
          <span>
            🌐 Endpoint:{" "}
            <code>
              {
                ANALYTICS_SOURCES.find((s) => s.id === analyticsSource)
                  ?.endpoint
              }
            </code>
          </span>
        </div>
      </section>

      {analyticsData && (
        <>
          {/* Totals */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">
                {analyticsData.totals?.pageviews?.toLocaleString() || "—"}
              </span>
              <span className="stat-label">Pageviews</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {analyticsData.totals?.visitors?.toLocaleString() || "—"}
              </span>
              <span className="stat-label">Visitors</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {analyticsData.totals?.visits?.toLocaleString() || "—"}
              </span>
              <span className="stat-label">Visits</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {analyticsData.trackedSites || "—"}
              </span>
              <span className="stat-label">Tracked Sites</span>
            </div>
          </div>

          {/* Per-site bar chart */}
          {(() => {
            const sites = analyticsData.sites ?? [];
            const maxPV = Math.max(
              1,
              ...sites.map((s: any) => s.stats?.pageviews?.value ?? 0),
            );
            return (
              <section className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 12 }}>📊 Pageviews per site</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {sites.map((s: any) => {
                    const pv = s.stats?.pageviews?.value ?? 0;
                    const vi = s.stats?.visitors?.value ?? 0;
                    const vs = s.stats?.visits?.value ?? 0;
                    const pct = Math.round((pv / maxPV) * 100);
                    return (
                      <div key={s.site}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.78rem",
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            {s.site}
                          </span>
                          <span
                            style={{
                              color: "var(--text-dim)",
                              fontSize: "0.72rem",
                            }}
                          >
                            👁 {pv} · 👤 {vi} · 🔄 {vs}
                          </span>
                        </div>
                        <div
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: 4,
                            height: 10,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background:
                                "linear-gradient(90deg,#00ffcc,#60a5fa)",
                              borderRadius: 4,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Umami full dashboard iframe */}
          <section className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                📈 Umami Dashboard
              </span>
              <a
                href="https://analytics.mybonzo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sm"
                style={{ fontSize: "0.72rem" }}
              >
                ↗ Otwórz pełny
              </a>
            </div>
            <iframe
              src="https://analytics.mybonzo.com"
              style={{
                width: "100%",
                height: 520,
                border: "none",
                display: "block",
                background: "#0f172a",
              }}
              title="Umami Analytics Dashboard"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </section>
        </>
      )}

      {!analyticsData && !analyticsLoading && (
        <section className="card">
          <p className="muted">Click Refresh to load analytics data.</p>
        </section>
      )}
      {analyticsInsights && (
        <section className="card">
          <h3>🧠 Wnioski JIMbo</h3>
          <div className="ai-output">
            <pre>{analyticsInsights}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
