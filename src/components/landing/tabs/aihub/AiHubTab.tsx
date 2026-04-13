// @ts-nocheck
import type { AiHubTabProps } from "./types";

export function AiHubTab({
  aiProvidersStatus,
  aiHubProvider,
  setAiHubProvider,
  aiHubHistory,
  aiHubLoading,
  aiHubPrompt,
  setAiHubPrompt,
  handleAiHubChat,
  handleStreamChat,
  jimboOnline,
  streamContent,
  toolEvents,
  setTab,
  setQueueName,
  setQueueAction,
}: AiHubTabProps) {
  return (
    <div className="tab-content">
      <h2>
        🤖 AI Chat — Centrum Sztucznej Inteligencji{" "}
        <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Czat z wieloma providerami AI, generowanie treści, obrazów i
        transkrypcji przez kolejki
      </p>

      {/* Provider Status */}
      <section className="card">
        <h3>📡 Dostępne Providery AI</h3>
        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          {[
            {
              name: "DeepSeek",
              key: "deepseek",
              icon: "🧠",
              desc: "R1 — najtańszy, szybki",
            },
            {
              name: "OpenRouter",
              key: "openrouter",
              icon: "🌐",
              desc: "8 modeli — fallback",
            },
            {
              name: "Anthropic",
              key: "anthropic",
              icon: "🔮",
              desc: "Claude — premium",
            },
            {
              name: "Workers AI",
              key: "workers-ai",
              icon: "⚡",
              desc: "Gemma 7b-it — darmowy (PL)",
            },
          ].map((p) => {
            const s = aiProvidersStatus.find((x) => x.name === p.key);
            return (
              <div
                key={p.key}
                className="stat-card"
                style={{
                  cursor: "pointer",
                  border:
                    aiHubProvider === p.key
                      ? "1px solid #60a5fa"
                      : "1px solid transparent",
                }}
                onClick={() => setAiHubProvider(p.key)}
              >
                <span className="stat-label">
                  {p.icon} {p.name}
                </span>
                <span className="stat-value" style={{ fontSize: 13 }}>
                  {p.desc}
                </span>
                <span
                  className={`dot ${s?.status === "online" ? "online" : "checking"}`}
                  style={{ marginTop: 4 }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Chat */}
      <section className="card">
        <h3>💬 AI Chat — {aiHubProvider.toUpperCase()}</h3>
        <div
          className="chatbox-messages"
          style={{
            maxHeight: 400,
            overflowY: "auto",
            marginBottom: 12,
            padding: "8px 0",
          }}
        >
          {aiHubHistory.length === 0 && (
            <p className="muted">Zacznij rozmowę — wpisz pytanie poniżej</p>
          )}
          {aiHubHistory.map((msg, i) => (
            <div
              key={i}
              className={`chat-msg chat-${msg.role === "user" ? "user" : "ai"}`}
              style={{ marginBottom: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span className="chat-role">
                  {msg.role === "user" ? "Ty" : "AI"}
                </span>
                <code style={{ fontSize: 10, opacity: 0.5 }}>
                  {msg.provider}
                </code>
                {msg.tokens && (
                  <span style={{ fontSize: 10, opacity: 0.5 }}>
                    ({msg.tokens} tokens)
                  </span>
                )}
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
            </div>
          ))}
          {aiHubLoading && (
            <div className="chat-msg chat-ai">
              <span className="chat-role">AI</span>
              <p className="chat-typing">Myślę...</p>
            </div>
          )}
        </div>
        <div className="input-row">
          <select
            value={aiHubProvider}
            onChange={(e) => setAiHubProvider(e.target.value)}
            style={{ maxWidth: 150 }}
          >
            <option value="deepseek">🧠 DeepSeek</option>
            <option value="openrouter">🌐 OpenRouter</option>
            <option value="anthropic">🔮 Anthropic</option>
            <option value="workers-ai">⚡ Workers AI</option>
          </select>
          <textarea
            value={aiHubPrompt}
            onChange={(e) => setAiHubPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAiHubChat();
              }
            }}
            placeholder="Zapytaj AI o cokolwiek..."
            rows={2}
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            onClick={() => handleStreamChat(aiHubPrompt)}
            disabled={aiHubLoading}
          >
            {aiHubLoading ? "..." : "➤"}
          </button>
        </div>
        {(toolEvents?.length > 0 || streamContent) && (
          <div style={{ marginTop: 10 }}>
            {toolEvents?.map((evt, i) => (
              <div key={i} className="status-row">
                {evt.tool?.includes("search")
                  ? `💡 Szukam: ${evt.result}`
                  : evt.tool?.includes("fetch") || evt.tool?.includes("url")
                    ? `🔗 Pobieram: ${evt.result}`
                    : `${evt.tool}: ${evt.result}`}
              </div>
            ))}
            {streamContent && (
              <div className="ai-output" style={{ marginTop: 8 }}>
                <pre>{streamContent}</pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quick Actions via Queues */}
      <section className="card">
        <h3>⚡ Szybkie Akcje AI (via Queues)</h3>
        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div
            className="stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setTab("queues");
              setQueueName("agent-tasks");
              setQueueAction("summarize");
            }}
          >
            <span className="stat-label">📝 Podsumuj tekst</span>
            <span className="stat-value" style={{ fontSize: 12 }}>
              Agent Tasks → Summarize
            </span>
          </div>
          <div
            className="stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setTab("queues");
              setQueueName("agent-tasks");
              setQueueAction("translate");
            }}
          >
            <span className="stat-label">🌍 Przetłumacz</span>
            <span className="stat-value" style={{ fontSize: 12 }}>
              Agent Tasks → Translate
            </span>
          </div>
          <div
            className="stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setTab("queues");
              setQueueName("image-gen");
            }}
          >
            <span className="stat-label">🖼️ Generuj obraz</span>
            <span className="stat-value" style={{ fontSize: 12 }}>
              SD-XL Lightning
            </span>
          </div>
          <div
            className="stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setTab("queues");
              setQueueName("voice");
            }}
          >
            <span className="stat-label">🎙️ Transkrypcja audio</span>
            <span className="stat-value" style={{ fontSize: 12 }}>
              Whisper STT
            </span>
          </div>
        </div>
      </section>

      {/* AI Tools Overview */}
      <section className="card">
        <h3>🛠️ Narzędzia AI w ZENO</h3>
        <div className="status-list">
          <div className="status-row">
            <span className="dot online" />
            <span className="name">AI Chat (Overview)</span>
            <code>/api/ai/chat</code>
          </div>
          <div className="status-row">
            <span className="dot online" />
            <span className="name">Content Generator (CMS)</span>
            <code>/api/content/generate</code>
          </div>
          <div className="status-row">
            <span className="dot online" />
            <span className="name">MOA Pipeline</span>
            <code>/api/moa/generate</code>
          </div>
          <div className="status-row">
            <span className="dot online" />
            <span className="name">Image Generation</span>
            <code>/api/images/generate</code>
          </div>
          <div className="status-row">
            <span className="dot online" />
            <span className="name">Browser AI Extract</span>
            <code>/api/render/json</code>
          </div>
          <div className="status-row">
            <span className="dot online" />
            <span className="name">Queue Consumer (AI)</span>
            <code>zeno-queue-consumer.workers.dev</code>
          </div>
        </div>
      </section>
    </div>
  );
}
