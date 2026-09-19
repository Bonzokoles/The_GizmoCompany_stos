// @ts-nocheck
import { useState } from "react";
import type { WorkersTabProps } from "./types";
import { DatabasesTab } from "../databases/DatabasesTab";
import { StorageTab } from "../storage/StorageTab";
import { QueuesTab } from "../queues/QueuesTab";

type SubTab = "workers" | "databases" | "storage" | "queues";

export function WorkersTab({
  workers = [],
  workerFilter,
  setWorkerFilter,
  workersLoading,
  loadWorkers,
  healthCheckWorkers,
  filteredWorkers = [],
  workerCategories = [],
  jimboOnline,
  jimboLoading,
  jimboResponse,
  jimboToolEvents,
  handleAnalyzeLogs,
  handleDeployWorker,
  storage,
  databases,
  queues,
}: WorkersTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("workers");

  return (
    <div className="tab-content">
      {/* Infrastructure Sub-Navigation Bar */}
      <div
        className="filter-bar"
        style={{
          marginBottom: "1.25rem",
          borderBottom: "1px solid #1a202c",
          paddingBottom: "0.5rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          className={`filter-btn ${subTab === "workers" ? "active" : ""}`}
          onClick={() => setSubTab("workers")}
        >
          [WORKERS] ({workers?.length || 0})
        </button>
        {databases && (
          <button
            className={`filter-btn ${subTab === "databases" ? "active" : ""}`}
            onClick={() => setSubTab("databases")}
          >
            [D1 DATABASES] ({databases.databases?.length || 0})
          </button>
        )}
        {storage && (
          <button
            className={`filter-btn ${subTab === "storage" ? "active" : ""}`}
            onClick={() => setSubTab("storage")}
          >
            [R2 STORAGE] ({storage.buckets?.length || 0})
          </button>
        )}
        {queues && (
          <button
            className={`filter-btn ${subTab === "queues" ? "active" : ""}`}
            onClick={() => setSubTab("queues")}
          >
            [QUEUES]
          </button>
        )}
      </div>

      {subTab === "databases" && databases && <DatabasesTab {...databases} />}
      {subTab === "storage" && storage && <StorageTab {...storage} />}
      {subTab === "queues" && queues && <QueuesTab {...queues} />}

      {subTab === "workers" && (
        <>
          <div className="tab-header">
            <h2>
              [WORKERS] Cloudflare Edge Cluster ({workers?.length || 0}){" "}
              <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
            </h2>
            <div className="tab-actions">
              <button
                className="btn-sm"
                onClick={loadWorkers}
                disabled={workersLoading}
              >
                [SYNC] Refresh
              </button>
              <button
                className="btn-sm btn-accent"
                onClick={healthCheckWorkers}
                disabled={workersLoading}
              >
                [RUN] Health Check
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-bar">
            <button
              className={`filter-btn ${workerFilter === "all" ? "active" : ""}`}
              onClick={() => setWorkerFilter("all")}
            >
              All ({workers?.length || 0})
            </button>
            {workerCategories?.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${workerFilter === cat ? "active" : ""}`}
                onClick={() => setWorkerFilter(cat)}
              >
                {cat} ({workers?.filter((w) => w.category === cat).length || 0})
              </button>
            ))}
          </div>

          {workersLoading && <div className="loading-bar" />}

          <div className="workers-grid">
            {filteredWorkers?.map((w) => (
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
                    [RUN] Ask JIMbo
                  </button>
                  <button
                    className="btn-sm btn-accent"
                    disabled={jimboLoading}
                    onClick={() => handleDeployWorker(w.name)}
                  >
                    [DEPLOY] Deploy
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
        </>
      )}
    </div>
  );
}
