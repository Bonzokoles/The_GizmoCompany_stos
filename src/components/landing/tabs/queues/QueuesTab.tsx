// @ts-nocheck
import type { QueuesTabProps } from "./types";

export function QueuesTab({
  loadConsumerHealth,
  loadRecentResults,
  consumerHealth,
  queueName,
  setQueueName,
  queueAction,
  setQueueAction,
  queuePrompt,
  setQueuePrompt,
  handleQueueSend,
  queueLoading,
  queueResult,
  queueTaskId,
  setQueueTaskId,
  handleQueueLookup,
  queueLookupResult,
  recentResults,
  jimboOnline,
  jimboResponse,
  queueList,
  messagePayload,
  setMessagePayload,
  handleSendMessage,
  handleQueueStats,
}: QueuesTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          📨 Cloudflare Queues{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="tab-actions">
          <button
            className="btn-sm"
            onClick={() => {
              loadConsumerHealth();
              loadRecentResults();
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Queue Bindings Status */}
      <section className="card">
        <h3>🏥 Queue Bindings Status</h3>
        {consumerHealth ? (
          <>
            <div
              className="dashboard-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                marginBottom: 16,
              }}
            >
              <div className="stat-card">
                <span className="stat-label">Status</span>
                <span
                  className="stat-value"
                  style={{
                    color: consumerHealth.ok ? "#4ade80" : "#f87171",
                  }}
                >
                  {consumerHealth.ok ? "✅ Bindings OK" : "⚠️ Niedostępne"}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Dostępne kolejki</span>
                <span className="stat-value">
                  {consumerHealth.queues?.length ?? 0} /{" "}
                  {consumerHealth.total ?? 4}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">CF API Metrics</span>
                <span className="stat-value">
                  {consumerHealth.cfApiConfigured
                    ? "✅ Skonfigurowane"
                    : "—  brak tokenu"}
                </span>
              </div>
            </div>
            {consumerHealth.bindings && (
              <div className="status-list">
                {Object.entries(
                  consumerHealth.bindings as Record<
                    string,
                    { binding: string; available: boolean }
                  >,
                ).map(([name, info]) => (
                  <div key={name} className="status-row">
                    <span
                      className={`dot ${info.available ? "online" : "offline"}`}
                    />
                    <span className="name">{name}</span>
                    <code style={{ fontSize: 11, opacity: 0.6 }}>
                      {info.binding}
                    </code>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        color: info.available ? "#4ade80" : "#f87171",
                      }}
                    >
                      {info.available ? "available" : "unavailable"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {consumerHealth.metrics?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8, opacity: 0.7 }}>
                  CF Metrics
                </h4>
                {consumerHealth.metrics.map((m: any) => (
                  <div key={m.queue_id} className="status-row">
                    <span className="name">{m.queue_name}</span>
                    <span>ready: {m.messages_ready}</span>
                    <span>delayed: {m.messages_delayed}</span>
                    <span>consumers: {m.consumers_total}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="muted">Sprawdzam binding-i kolejek...</p>
        )}
      </section>

      {/* Send Task */}
      <section className="card">
        <h3>📤 Wyślij zadanie do kolejki</h3>
        <div className="form-grid">
          {queueList?.length > 0 && (
            <div className="form-group full-width">
              <label>Dostępne kolejki</label>
              <div className="mini-stats">
                {queueList.map((q: any, i: number) => (
                  <span key={i}>{q.name || q}</span>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Queue</label>
            <select
              value={queueName}
              onChange={(e) => setQueueName(e.target.value)}
            >
              <option value="agent-tasks">🤖 Agent Tasks (AI text)</option>
              <option value="image-gen">🖼️ Image Generation</option>
              <option value="image-proc">👁️ Image Analysis</option>
              <option value="voice">🎙️ Voice Processing</option>
            </select>
          </div>
          {queueName === "agent-tasks" && (
            <div className="form-group">
              <label>Action</label>
              <select
                value={queueAction}
                onChange={(e) => setQueueAction(e.target.value)}
              >
                <option value="summarize">Summarize</option>
                <option value="translate">Translate</option>
                <option value="analyze">Analyze</option>
                <option value="generate">Generate</option>
              </select>
            </div>
          )}
          <div className="form-group full-width">
            <label>
              {queueName === "voice"
                ? "Audio URL"
                : queueName === "image-proc"
                  ? "Image URL"
                  : "Prompt / Input"}
            </label>
            <textarea
              value={queuePrompt}
              onChange={(e) => setQueuePrompt(e.target.value)}
              placeholder={
                queueName === "voice"
                  ? "https://example.com/audio.mp3"
                  : queueName === "image-proc"
                    ? "https://example.com/image.jpg"
                    : "Opisz co ma zrobić AI..."
              }
              rows={3}
            />
          </div>
          <div className="form-group full-width">
            <label>Payload helper</label>
            <textarea
              value={messagePayload}
              onChange={(e) => setMessagePayload(e.target.value)}
              rows={2}
              placeholder='{"key":"value"}'
            />
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleQueueSend}
              disabled={queueLoading}
            >
              {queueLoading ? "Wysyłam..." : "📤 Wyślij"}
            </button>
            <button
              className="btn-sm"
              onClick={() =>
                handleSendMessage(queueName, messagePayload || queuePrompt)
              }
              style={{ marginTop: 8 }}
            >
              Wyślij custom
            </button>
            <button
              className="btn-sm btn-accent"
              onClick={() => handleQueueStats(queueName)}
              style={{ marginTop: 8 }}
            >
              Pomoc z payloadem
            </button>
          </div>
        </div>
        {queueResult && (
          <div className="ai-output" style={{ marginTop: 16 }}>
            <h4>{queueResult.ok ? "✅ Wysłano!" : "❌ Błąd"}</h4>
            <pre>{JSON.stringify(queueResult, null, 2)}</pre>
          </div>
        )}
        {jimboResponse && (
          <div className="ai-output" style={{ marginTop: 12 }}>
            <pre>{jimboResponse}</pre>
          </div>
        )}
      </section>

      {/* Lookup Result */}
      <section className="card">
        <h3>🔍 Szukaj wyniku (Task ID)</h3>
        <div className="input-row">
          <input
            type="text"
            value={queueTaskId}
            onChange={(e) => setQueueTaskId(e.target.value)}
            placeholder="Wklej taskId z odpowiedzi..."
          />
          <button onClick={handleQueueLookup}>Szukaj</button>
        </div>
        {queueLookupResult && (
          <div className="ai-output" style={{ marginTop: 12 }}>
            <pre>{JSON.stringify(queueLookupResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section className="card">
        <h3>📋 Ostatnie wyniki</h3>
        {recentResults.length > 0 ? (
          <div className="status-list">
            {recentResults.map((r, i) => (
              <div
                key={i}
                className="status-row"
                style={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <span
                    className={`dot ${r.status === "completed" ? "online" : r.status === "error" ? "offline" : "checking"}`}
                  />
                  <strong>{r.queue || r.type}</strong>
                  <code style={{ fontSize: 11, opacity: 0.6 }}>
                    {r.task_id?.slice(0, 20)}...
                  </code>
                  <span className="muted" style={{ marginLeft: "auto" }}>
                    {r.provider || ""}
                  </span>
                </div>
                {r.result && (
                  <pre
                    style={{
                      fontSize: 12,
                      maxHeight: 100,
                      overflow: "auto",
                      width: "100%",
                      margin: 0,
                      opacity: 0.8,
                    }}
                  >
                    {typeof r.result === "string"
                      ? r.result.slice(0, 200)
                      : JSON.stringify(r.result, null, 2).slice(0, 200)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Brak wyników. Wyślij zadanie lub kliknij Refresh.
          </p>
        )}
      </section>
    </div>
  );
}
