// @ts-nocheck
import type { WorkflowsTabProps } from "./types";

export function WorkflowsTab({
  workflowEndpoint,
  setWorkflowEndpoint,
  loadWorkflowStatuses,
  workflowList,
  workflowSelected,
  setWorkflowSelected,
  setWorkflowParams,
  setWorkflowResult,
  workflowParams,
  handleWorkflowTrigger,
  workflowLoading,
  workflowResult,
  workflowStatuses,
}: WorkflowsTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>⚡ Cloudflare Workflows — Durable AI Processing</h2>
        <div className="tab-actions">
          <input
            type="text"
            value={workflowEndpoint}
            onChange={(e) => setWorkflowEndpoint(e.target.value)}
            placeholder="Endpoint (e.g., https://mybonzo-ai-workflow.stolarnia-ams.workers.dev)"
            style={{ flex: 1, maxWidth: 400 }}
          />
          <button className="btn-sm" onClick={loadWorkflowStatuses}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ─ Workflow Selector ─ */}
      <section className="card">
        <h3>📋 Dostępne Workflows</h3>
        <div className="dashboard-grid">
          {workflowList.map((w) => (
            <div
              key={w.id}
              className="stat-card"
              style={{
                cursor: "pointer",
                border:
                  workflowSelected === w.id
                    ? "2px solid #60a5fa"
                    : "1px solid rgba(100,116,139,0.3)",
                background:
                  workflowSelected === w.id ? "rgba(96,165,250,0.1)" : "",
              }}
              onClick={() => {
                setWorkflowSelected(w.id);
                setWorkflowParams({});
                setWorkflowResult(null);
              }}
            >
              <span className="stat-label">{w.name}</span>
              <span
                className="stat-value"
                style={{ fontSize: 11, opacity: 0.8 }}
              >
                {w.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─ Workflow Parameters ─ */}
      <section className="card">
        <h3>
          ⚙️ Parametry —{" "}
          {workflowList.find((w) => w.id === workflowSelected)?.name}
        </h3>
        <div className="form-grid">
          {workflowSelected === "chat" && (
            <>
              <input
                type="text"
                value={workflowParams.message || ""}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    message: e.target.value,
                  })
                }
                placeholder="Wiadomość do AI..."
              />
              <select
                value={workflowParams.model || "deepseek"}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    model: e.target.value,
                  })
                }
              >
                <option value="deepseek">🧠 DeepSeek</option>
                <option value="openrouter">🌐 OpenRouter</option>
                <option value="workers-ai">⚡ Workers AI</option>
              </select>
              <select
                value={workflowParams.language || "pl"}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    language: e.target.value,
                  })
                }
              >
                <option value="pl">🇵🇱 Polski</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </>
          )}
          {workflowSelected === "image" && (
            <>
              <input
                type="text"
                value={workflowParams.prompt || ""}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    prompt: e.target.value,
                  })
                }
                placeholder="Opis obrazu (po angielsku)..."
                style={{ gridColumn: "1 / -1" }}
              />
              <select
                value={workflowParams.style || "default"}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    style: e.target.value,
                  })
                }
              >
                <option value="default">🎨 Default (SDXL)</option>
                <option value="fast">⚡ Lightning (szybki)</option>
                <option value="artistic">🖌️ Artistic (DreamShaper)</option>
              </select>
            </>
          )}
          {workflowSelected === "moa" && (
            <>
              <input
                type="text"
                value={workflowParams.topic || ""}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    topic: e.target.value,
                  })
                }
                placeholder="Temat artykułu..."
                style={{ gridColumn: "1 / -1" }}
              />
              <select
                value={workflowParams.type || "blog"}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    type: e.target.value,
                  })
                }
              >
                <option value="blog">📝 Blog</option>
                <option value="article">📰 Artykuł</option>
                <option value="social">📱 Social media</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={workflowParams.publishToGhost ?? false}
                  onChange={(e) =>
                    setWorkflowParams({
                      ...workflowParams,
                      publishToGhost: e.target.checked,
                    })
                  }
                />
                🎯 Opublikuj do Ghost CMS (jako draft)
              </label>
            </>
          )}
          {workflowSelected === "replicate" && (
            <>
              <input
                type="text"
                value={workflowParams.prompt || ""}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    prompt: e.target.value,
                  })
                }
                placeholder="Opis obrazu (po angielsku)..."
                style={{ gridColumn: "1 / -1" }}
              />
              <select
                value={workflowParams.model || "black-forest-labs/flux-schnell"}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    model: e.target.value,
                  })
                }
              >
                <option value="black-forest-labs/flux-schnell">
                  ⚡ FLUX Schnell (szybki, darmowy)
                </option>
                <option value="black-forest-labs/flux-dev">
                  🎨 FLUX Dev (wysoka jakość)
                </option>
                <option value="stability-ai/sdxl">
                  📊 SDXL (Stable Diffusion)
                </option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={workflowParams.saveToR2 !== false}
                  onChange={(e) =>
                    setWorkflowParams({
                      ...workflowParams,
                      saveToR2: e.target.checked,
                    })
                  }
                />
                💾 Zapisz do R2 storage
              </label>
            </>
          )}
          {workflowSelected === "schedule" && (
            <>
              <input
                type="text"
                value={workflowParams.topics || ""}
                onChange={(e) =>
                  setWorkflowParams({
                    ...workflowParams,
                    topics: e.target.value,
                  })
                }
                placeholder="Tematy (oddzielone przecinkami)..."
                style={{ gridColumn: "1 / -1" }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={workflowParams.generateImages ?? false}
                  onChange={(e) =>
                    setWorkflowParams({
                      ...workflowParams,
                      generateImages: e.target.checked,
                    })
                  }
                />
                🖼️ Generuj obrazy dla każdego artykułu
              </label>
            </>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={handleWorkflowTrigger}
          disabled={workflowLoading}
          style={{ marginTop: 16 }}
        >
          {workflowLoading ? "⏳ Procesowanie..." : "▶️ Uruchom Workflow"}
        </button>
      </section>

      {/* ─ Results ─ */}
      {workflowResult && (
        <section className="card">
          <h3>✅ Rezultat</h3>
          <pre
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              padding: 12,
              borderRadius: 4,
              overflow: "auto",
              maxHeight: 300,
            }}
          >
            {JSON.stringify(workflowResult, null, 2)}
          </pre>
        </section>
      )}

      {/* ─ Statuses ─ */}
      <section className="card">
        <h3>📊 Status Workflow'ów</h3>
        <div className="status-list">
          {workflowStatuses.length > 0 ? (
            workflowStatuses.map((ws) => (
              <div key={ws.id} className="status-row">
                <span
                  className={`dot ${ws.status === "active" ? "online" : "offline"}`}
                />
                <span className="name">
                  {workflowList.find((w) => w.id === ws.id)?.name}
                </span>
                <span style={{ opacity: 0.7 }}>
                  {ws.instances} active instance(s)
                </span>
                {ws.lastRun && (
                  <code style={{ fontSize: 11 }}>
                    {ws.lastRun.toLocaleTimeString("pl-PL")}
                  </code>
                )}
              </div>
            ))
          ) : (
            <p className="muted">
              Kliknij "Refresh" aby załadować statusy workflow'ów
            </p>
          )}
        </div>
      </section>

      {/* ─ Documentation ─ */}
      <section className="card">
        <h3 style={{ marginBottom: 8 }}>📚 Dokumentacja API</h3>
        <p className="muted">
          Endpoint: <code>{workflowEndpoint}</code>
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              background: "rgba(100,116,139,0.15)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <strong>GET /</strong>
            <p>Lista workflow'ów z przykładowymi payload'ami</p>
          </div>
          <div
            style={{
              padding: 12,
              background: "rgba(100,116,139,0.15)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <strong>POST /trigger/:name</strong>
            <p>
              Uruchomienie workflow'u (chat, image, moa, replicate, schedule)
            </p>
          </div>
          <div
            style={{
              padding: 12,
              background: "rgba(100,116,139,0.15)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <strong>GET /status/:id</strong>
            <p>Status konkretnej instancji workflow'u (durable execution ID)</p>
          </div>
          <div
            style={{
              padding: 12,
              background: "rgba(100,116,139,0.15)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <strong>CF Dashboard Trigger</strong>
            <p>Uruchamia workflow z {"{}"} (pustych parametrów)</p>
          </div>
        </div>
      </section>
    </div>
  );
}
