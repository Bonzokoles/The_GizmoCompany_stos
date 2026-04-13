// @ts-nocheck
import type { WorkersTabProps } from "./types";

export function WorkersTab({
  workers,
  workerFilter,
  setWorkerFilter,
  workersLoading,
  loadWorkers,
  healthCheckWorkers,
  filteredWorkers,
  workerCategories,
  jimboOnline,
  jimboLoading,
  jimboResponse,
  jimboToolEvents,
  handleAnalyzeLogs,
  handleDeployWorker,
}: WorkersTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          ⚙️ Workers Infrastructure ({workers.length}){" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="tab-actions">
          <button
            className="btn-sm"
            onClick={loadWorkers}
            disabled={workersLoading}
          >
            Refresh
          </button>
          <button
            className="btn-sm btn-accent"
            onClick={healthCheckWorkers}
            disabled={workersLoading}
          >
            Health Check
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${workerFilter === "all" ? "active" : ""}`}
          onClick={() => setWorkerFilter("all")}
        >
          All ({workers.length})
        </button>
        {workerCategories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${workerFilter === cat ? "active" : ""}`}
            onClick={() => setWorkerFilter(cat)}
          >
            {cat} ({workers.filter((w) => w.category === cat).length})
          </button>
        ))}
      </div>

      {workersLoading && <div className="loading-bar" />}

      <div className="workers-grid">
        {filteredWorkers.map((w) => (
          <div key={w.id || w.name} className={`worker-card ${w.status || ""}`}>
            <div className="worker-header">
              {w.status && <span className={`dot ${w.status}`} />}
              <span className="worker-name">{w.name}</span>
              <span className="worker-cat">{w.category}</span>
            </div>
            <p className="worker-desc">{w.description}</p>
            {w.route && <code className="worker-route">{w.route}</code>}
            {w.latency != null && (
              <span className="worker-latency">{w.latency}ms</span>
            )}
            <div className="input-row" style={{ marginTop: 8 }}>
              <button
                className="btn-sm"
                disabled={jimboLoading}
                onClick={() => handleAnalyzeLogs(w.name)}
              >
                Ask JIMbo
              </button>
              <button
                className="btn-sm btn-accent"
                disabled={jimboLoading}
                onClick={() => handleDeployWorker(w.name)}
              >
                Deploy
              </button>
            </div>
          </div>
        ))}
      </div>

      {jimboToolEvents?.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          {jimboToolEvents.map((evt, i) => (
            <div className="status-row" key={i}>
              {evt}
            </div>
          ))}
        </section>
      )}

      {jimboResponse && (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="ai-output">
            <pre>{jimboResponse}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
