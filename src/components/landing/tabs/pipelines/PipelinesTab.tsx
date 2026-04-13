// @ts-nocheck
import type { PipelinesTabProps } from "./types";

export function PipelinesTab({
  loadPipelines,
  pipelinesLoading,
  pipelineStats,
  pipelinesData,
  pipelineFilter,
  setPipelineFilter,
  pipelineEvents,
  ingestPipeline,
  setIngestPipeline,
  PIPELINES_LIST,
  ingestType,
  setIngestType,
  ingestPayload,
  setIngestPayload,
  handleIngest,
  ingestResult,
  jimboOnline,
  jimboLoading,
  jimboResponse,
  jimboToolEvents,
  pipelineStatus,
  handleRunPipeline,
  handleMonitorPipeline,
}: PipelinesTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          🔀 Event Pipelines{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="tab-actions">
          <button
            className="btn-sm"
            onClick={loadPipelines}
            disabled={pipelinesLoading}
          >
            Refresh
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        LinkedOut-style event streaming: Source → CF Worker → D1 → R2 Data
        Catalog (Iceberg) → R2 SQL
      </p>

      {pipelinesLoading && <div className="loading-bar" />}

      {/* Pipeline Stats */}
      {pipelineStats?.summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">
              {pipelineStats.summary.totalPipelines}
            </span>
            <span className="stat-label">Pipelines</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{pipelineStats.summary.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {pipelineStats.summary.totalEventsPerDay?.toLocaleString()}
            </span>
            <span className="stat-label">Events / Day</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {pipelineStats.summary.estimatedMonthly?.toLocaleString()}
            </span>
            <span className="stat-label">Est. Monthly</span>
          </div>
        </div>
      )}

      {/* Data Flow Architecture */}
      {pipelineStats?.dataFlow && (
        <section className="card pipeline-architecture">
          <h3>📐 Data Flow Architecture</h3>
          <div className="pipeline-flow">
            <div className="flow-stage">
              <span className="flow-icon">📡</span>
              <span className="flow-label">Sources</span>
              <div className="flow-items">
                {pipelineStats.dataFlow.sources.map((s: string) => (
                  <span key={s} className="badge">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <span className="flow-arrow">→</span>
            <div className="flow-stage">
              <span className="flow-icon">⚡</span>
              <span className="flow-label">CF Worker</span>
            </div>
            <span className="flow-arrow">→</span>
            <div className="flow-stage">
              <span className="flow-icon">🗃️</span>
              <span className="flow-label">D1 Events</span>
            </div>
            <span className="flow-arrow">→</span>
            <div className="flow-stage">
              <span className="flow-icon">🧊</span>
              <span className="flow-label">R2 Iceberg</span>
            </div>
            <span className="flow-arrow">→</span>
            <div className="flow-stage">
              <span className="flow-icon">📊</span>
              <span className="flow-label">R2 SQL</span>
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      {pipelinesData && (
        <div className="filter-bar">
          <button
            className={`filter-btn ${pipelineFilter === "all" ? "active" : ""}`}
            onClick={() => setPipelineFilter("all")}
          >
            All ({pipelinesData.total})
          </button>
          {Object.entries(pipelinesData.categories || {}).map(
            ([cat, count]) => (
              <button
                key={cat}
                className={`filter-btn ${pipelineFilter === cat ? "active" : ""}`}
                onClick={() => setPipelineFilter(cat)}
              >
                {cat} ({count as number})
              </button>
            ),
          )}
        </div>
      )}

      {/* Pipeline Cards */}
      <div className="pipeline-grid">
        {(pipelinesData?.pipelines || [])
          .filter(
            (p: any) =>
              pipelineFilter === "all" || p.category === pipelineFilter,
          )
          .map((p: any) => (
            <div key={p.id} className={`pipeline-card pipeline-${p.status}`}>
              <div className="pipeline-header">
                <span
                  className={`dot ${p.status === "active" ? "healthy" : p.status === "paused" ? "warning" : "error"}`}
                />
                <span className="pipeline-name">{p.name}</span>
                <span className="pipeline-cat">{p.category}</span>
              </div>
              <p className="pipeline-desc">{p.description}</p>
              <div className="pipeline-meta">
                <span>📡 {p.source}</span>
                <span>📦 {p.destination}</span>
                {p.status === "active" && (
                  <span>⚡ ~{p.eventsPerDay.toLocaleString()} events/day</span>
                )}
                {p.status === "paused" && (
                  <span className="badge badge-yellow">Paused</span>
                )}
              </div>
              <div className="input-row" style={{ marginTop: 8 }}>
                <button
                  className="btn-sm"
                  disabled={jimboLoading}
                  onClick={() => handleRunPipeline(p.id)}
                >
                  Run
                </button>
                <button
                  className="btn-sm btn-accent"
                  disabled={jimboLoading}
                  onClick={() => handleMonitorPipeline(p.id)}
                >
                  Ask JIMbo
                </button>
              </div>
              {pipelineStatus?.[p.id] && (
                <div className="muted" style={{ marginTop: 6 }}>
                  Status: {pipelineStatus[p.id]}
                </div>
              )}
            </div>
          ))}
      </div>
      {(jimboToolEvents?.length > 0 || jimboResponse) && (
        <section className="card">
          {jimboToolEvents?.map((evt, i) => (
            <div key={i} className="status-row">
              {evt}
            </div>
          ))}
          {jimboResponse && (
            <div className="ai-output">
              <pre>{jimboResponse}</pre>
            </div>
          )}
        </section>
      )}

      {/* Recent Events */}
      {pipelineEvents.length > 0 && (
        <section className="card">
          <h3>📋 Recent Events</h3>
          <div className="events-table-wrapper">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Pipeline</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {pipelineEvents.slice(0, 15).map((evt: any) => (
                  <tr key={evt.id}>
                    <td>
                      <code>{evt.pipeline_id}</code>
                    </td>
                    <td>{evt.event_type}</td>
                    <td>{evt.source}</td>
                    <td>{new Date(evt.timestamp).toLocaleString("pl-PL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ingest Test Event */}
      <section className="card">
        <h3>🧪 Send Test Event</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Pipeline</label>
            <select
              value={ingestPipeline}
              onChange={(e) => setIngestPipeline(e.target.value)}
            >
              <option value="">Select pipeline...</option>
              {PIPELINES_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Event Type</label>
            <input
              type="text"
              value={ingestType}
              onChange={(e) => setIngestType(e.target.value)}
              placeholder="pageview, click, purchase..."
            />
          </div>
          <div className="form-group full-width">
            <label>Payload (JSON)</label>
            <textarea
              value={ingestPayload}
              onChange={(e) => setIngestPayload(e.target.value)}
              rows={2}
              placeholder='{"page": "/home", "referrer": "google.com"}'
            />
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleIngest}
              disabled={!ingestPipeline || !ingestType}
            >
              Send Event
            </button>
          </div>
        </div>
        {ingestResult && (
          <div
            className={`ingest-result ${ingestResult.success ? "success" : "error"}`}
          >
            {ingestResult.success
              ? `✅ Event ${ingestResult.eventId} ingested into ${ingestResult.pipeline}`
              : `❌ ${ingestResult.error}`}
          </div>
        )}
      </section>

      {/* DB Stats */}
      {pipelineStats?.dbStats && pipelineStats.dbStats.length > 0 && (
        <section className="card">
          <h3>💾 D1 Storage Stats</h3>
          <div className="dashboard-grid">
            {pipelineStats.dbStats.map((s: any) => (
              <div
                key={s.pipeline_id}
                className="card"
                style={{ background: "var(--color-bg)" }}
              >
                <h4>{s.pipeline_id}</h4>
                <div className="mini-stats">
                  <span>📊 {s.count} events</span>
                  <span>
                    🕐 First:{" "}
                    {new Date(s.first_event).toLocaleDateString("pl-PL")}
                  </span>
                  <span>
                    🕐 Last:{" "}
                    {new Date(s.last_event).toLocaleDateString("pl-PL")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!pipelinesData && !pipelinesLoading && (
        <section className="card">
          <p className="muted">Click Refresh to load pipeline data.</p>
        </section>
      )}
    </div>
  );
}
