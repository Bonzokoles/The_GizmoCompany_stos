import type { BizToolsTabProps, BizCategory } from "./types";
import { LoadingSpinner } from "../../../LoadingSpinner";

export function BizToolsTab({
  BIZTOOLS_CATALOG,
  bizSearch,
  setBizSearch,
  bizCategory,
  setBizCategory,
  BIZ_CATEGORIES,
  tavilyKey,
  setTavilyKey,
  tavilyQuery,
  setTavilyQuery,
  handleTavilySearch,
  tavilyLoading,
  tavilyError,
  tavilyResults,
  jimboOnline,
  activeTool,
  toolResult,
  toolHistory,
  toolEvents,
  toolLoading,
  handleRunTool,
}: BizToolsTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          💹 BizTools — Biblioteka Narzędzi Biznesowych{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Katalog {BIZTOOLS_CATALOG.length}+ narzędzi: trading, analytics,
          accounting, CRM, ERP, scraping, automation, APIs
        </p>
      </div>

      {/* ── Static Catalog ── */}
      <section className="card">
        <h3>📚 Katalog narzędzi</h3>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <input
              type="text"
              value={bizSearch}
              onChange={(e) => setBizSearch(e.target.value)}
              placeholder="Szukaj w katalogu..."
              style={{ width: "100%" }}
            />
          </div>
          <div className="form-group">
            <select
              value={bizCategory}
              onChange={(e) => setBizCategory(e.target.value as BizCategory)}
            >
              {BIZ_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "Wszystkie kategorie" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(() => {
          const filtered = BIZTOOLS_CATALOG.filter((t) => {
            const matchCat =
              bizCategory === "all" || t.category === bizCategory;
            const q = bizSearch.toLowerCase();
            const matchQ =
              !q ||
              t.name.toLowerCase().includes(q) ||
              t.desc.toLowerCase().includes(q);
            return matchCat && matchQ;
          });
          return (
            <>
              <p className="muted" style={{ marginBottom: 12 }}>
                {filtered.length} narzędzi
              </p>
              <div
                className="dashboard-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                }}
              >
                {filtered.map((tool) => (
                  <a
                    key={tool.name}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      className="stat-card"
                      style={{
                        cursor: "pointer",
                        userSelect: "none",
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>{tool.name}</strong>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {tool.free && (
                            <span
                              style={{
                                fontSize: 10,
                                background: "#4ade8033",
                                color: "#4ade80",
                                borderRadius: 4,
                                padding: "1px 5px",
                              }}
                            >
                              FREE
                            </span>
                          )}
                          {tool.open && (
                            <span
                              style={{
                                fontSize: 10,
                                background: "#60a5fa33",
                                color: "#60a5fa",
                                borderRadius: 4,
                                padding: "1px 5px",
                              }}
                            >
                              OSS
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          margin: "4px 0 6px",
                          lineHeight: 1.4,
                        }}
                      >
                        {tool.desc}
                      </p>
                      <code style={{ fontSize: 11, opacity: 0.5 }}>
                        {tool.category}
                      </code>
                    </div>
                  </a>
                ))}
              </div>
            </>
          );
        })()}
      </section>

      {/* ── Tavily Web Search ── */}
      <section className="card">
        <h3>🔍 Tavily Search — Wyszukaj nowe narzędzia w sieci</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Tavily to wyszukiwarka dla agentów AI — zwraca aktualne,
          ustrukturyzowane wyniki.
          {!tavilyKey && (
            <span style={{ color: "#fbbf24" }}>
              {" "}
              ⚠️ Potrzebny klucz API —{" "}
              <a
                href="https://tavily.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa" }}
              >
                uzyskaj bezpłatnie na tavily.com
              </a>
            </span>
          )}
        </p>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>🔑 Klucz API Tavily</label>
            <input
              type="password"
              value={tavilyKey}
              onChange={(e) => {
                setTavilyKey(e.target.value);
                try {
                  localStorage.setItem("zeno_tavily_key", e.target.value);
                } catch {
                  /* noop */
                }
              }}
              placeholder="tvly-xxxxxxxxxxxxxxxx"
              style={{ fontFamily: "monospace" }}
            />
          </div>
          <div className="form-group full-width">
            <label>Zapytanie</label>
            <input
              type="text"
              value={tavilyQuery}
              onChange={(e) => setTavilyQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTavilySearch()}
              placeholder="np. open source BI tools for small business 2025"
            />
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={() => handleTavilySearch()}
              disabled={
                tavilyLoading || !tavilyKey.trim() || !tavilyQuery.trim()
              }
            >
              {tavilyLoading ? "🔍 Szukam..." : "🔍 Szukaj przez Tavily"}
            </button>
          </div>
          <div
            className="form-group"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {[
              "business analytics tools",
              "open source accounting software",
              "financial data API 2025",
              "AI scraping tools",
              "CRM open source",
            ].map((q) => (
              <button
                key={q}
                className="btn-sm"
                onClick={() => {
                  setTavilyQuery(q);
                  handleTavilySearch(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {tavilyError && (
          <p style={{ color: "#f87171", marginTop: 12 }}>❌ {tavilyError}</p>
        )}

        {tavilyLoading && (
          <div style={{ marginTop: 16 }}>
            <LoadingSpinner
              size="md"
              message="Przeszukuję biznesowe bazy danych przez Tavily..."
            />
          </div>
        )}

        {tavilyResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>
              📋 Wyniki ({tavilyResults.filter((r) => !r._summary).length}{" "}
              stron)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tavilyResults.map((r, i) => (
                <div
                  key={i}
                  className="stat-card"
                  style={{
                    padding: "14px 16px",
                    background: r._summary
                      ? "rgba(96,165,250,0.08)"
                      : undefined,
                    borderLeft: r._summary
                      ? "3px solid #60a5fa"
                      : "3px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <strong style={{ fontSize: 14 }}>
                      {r.title || "Wynik"}
                    </strong>
                    {r.score && !r._summary && (
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.5,
                          flexShrink: 0,
                        }}
                      >
                        {Math.round(r.score * 100)}% trafność
                      </span>
                    )}
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: "#60a5fa",
                        display: "block",
                        marginTop: 4,
                        wordBreak: "break-all",
                      }}
                    >
                      {r.url}
                    </a>
                  )}
                  <p
                    style={{
                      fontSize: 13,
                      opacity: 0.8,
                      margin: "6px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.content?.slice(0, 300)}
                    {r.content?.length > 300 ? "..." : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!tavilyKey && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "rgba(251,191,36,0.08)",
              borderRadius: 8,
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <p style={{ margin: 0, fontSize: 13 }}>
              💡 <strong>Jak uzyskać klucz Tavily:</strong>
              <br />
              1. Wejdź na{" "}
              <a
                href="https://tavily.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa" }}
              >
                tavily.com
              </a>
              <br />
              2. Zarejestruj się bezpłatnie (1000 zapytań/miesiąc)
              <br />
              3. Skopiuj klucz API i wklej powyżej
              <br />
              4. Klucz jest zapisywany lokalnie w przeglądarce
            </p>
          </div>
        )}
      </section>

      {/* ── Quick Links ── */}
      <section className="card">
        <h3>🔗 Szybkie linki — Narzędzia finansowo-analityczne</h3>
        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 8,
          }}
        >
          {[
            { label: "📈 TradingView", url: "https://tradingview.com" },
            { label: "🏦 OpenBB Terminal", url: "https://openbb.co" },
            { label: "📊 Metabase", url: "https://metabase.com" },
            {
              label: "📉 Apache Superset",
              url: "https://superset.apache.org",
            },
            { label: "🔥 Firecrawl", url: "https://firecrawl.dev" },
            { label: "🤖 Tavily", url: "https://tavily.com" },
            { label: "⚡ n8n Automation", url: "https://n8n.io" },
            { label: "🧮 Wave Accounting", url: "https://waveapps.com" },
            { label: "🏢 ERPNext", url: "https://erpnext.com" },
            { label: "📡 Alpha Vantage", url: "https://alphavantage.co" },
            {
              label: "🌍 FRED API",
              url: "https://fred.stlouisfed.org/docs/api/fred",
            },
            { label: "🪙 CoinGecko API", url: "https://coingecko.com/api" },
          ].map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div
                className="stat-card"
                style={{
                  textAlign: "center",
                  padding: "10px 8px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {link.label}
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>🧠 JIMbo Biz Tools Runner</h3>
        <div className="input-row" style={{ marginBottom: 8 }}>
          <button
            className="btn-sm"
            onClick={() =>
              handleRunTool("analiza_konkurencji", { query: tavilyQuery })
            }
            disabled={toolLoading}
          >
            Analiza konkurencji
          </button>
          <button
            className="btn-sm"
            onClick={() => handleRunTool("brief_seo", { query: tavilyQuery })}
            disabled={toolLoading}
          >
            Brief SEO
          </button>
          <button
            className="btn-sm btn-accent"
            onClick={() =>
              handleRunTool("raport_rynkowy", { query: tavilyQuery })
            }
            disabled={toolLoading}
          >
            Raport rynkowy
          </button>
        </div>
        {activeTool && <p className="muted">Aktywne narzędzie: {activeTool}</p>}

        {toolLoading && (
          <div style={{ marginTop: 16 }}>
            <LoadingSpinner
              size="md"
              message="Wykonuję narzędzie przez JIMbo..."
            />
          </div>
        )}

        {toolEvents?.length > 0 && (
          <div className="status-list" style={{ marginTop: 8 }}>
            {toolEvents.map((evt, i) => (
              <div key={i} className="status-row">
                {evt}
              </div>
            ))}
          </div>
        )}
        {toolResult && (
          <div className="ai-output" style={{ marginTop: 8 }}>
            <pre>{toolResult}</pre>
          </div>
        )}
        {toolHistory?.length > 0 && (
          <p className="muted" style={{ marginTop: 8 }}>
            Historia: {toolHistory.length}
          </p>
        )}
      </section>
    </div>
  );
}
