/**
 * BUCH_CHAT — Floating Chat Widget
 * Replaces the broken CopilotKit trigger.
 * Backed by the existing /api/ai/chat endpoint.
 * Offers a quick-open panel + link to the full AssistantPage tab.
 *
 * PAGE AGENT — floating 🤖 button obok BUCH_CHAT.
 * Używa /api/ai/v1/chat/completions (OpenAI-compatible proxy, CF Functions).
 * Model: deepseek-chat, system prompt po polsku.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { PageAgent } from "page-agent";

// Vite proxy (/api → localhost:8788) obsługuje dev i Electron webview.
// Na CF Pages ścieżki relatywne działają bezpośrednio.
const API_BASE = "";

interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  result: string;
}

interface AgentToolEvent {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  status: "calling" | "done" | "error";
}

interface Message {
  role: "user" | "assistant";
  text: string;
  provider: string;
  tokens?: number;
  ts: number;
  streaming?: boolean;
  toolTrace?: ToolCall[];
  agentTrace?: AgentToolEvent[];
}

type GooseStatus = "idle" | "running" | "done" | "error";

// Wykrywa "⚡ Wyślij do Goose: instrukcja" lub samo "⚡ instrukcja" w odpowiedzi JIMBO
const GOOSE_RE = /⚡\s*(?:Wyślij do Goose[:\s]+)?(.+?)(?:\n|$)/i;

// Rozszerzona flaga dla wiadomości live-buffer Goose (streaming chunks)
const GOOSE_LIVE_PROVIDER = "goose-live";

interface BuchChatWidgetProps {
  /** Called when user clicks "Open Full Assistant" → parent switches to 'assistant' tab */
  onOpenFull?: () => void;
}

const HISTORY_KEY = "buch-widget-history";
const PROVIDER_KEY = "buch-widget-provider";
const TOOLS_KEY = "buch-widget-tools";
const STREAMING_KEY = "buch-widget-streaming";
const AGENT_KEY = "buch-widget-agent";

// ── Image helpers ──────────────────────────────────────────────────────────

const IMG_URL_RE = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?/gi;
const IMG_B64_RE = /data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*/g;

function extractImages(text: string): { url: string; isBase64: boolean }[] {
  const out: { url: string; isBase64: boolean }[] = [];
  let m: RegExpExecArray | null;
  IMG_B64_RE.lastIndex = 0;
  while ((m = IMG_B64_RE.exec(text)) !== null)
    out.push({ url: m[0], isBase64: true });
  IMG_URL_RE.lastIndex = 0;
  while ((m = IMG_URL_RE.exec(text)) !== null)
    out.push({ url: m[0], isBase64: false });
  return out;
}

function MessageContent({
  text,
  streaming,
  toolTrace,
}: {
  text: string;
  streaming?: boolean;
  toolTrace?: ToolCall[];
}) {
  const inlineImages = extractImages(text);
  const traceImages = (toolTrace ?? []).flatMap((t) => extractImages(t.result));
  const allImages = [...inlineImages, ...traceImages];

  // Usuń adresy obrazów z wyświetlanego tekstu
  const cleanText = text.replace(IMG_B64_RE, "").replace(IMG_URL_RE, "").trim();

  return (
    <>
      {(cleanText || streaming) && (
        <p className="buch-msg-text">
          {cleanText}
          {streaming ? <span className="buch-typing">▋</span> : null}
        </p>
      )}
      {allImages.map((img, i) => (
        <div key={i} className="buch-msg-image">
          <img
            src={img.url}
            alt="AI image"
            className="buch-img-preview"
            style={{ maxWidth: "100%", borderRadius: 6, marginTop: 4 }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {img.isBase64 ? (
              <a
                href={img.url}
                download="ai-image.png"
                className="buch-img-btn"
              >
                ⬇ Zapisz PNG
              </a>
            ) : (
              <a
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="buch-img-btn"
              >
                ↗ Otwórz
              </a>
            )}
            <button
              className="buch-img-btn"
              onClick={() => {
                fetch(img.url)
                  .then((r) => r.blob())
                  .then((blob) => {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `ai-image-${Date.now()}.png`;
                    a.click();
                  })
                  .catch(() => window.open(img.url, "_blank"));
              }}
            >
              ⬇ Pobierz
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Agent Tool Trace Block ───────────────────────────────────────────────────

function AgentTraceBlock({ events }: { events: AgentToolEvent[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  if (!events.length) return null;
  return (
    <div className="buch-agent-trace">
      {events.map((ev, i) => (
        <div
          key={i}
          className={`buch-agent-tool buch-agent-tool-${ev.status}`}
        >
          <button
            className="buch-agent-tool-hdr"
            onClick={() => setExpanded((s) => ({ ...s, [i]: !s[i] }))}
          >
            <span className="buch-agent-tool-icon">
              {ev.status === "calling" ? "⏳" : ev.status === "error" ? "⚠" : "✓"}
            </span>
            <code className="buch-agent-tool-name">{ev.tool}</code>
            <span className="buch-agent-tool-toggle">{expanded[i] ? "▲" : "▼"}</span>
          </button>
          {expanded[i] && (
            <div className="buch-agent-tool-body">
              <div className="buch-agent-tool-section">
                <span className="buch-agent-tool-label">Wejście:</span>
                <pre className="buch-agent-tool-pre">
                  {JSON.stringify(ev.input, null, 2)}
                </pre>
              </div>
              {ev.output != null && (
                <div className="buch-agent-tool-section">
                  <span className="buch-agent-tool-label">Wyjście:</span>
                  <pre className="buch-agent-tool-pre">{ev.output.slice(0, 800)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  return (
    m.includes("Failed to fetch") ||
    m.includes("NetworkError") ||
    m.includes("ERR_CONNECTION_REFUSED") ||
    m.includes("ERR_FAILED") ||
    m.includes("net::") ||
    m.includes("ECONNREFUSED") ||
    m.includes("Load failed")
  );
}

function parseSSEToken(line: string): string {
  if (!line.startsWith("data: ")) return "";
  const raw = line.slice(6).trim();
  if (raw === "[DONE]") return "";
  try {
    const parsed = JSON.parse(raw);
    const oaiToken = parsed?.choices?.[0]?.delta?.content;
    if (typeof oaiToken === "string") return oaiToken;
    if (
      parsed?.type === "content_block_delta" &&
      parsed?.delta?.type === "text_delta"
    ) {
      return parsed.delta.text ?? "";
    }
    // JIMBO Agent HUB format: { text: "..." }
    if (typeof parsed?.text === "string") return parsed.text;
  } catch {
    /* ignore */
  }
  return "";
}

export function BuchChatWidget({ onOpenFull }: BuchChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<string>(
    () => localStorage.getItem(PROVIDER_KEY) ?? "agent-hub",
  );
  const [history, setHistory] = useState<Message[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [useTools, setUseTools] = useState(
    () => localStorage.getItem(TOOLS_KEY) === "true",
  );
  const [useStreaming, setUseStreaming] = useState(
    () => localStorage.getItem(STREAMING_KEY) !== "false",
  );
  const [gooseStatuses, setGooseStatuses] = useState<
    Record<number, GooseStatus>
  >({});
  const [useAgent, setUseAgent] = useState(
    () => localStorage.getItem(AGENT_KEY) === "true",
  );
  const [cfOnline, setCfOnline] = useState<boolean | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageAgentRef = useRef<PageAgent | null>(null);
  const [agentReady, setAgentReady] = useState(false);

  /* page-agent init */
  useEffect(() => {
    if (pageAgentRef.current) return;
    const agent = new PageAgent({
      baseURL: `${API_BASE}/api/ai/v1`,
      model: "deepseek-chat",
      language: "en-US",
      customFetch: (url: string | URL | Request, init?: RequestInit) =>
        fetch(url, { ...init, credentials: "same-origin" }),
      instructions: {
        system:
          "Jesteś asystentem przeglądarki ZENO. Odpowiadasz po polsku. Pomagasz użytkownikowi nawigować po stronie, klikać elementy, wypełniać formularze i obsługiwać interfejs.",
        getPageInstructions: (url: string) =>
          `Aktualny URL: ${url}. Nawiguj po stronie i pomagaj użytkownikowi w obsłudze interfejsu ZENO.`,
      },
    });
    pageAgentRef.current = agent;
    setAgentReady(true);
    return () => {
      pageAgentRef.current = null;
      setAgentReady(false);
    };
  }, []);

  const togglePageAgent = useCallback(() => {
    try {
      pageAgentRef.current?.panel.show();
    } catch {
      /* panel already visible */
    }
  }, []);

  /* tools i streaming są wzajemnie wykluczające — tools wygrywa */
  useEffect(() => {
    if (useTools && useStreaming) setUseStreaming(false);
  }, [useTools]);
  /* agent mode wyklucza tools i streaming */
  useEffect(() => {
    if (useAgent) { setUseTools(false); setUseStreaming(false); }
  }, [useAgent]);

  /* persist */
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-80)));
  }, [history]);
  useEffect(() => {
    localStorage.setItem(PROVIDER_KEY, provider);
  }, [provider]);
  useEffect(() => {
    localStorage.setItem(TOOLS_KEY, String(useTools));
  }, [useTools]);
  useEffect(() => {
    localStorage.setItem(STREAMING_KEY, String(useStreaming));
  }, [useStreaming]);
  useEffect(() => {
    localStorage.setItem(AGENT_KEY, String(useAgent));
  }, [useAgent]);

  /* CF API status ping */
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/ai/status`, { signal: AbortSignal.timeout(3000) })
      .then((r) => { if (!cancelled) setCfOnline(r.ok); })
      .catch(() => { if (!cancelled) setCfOnline(false); });
    return () => { cancelled = true; };
  }, []);

  /* scroll to bottom */
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, open, loading]);

  /* focus on open */
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const dispatchToGoose = useCallback(
    async (msgIdx: number, instructions: string) => {
      setGooseStatuses((s) => ({ ...s, [msgIdx]: "running" }));

      // Dodaj live-buffer wiadomość — będzie się wypełniać chunkami z Goose
      const bufferTs = Date.now() + Math.random(); // unikalny klucz
      setHistory((h) => [
        ...h,
        {
          role: "assistant" as const,
          text: "",
          provider: GOOSE_LIVE_PROVIDER,
          ts: bufferTs,
          streaming: true,
        },
      ]);

      const updateBuffer = (append: string) =>
        setHistory((h) =>
          h.map((m) =>
            m.ts === bufferTs && m.provider === GOOSE_LIVE_PROVIDER
              ? { ...m, text: m.text + append }
              : m,
          ),
        );

      const finalizeBuffer = (finalText: string, providerName = "goose") =>
        setHistory((h) =>
          h.map((m) =>
            m.ts === bufferTs && m.provider === GOOSE_LIVE_PROVIDER
              ? { ...m, text: finalText, provider: providerName, streaming: false }
              : m,
          ),
        );

      try {
        const res = await fetch("http://localhost:4224/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions }),
        });
        if (!res.ok) {
          finalizeBuffer("⚠ HUB niedostępny lub błąd wysyłania zadania.", "goose-error");
          setGooseStatuses((s) => ({ ...s, [msgIdx]: "error" }));
          return;
        }
        const data = (await res.json()) as { taskId?: string };
        const taskId = data.taskId;
        if (!taskId) {
          finalizeBuffer("⚠ Brak taskId w odpowiedzi HUB.", "goose-error");
          setGooseStatuses((s) => ({ ...s, [msgIdx]: "done" }));
          return;
        }

        // WebSocket — subskrypcja na eventy Goose
        const ws = new WebSocket("ws://localhost:4224/ws");
        let synthTimer: ReturnType<typeof setTimeout> | null = null;
        let synthReceived = false;

        const finish = (status: GooseStatus) => {
          if (synthTimer) clearTimeout(synthTimer);
          setGooseStatuses((s) => ({ ...s, [msgIdx]: status }));
          if (ws.readyState === WebSocket.OPEN) ws.close();
        };

        ws.onopen = () => {
          ws.send(JSON.stringify({ action: "subscribe", taskId }));
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string) as {
              type: string;
              text?: string;
              content?: string;
              error?: string;
              isStderr?: boolean;
              verdict?: string;
              score?: number;
              reflection?: string;
              improvement?: string;
              retryNum?: number;
              maxRetries?: number;
              reason?: string;
            };

            if (msg.type === "chunk" && msg.text && !msg.isStderr) {
              // Live streaming output — dołącz do buffera
              updateBuffer(msg.text);

            } else if (msg.type === "reflexion" && msg.verdict) {
              // Ocena jakości Goose — pokaż jako meta-wiadomość
              const score = typeof msg.score === "number"
                ? msg.score.toFixed(2)
                : "?";
              const icon = msg.verdict === "success" ? "✓" : msg.verdict === "partial" ? "⚠" : "✗";
              const reflexionText = [
                `${icon} Ocena: ${msg.verdict} · ${score}/1.0`,
                msg.reflection ? `📝 ${msg.reflection}` : "",
                msg.improvement ? `💡 ${msg.improvement}` : "",
              ].filter(Boolean).join("\n");
              setHistory((h) => [
                ...h,
                {
                  role: "assistant" as const,
                  text: reflexionText,
                  provider: "reflexion",
                  ts: Date.now(),
                },
              ]);

            } else if (msg.type === "retry") {
              // Auto-retry — poinformuj użytkownika i wyczyść buffer
              setHistory((h) => [
                ...h,
                {
                  role: "assistant" as const,
                  text: `🔄 Auto-retry ${msg.retryNum ?? "?"}/${msg.maxRetries ?? "?"}: ${msg.reason ?? "poprzednia próba niekompletna"}`,
                  provider: "goose-retry",
                  ts: Date.now(),
                },
              ]);
              // Nowy live-buffer dla retry (stary buffer zamrażamy jako archiwum)
              setHistory((h) =>
                h.map((m) =>
                  m.ts === bufferTs && m.provider === GOOSE_LIVE_PROVIDER
                    ? { ...m, streaming: false, provider: "goose-archive" }
                    : m,
                ),
              );

            } else if (msg.type === "goose:synthesis" && msg.content?.trim()) {
              // Synthesis — zastąp buffer finalną wiadomością
              synthReceived = true;
              finalizeBuffer(`[Goose] ${msg.content}`, "goose");
              finish("done");

            } else if (msg.type === "done") {
              // Czekamy max 20s na synthesis
              synthTimer = setTimeout(() => {
                if (!synthReceived) {
                  // Brak synthesis — buffer zostaje jako surowy output
                  setHistory((h) =>
                    h.map((m) =>
                      m.ts === bufferTs && m.provider === GOOSE_LIVE_PROVIDER
                        ? { ...m, streaming: false, provider: "goose" }
                        : m,
                    ),
                  );
                }
                finish("done");
              }, 20_000);

            } else if (msg.type === "error") {
              updateBuffer("\n⚠ Błąd wykonania zadania.");
              setHistory((h) =>
                h.map((m) =>
                  m.ts === bufferTs && m.provider === GOOSE_LIVE_PROVIDER
                    ? { ...m, streaming: false }
                    : m,
                ),
              );
              finish("error");
            }
          } catch { /* ignore malformed WS messages */ }
        };

        ws.onerror = () => {
          finalizeBuffer("⚠ Błąd WebSocket — brak połączenia z HUB.", "goose-error");
          finish("error");
        };

        // Globalny timeout: 5 minut
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            setHistory((h) =>
              h.map((m) =>
                m.ts === bufferTs && m.provider === GOOSE_LIVE_PROVIDER
                  ? { ...m, streaming: false, provider: "goose" }
                  : m,
              ),
            );
            finish("done");
          }
        }, 5 * 60_000);

      } catch {
        finalizeBuffer("⚠ Nie można połączyć z HUB (localhost:4224).", "goose-error");
        setGooseStatuses((s) => ({ ...s, [msgIdx]: "error" }));
      }
    },
    [],
  );

  // Pobiera ostatnie wpisy changelog z HUB i dodaje do historii
  const showChangelog = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:4224/agent/changelog");
      if (!res.ok) throw new Error(`${res.status}`);
      const entries = (await res.json()) as Array<{
        ts: number;
        instruction: string;
        summary: string;
        taskId: string;
      }>;
      if (!entries.length) {
        setHistory((h) => [
          ...h,
          { role: "assistant" as const, text: "📋 Changelog pusty — Goose jeszcze nic nie zmienił.", provider: "system", ts: Date.now() },
        ]);
        return;
      }
      const lines = entries
        .slice(0, 10)
        .map((e, i) => {
          const d = new Date(e.ts).toLocaleString("pl-PL");
          return `${i + 1}. [${d}]\n   📌 ${e.instruction.slice(0, 60)}\n   ✅ ${e.summary.slice(0, 120)}`;
        })
        .join("\n\n");
      setHistory((h) => [
        ...h,
        { role: "assistant" as const, text: `📋 Ostatnie zmiany Goose:\n\n${lines}`, provider: "system", ts: Date.now() },
      ]);
    } catch {
      setHistory((h) => [
        ...h,
        { role: "assistant" as const, text: "⚠ Nie można pobrać changelog (HUB offline?)", provider: "system", ts: Date.now() },
      ]);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    // /goose <instrukcja> — bezpośredni dispatch do Goose (bez JIMBO chat)
    if (/^\/g(?:oose)?\s+/i.test(text)) {
      const instruction = text.replace(/^\/g(?:oose)?\s+/i, "").trim();
      if (!instruction) return;
      setPrompt("");
      const msgIdx = history.length;
      setHistory((h) => [...h, { role: "user", text, provider: "user", ts: Date.now() }]);
      setLoading(true);
      await dispatchToGoose(msgIdx, instruction);
      setLoading(false);
      return;
    }

    setPrompt("");
    setHistory((h) => [...h, { role: "user", text, provider, ts: Date.now() }]);
    setLoading(true);

    const basePayload = { prompt: text, provider, maxTokens: 2048 };

    try {
      /* PATH AGENT: BUCH_AGENT mode — agentic loop z tool calling */
      if (useAgent && provider === "agent-hub") {
        const agentMessages = [
          ...history.slice(-20).map((m) => ({ role: m.role, content: m.text })),
          { role: "user" as const, content: text },
        ];

        // Placeholder wiadomości z live trace
        const agentTs = Date.now();
        setHistory((h) => [
          ...h,
          {
            role: "assistant" as const,
            text: "",
            provider: "buch-agent",
            ts: agentTs,
            streaming: true,
            agentTrace: [],
          },
        ]);

        const updateAgent = (
          updater: (msg: Message) => Message,
        ) =>
          setHistory((h) =>
            h.map((m) => (m.ts === agentTs ? updater(m) : m)),
          );

        try {
          const res = await fetch("http://localhost:4224/chat/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: agentMessages }),
          });
          if (!res.ok || !res.body)
            throw new Error(`Agent error ${res.status}`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let finalText = "";

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") break;
              try {
                const ev = JSON.parse(raw) as {
                  type: string;
                  tool?: string;
                  input?: Record<string, unknown>;
                  output?: string;
                  text?: string;
                  message?: string;
                };
                if (ev.type === "tool_call") {
                  updateAgent((m) => ({
                    ...m,
                    agentTrace: [
                      ...(m.agentTrace ?? []),
                      {
                        tool: ev.tool ?? "",
                        input: ev.input ?? {},
                        status: "calling" as const,
                      },
                    ],
                  }));
                } else if (ev.type === "tool_result") {
                  updateAgent((m) => {
                    const trace = [...(m.agentTrace ?? [])];
                    const idx = [...trace].reverse().findIndex(
                      (t) => t.tool === ev.tool && t.status === "calling",
                    );
                    if (idx !== -1) {
                      const realIdx = trace.length - 1 - idx;
                      const isError = (ev.output ?? "").startsWith("ERROR:");
                      trace[realIdx] = {
                        ...trace[realIdx],
                        output: ev.output,
                        status: isError ? "error" : "done",
                      };
                    }
                    return { ...m, agentTrace: trace };
                  });
                } else if (ev.type === "token" && ev.text) {
                  finalText += ev.text;
                  updateAgent((m) => ({ ...m, text: finalText }));
                } else if (ev.type === "error") {
                  finalText = `⚠ Agent error: ${ev.message ?? "nieznany błąd"}`;
                  updateAgent((m) => ({ ...m, text: finalText }));
                }
              } catch { /* ignore bad JSON */ }
            }
          }
        } catch (agentErr) {
          if (isNetworkError(agentErr)) {
            updateAgent((m) => ({
              ...m,
              text: "⚠ BUCH_AGENT niedostępny (HUB offline). Przełącz na inny tryb lub uruchom start_zeno_hub.bat.",
            }));
          } else {
            throw agentErr;
          }
        } finally {
          updateAgent((m) => ({ ...m, streaming: false }));
        }
        return;
      }

      /* PATH 0: JIMBO Agent HUB (localhost:4224) */
      if (provider === "agent-hub") {
        const hubMessages = [
          ...history.slice(-20).map((m) => ({ role: m.role, content: m.text })),
          { role: "user" as const, content: text },
        ];
        let agentStreamStarted = false;
        try {
          if (useStreaming && !useTools) {
            agentStreamStarted = true;
            setHistory((h) => [
              ...h,
              {
                role: "assistant",
                text: "",
                provider: "agent-hub",
                ts: Date.now(),
                streaming: true,
              },
            ]);
            const res = await fetch("http://localhost:4224/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages: hubMessages, stream: true }),
            });
            if (!res.ok || !res.body)
              throw new Error(`Agent HUB error ${res.status}`);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const chunk = parseSSEToken(line);
                if (!chunk) continue;
                setHistory((h) =>
                  h.map((m, i) =>
                    i === h.length - 1 && m.streaming
                      ? { ...m, text: m.text + chunk }
                      : m,
                  ),
                );
              }
            }
            setHistory((h) =>
              h.map((m, i) =>
                i === h.length - 1 && m.streaming
                  ? { ...m, streaming: false }
                  : m,
              ),
            );
          } else {
            const res = await fetch("http://localhost:4224/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages: hubMessages, stream: false }),
            });
            const data = (await res.json()) as {
              content?: string;
              model?: string;
              usage?: { total_tokens?: number };
            };
            setHistory((h) => [
              ...h,
              {
                role: "assistant",
                text: data?.content ?? "[Brak odpowiedzi]",
                provider: data?.model ?? "agent-hub",
                tokens: data?.usage?.total_tokens,
                ts: Date.now(),
              },
            ]);
          }
          return;
        } catch (hubErr) {
          if (!isNetworkError(hubErr)) throw hubErr;
          /* JIMbo HUB niedostępny (CF Pages / offline) → fallback do CF API */
          if (agentStreamStarted) {
            /* usuń cząstkową wiadomość streamującą */
            setHistory((h) => h.filter((m) => !m.streaming));
          }
          const fbRes = await fetch(`${API_BASE}/api/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: text,
              provider: "deepseek",
              maxTokens: 2048,
            }),
          });
          if (!fbRes.ok) throw new Error(`CF fallback error ${fbRes.status}`);
          const fbData = (await fbRes.json()) as {
            content?: string;
            provider?: string;
            usage?: { total_tokens?: number };
          };
          setHistory((h) => [
            ...h,
            {
              role: "assistant",
              text: fbData?.content ?? "[Brak odpowiedzi]",
              provider: `${fbData?.provider ?? "deepseek"} (CF↑)`,
              tokens: fbData?.usage?.total_tokens,
              ts: Date.now(),
            },
          ]);
          return;
        }
      }

      /* PATH 1: Tool use */
      if (useTools) {
        const res = await fetch(`${API_BASE}/api/ai/chat/tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        });
        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errData?.error || `Tools API error ${res.status}`);
        }
        const data = (await res.json()) as {
          content?: string;
          provider?: string;
          tokens?: { total?: number };
          toolTrace?: ToolCall[];
        };
        setHistory((h) => [
          ...h,
          {
            role: "assistant",
            text: data?.content ?? "[Brak odpowiedzi]",
            provider: data?.provider ?? provider,
            tokens: data?.tokens?.total,
            toolTrace: data?.toolTrace,
            ts: Date.now(),
          },
        ]);
        return;
      }

      /* PATH 2: Streaming SSE */
      if (useStreaming) {
        const msgId = `stream-${Date.now()}`;
        setHistory((h) => [
          ...h,
          {
            role: "assistant",
            text: "",
            provider,
            ts: Date.now(),
            streaming: true,
          },
        ]);

        const res = await fetch(`${API_BASE}/api/ai/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        });
        if (!res.ok || !res.body) throw new Error(`Stream error ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const chunk = parseSSEToken(line);
            if (!chunk) continue;
            setHistory((h) =>
              h.map((m, i) =>
                i === h.length - 1 && m.streaming
                  ? { ...m, text: m.text + chunk }
                  : m,
              ),
            );
          }
        }
        setHistory((h) =>
          h.map((m, i) =>
            i === h.length - 1 && m.streaming ? { ...m, streaming: false } : m,
          ),
        );
        void msgId;
        return;
      }

      /* PATH 3: Plain fetch */
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        throw new Error(
          errorData?.error?.message || `API error: ${res.status}`,
        );
      }

      const data = (await res.json()) as {
        content?: string;
        provider?: string;
        usage?: { total_tokens?: number };
      };
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: data?.content ?? "[Brak odpowiedzi]",
          provider: data?.provider ?? provider,
          tokens: data?.usage?.total_tokens,
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      console.error("BUCH_CHAT Error:", err);
      let errorMsg = "⚠ Błąd połączenia z API";
      if (err instanceof Error) {
        const m = err.message;
        if (
          m.includes("524") ||
          m.includes("timeout") ||
          m.toLowerCase().includes("time")
        )
          errorMsg =
            "⚠ Timeout — zapytanie trwało za długo (CF limit 30s). Spróbuj prostsze pytanie lub inny model.";
        else if (m.includes("503") || m.includes("No API key"))
          errorMsg =
            "⚠ Brak klucza API — sprawdź ustawienia providera w CF Pages → Secrets.";
        else if (
          m.includes("Failed to fetch") ||
          m.includes("NetworkError") ||
          m.includes("ERR_CONNECTION_REFUSED") ||
          m.includes("ERR_FAILED") ||
          m.includes("net::") ||
          m.includes("ECONNREFUSED")
        )
          errorMsg = "⚠ AI chwilowo niedostępne, spróbuj później.";
        else errorMsg = `⚠ ${m}`;
      } else if (typeof err === "string") {
        errorMsg = `⚠ ${err}`;
      }
      setHistory((h) => [
        ...h,
        { role: "assistant", text: errorMsg, provider, ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [prompt, provider, loading, useTools, useStreaming]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openFull = () => {
    setOpen(false);
    onOpenFull?.();
  };

  return (
    <>
      {/* ── Floating Panel ── */}
      {open && (
        <div
          className="buch-widget-panel"
          role="dialog"
          aria-label="BUCH_CHAT Assistant"
        >
          {/* Header */}
          <div className="buch-widget-hdr">
            <span className="buch-widget-brand">
              ◈ BUCH_CHAT
              <span
                className={`buch-status-dot${cfOnline === true ? " online" : cfOnline === false ? " offline" : ""}`}
                title={cfOnline === true ? "CF API online" : cfOnline === false ? "CF API offline" : "Sprawdzanie..."}
              />
            </span>
            <div className="buch-widget-hdr-actions">
              <select
                className="buch-widget-sel"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                aria-label="Provider AI"
              >
                <option value="deepseek">DeepSeek R1</option>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Claude</option>
                <option value="workers-ai">Workers AI</option>
                <option value="agent-hub">◈ Agent HUB</option>
              </select>
              <button
                className={`buch-widget-btn${useStreaming && !useTools ? " buch-btn-active" : ""}`}
                onClick={() => {
                  if (!useTools) setUseStreaming((v) => !v);
                }}
                title="Streaming SSE"
                aria-label="Streaming"
              >
                ~
              </button>
              <button
                className={`buch-widget-btn${useTools ? " buch-btn-active" : ""}`}
                onClick={() => { setUseTools((v) => !v); setUseAgent(false); }}
                title="Narzędzia webowe (Claude)"
                aria-label="Narzędzia"
              >
                ⚒
              </button>
              {provider === "agent-hub" && (
                <button
                  className={`buch-widget-btn${useAgent ? " buch-btn-active buch-btn-agent" : ""}`}
                  onClick={() => setUseAgent((v) => !v)}
                  title="BUCH_AGENT — orkiestrator z 15 narzędziami (pliki, R2, D1, Goose, Pi, search)"
                  aria-label="Agent"
                >
                  🔧
                </button>
              )}
              {onOpenFull && (
                <button
                  className="buch-widget-btn"
                  onClick={openFull}
                  title="Otwórz pełnego asystenta"
                  aria-label="Pełny asystent"
                >
                  ⊞
                </button>
              )}
              {provider === "agent-hub" && (
                <button
                  className="buch-widget-btn"
                  onClick={showChangelog}
                  title="Pokaż ostatnie zmiany Goose"
                  aria-label="Changelog"
                >
                  📋
                </button>
              )}
              <button
                className="buch-widget-btn"
                onClick={() => setOpen(false)}
                aria-label="Zamknij"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="buch-widget-msgs">
            {history.length === 0 && (
              <div className="buch-widget-empty">
                <p>Witaj — wpisz pytanie aby rozpocząć</p>
                {onOpenFull && (
                  <button className="buch-widget-link-btn" onClick={openFull}>
                    ⊞ Otwórz pełnego Asystenta z pamięcią i narzędziami →
                  </button>
                )}
              </div>
            )}
            {history.map((m, i) => (
              <div
                key={i}
                className={`buch-widget-msg buch-msg-${m.role}${
                  m.provider === "reflexion" ? " buch-msg-reflexion" :
                  m.provider === "goose-retry" ? " buch-msg-retry" :
                  m.provider === GOOSE_LIVE_PROVIDER ? " buch-msg-goose-live" : ""
                }`}
              >
                <div className="buch-msg-meta">
                  <span className="buch-msg-role">
                    {m.role === "user" ? "TY" :
                     m.provider === "reflexion" ? "📊" :
                     m.provider === "goose-retry" ? "🔄" :
                     m.provider === GOOSE_LIVE_PROVIDER ? "⚡" :
                     m.provider === "goose" ? "🦆" : "AI"}
                  </span>
                  <span className="buch-msg-prov">{m.provider}</span>
                  {m.tokens != null && (
                    <span className="buch-msg-tok">{m.tokens}t</span>
                  )}
                  {m.toolTrace && m.toolTrace.length > 0 && (
                    <span
                      className="buch-msg-tools"
                      title={m.toolTrace.map((t) => t.tool).join(", ")}
                    >
                      ⚒{m.toolTrace.length}
                    </span>
                  )}
                </div>
                {m.agentTrace && m.agentTrace.length > 0 && (
                  <AgentTraceBlock events={m.agentTrace} />
                )}
                <MessageContent
                  text={m.text}
                  streaming={m.streaming}
                  toolTrace={m.toolTrace}
                />
                {m.role === "assistant" &&
                  provider === "agent-hub" &&
                  !m.streaming &&
                  (() => {
                    const match = GOOSE_RE.exec(m.text);
                    if (!match) return null;
                    const status = gooseStatuses[i] ?? "idle";
                    return (
                      <div className="buch-goose-dispatch">
                        {status === "idle" && (
                          <button
                            className="buch-goose-btn"
                            onClick={() => dispatchToGoose(i, match[1].trim())}
                            title="Wyślij zadanie do Goose"
                          >
                            ⚡ Goose
                          </button>
                        )}
                        {status === "running" && (
                          <span className="buch-goose-status buch-goose-running">
                            ⚡ Goose: running…
                          </span>
                        )}
                        {status === "done" && (
                          <span className="buch-goose-status buch-goose-done">
                            ✓ Goose: gotowe
                          </span>
                        )}
                        {status === "error" && (
                          <span className="buch-goose-status buch-goose-error">
                            ⚠ Goose: błąd
                            <button
                              className="buch-goose-retry"
                              onClick={() =>
                                dispatchToGoose(i, match[1].trim())
                              }
                            >
                              ↺
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })()}
              </div>
            ))}
            {loading && !history.some((m) => m.streaming) && (
              <div className="buch-widget-msg buch-msg-assistant">
                <div className="buch-msg-meta">
                  <span className="buch-msg-role">AI</span>
                  {useTools && <span className="buch-msg-tools">⚒</span>}
                </div>
                <p className="buch-msg-text buch-typing">▋</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="buch-widget-footer">
            <div className="buch-widget-input-row">
              <textarea
                ref={textareaRef}
                className="buch-widget-textarea"
                placeholder="Pytanie… (Enter = wyślij, Shift+Enter = nowy wiersz)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                disabled={loading}
                aria-label="Wiadomość"
              />
              <button
                className="buch-widget-send"
                onClick={sendMessage}
                disabled={loading || !prompt.trim()}
                aria-label="Wyślij"
              >
                {loading ? "…" : "▶"}
              </button>
            </div>
            {history.length > 0 && (
              <button
                className="buch-widget-clear"
                onClick={() => setHistory([])}
              >
                ⌫ wyczyść historię
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Floating action bar (page-agent + BUCH_CHAT side by side) ── */}
      <div className="floating-actions">
        {agentReady && (
          <button
            className="chat-toggle page-agent-toggle"
            onClick={togglePageAgent}
            title="Page Agent — AI steruje stroną"
          >
            🤖 PAGE AGENT
          </button>
        )}
        <button
          className={`chat-toggle buch-toggle${open ? " buch-toggle-active" : ""}`}
          onClick={() => setOpen((o) => !o)}
          title={open ? "Zamknij BUCH_CHAT" : "Otwórz BUCH_CHAT"}
          aria-expanded={open}
          aria-controls="buch-widget-panel"
        >
          <span className="ct-dot" />
          BUCH_CHAT
        </button>
      </div>
    </>
  );
}
