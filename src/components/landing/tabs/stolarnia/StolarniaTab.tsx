import { useState, useEffect } from "react";

interface StolarProjekt {
  id: string;
  nazwa: string;
  klient: string;
  status: string;
  wycena_klienta: number;
  zaliczka: number;
  termin_klienta: string | null;
  pro100_plik: string | null;
  koszty_materialow: number;
  koszty_robocizny: number;
  wplywy: number;
  zysk_brutto: number;
  marza_proc: number;
}

const API_BASE = "https://mybonzo-v3.stolarnia-ams.workers.dev/api/stolarska";

export function StolarniaTab() {
  const [projekty, setProjekty] = useState<StolarProjekt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kalkulator stan
  const [calcWycena, setCalcWycena] = useState<number>(24000);
  const [calcZaliczka, setCalcZaliczka] = useState<number>(8000);
  const [calcMat, setCalcMat] = useState<number>(9500);
  const [calcGodzProd, setCalcGodzProd] = useState<number>(32);
  const [calcGodzMont, setCalcGodzMont] = useState<number>(10);
  const [calcStawka, setCalcStawka] = useState<number>(80);

  // Wynik szybkiej kalkulacji
  const calcRobocizna = (calcGodzProd + calcGodzMont) * calcStawka;
  const calcKosztyTotal = calcMat + calcRobocizna;
  const calcZysk = calcWycena - calcKosztyTotal;
  const calcMarza = calcWycena > 0 ? Math.round((calcZysk / calcWycena) * 1000) / 10 : 0;
  const calcDoZaplaty = Math.max(0, calcWycena - calcZaliczka);

  // Formularz nowego projektu
  const [nowaNazwa, setNowaNazwa] = useState("");
  const [nowyKlient, setNowyKlient] = useState("");
  const [nowyTermin, setNowyTermin] = useState("");
  const [creating, setCreating] = useState(false);

  // AI Audyt stan
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);

  const loadProjekty = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/projekty`);
      const json = await res.json();
      if (json.success) {
        setProjekty(json.data || []);
      } else {
        setError(json.error || "Błąd pobierania projektów");
      }
    } catch (err: any) {
      setError(err.message || "Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjekty();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nowaNazwa.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/projekty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nazwa: nowaNazwa,
          klient: nowyKlient,
          termin_klienta: nowyTermin || null,
          wycena_klienta: calcWycena,
          zaliczka: calcZaliczka,
          koszty: [
            { kategoria: "material", nazwa: "Materiały i płyta", ilosc: 1, cena_jedn: calcMat },
            { kategoria: "robocizna", nazwa: "Robocizna produkcja i montaż", ilosc: calcGodzProd + calcGodzMont, cena_jedn: calcStawka }
          ]
        })
      });
      const json = await res.json();
      if (json.success) {
        setNowaNazwa("");
        setNowyKlient("");
        loadProjekty();
      } else {
        alert(`Błąd: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Błąd połączenia: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleAiAudit = async (id: string) => {
    setAnalyzingId(id);
    setAiReport(null);
    try {
      const res = await fetch(`${API_BASE}/projekty/${id}/ai-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const json = await res.json();
      if (json.success) {
        setAiReport({ id, ...json.data });
      } else {
        alert(`Błąd analizy: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Błąd sieci: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="tab-content stolarnia-hub" style={{ fontFamily: "JetBrains Mono, monospace" }}>
      <div className="tab-header" style={{ borderBottom: "1px solid #1a202c", paddingBottom: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: "#d4a574", margin: 0, textTransform: "uppercase", fontSize: "16px", letterSpacing: "0.08em" }}>
              STOLARNIA AMS / PRO100 EDGE HUB
            </h2>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Architektura D1 SQLite + Edge Mesh AI + kalkulator rentowności zleceń meblarskich
            </p>
          </div>
          <button
            onClick={loadProjekty}
            disabled={loading}
            style={{
              background: "#11141c",
              border: "1px solid #2d3748",
              color: "#e2e8f0",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "11px",
              textTransform: "uppercase"
            }}
          >
            {loading ? "[ODŚWIEŻANIE...]" : "[ODŚWIEŻ PROJEKTY]"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#2d1515", border: "1px solid #e53e3e", color: "#fc8181", padding: "10px", marginBottom: "16px", fontSize: "12px" }}>
          [BŁĄD]: {error}
        </div>
      )}

      {/* Grid: Kalkulator + Lista projektów */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        
        {/* Panel 1: Kalkulator Szybkich Wycen */}
        <div style={{ background: "#0a0e14", border: "1px solid #1a202c", padding: "16px" }}>
          <h3 style={{ color: "#00E6A8", fontSize: "13px", marginTop: 0, borderBottom: "1px solid #1a202c", paddingBottom: "8px" }}>
            KALKULATOR RENTOWNOŚCI ZLECENIA
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>WYCENA KLIENTA (PLN)</label>
              <input
                type="number"
                value={calcWycena}
                onChange={(e) => setCalcWycena(Number(e.target.value))}
                style={{ width: "100%", background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>ZALICZKA (PLN)</label>
              <input
                type="number"
                value={calcZaliczka}
                onChange={(e) => setCalcZaliczka(Number(e.target.value))}
                style={{ width: "100%", background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>MATERIAŁY I OKUCIA (PLN)</label>
              <input
                type="number"
                value={calcMat}
                onChange={(e) => setCalcMat(Number(e.target.value))}
                style={{ width: "100%", background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>STAWKA ROBOCZA (PLN/H)</label>
              <input
                type="number"
                value={calcStawka}
                onChange={(e) => setCalcStawka(Number(e.target.value))}
                style={{ width: "100%", background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>CZAS PRODUKCJI (H)</label>
              <input
                type="number"
                value={calcGodzProd}
                onChange={(e) => setCalcGodzProd(Number(e.target.value))}
                style={{ width: "100%", background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>CZAS MONTAŻU (H)</label>
              <input
                type="number"
                value={calcGodzMont}
                onChange={(e) => setCalcGodzMont(Number(e.target.value))}
                style={{ width: "100%", background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* KPI Output Box */}
          <div style={{ background: "#11141c", border: "1px solid #2d3748", padding: "12px", marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>KOSZT CAŁKOWITY:</span>
              <span style={{ fontSize: "12px", color: "#fff" }}>{calcKosztyTotal} PLN</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>ZYSK BRUTTO:</span>
              <span style={{ fontSize: "12px", color: calcZysk >= 0 ? "#00E6A8" : "#fc8181", fontWeight: "bold" }}>
                {calcZysk} PLN
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>MARŻA OPERACYJNA:</span>
              <span style={{ fontSize: "13px", color: calcMarza >= 30 ? "#00E6A8" : calcMarza >= 20 ? "#d4a574" : "#fc8181", fontWeight: "bold" }}>
                {calcMarza}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>POZOSTAŁO DO ZAPŁATY:</span>
              <span style={{ fontSize: "12px", color: "#00e5ff" }}>{calcDoZaplaty} PLN</span>
            </div>
          </div>

          {/* Formularz zapisu do D1 */}
          <form onSubmit={handleCreateProject} style={{ marginTop: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="Nazwa projektu (np. Kuchnia Dąb Bielony)"
                value={nowaNazwa}
                onChange={(e) => setNowaNazwa(e.target.value)}
                required
                style={{ background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "11px" }}
              />
              <input
                type="text"
                placeholder="Klient (Imię i nazwisko / Telefon)"
                value={nowyKlient}
                onChange={(e) => setNowyKlient(e.target.value)}
                style={{ background: "#11141c", border: "1px solid #2d3748", color: "#fff", padding: "6px", fontSize: "11px" }}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              style={{
                width: "100%",
                background: "#00E6A8",
                border: "none",
                color: "#05070a",
                fontWeight: "bold",
                padding: "8px",
                fontSize: "11px",
                cursor: "pointer",
                textTransform: "uppercase"
              }}
            >
              {creating ? "[ZAPISYWANIE W D1...]" : "[UTWÓRZ PROJEKT W D1 CLOUDFLARE]"}
            </button>
          </form>
        </div>

        {/* Panel 2: Integracje Lokalne PRO100 & Narzędzia */}
        <div style={{ background: "#0a0e14", border: "1px solid #1a202c", padding: "16px" }}>
          <h3 style={{ color: "#00e5ff", fontSize: "13px", marginTop: 0, borderBottom: "1px solid #1a202c", paddingBottom: "8px" }}>
            STACJA ROBOCZA PRO100 & EDGE MESH
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <div style={{ background: "#11141c", border: "1px solid #2d3748", padding: "10px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>EDGE WORKER API:</div>
              <div style={{ fontSize: "12px", color: "#00E6A8", wordBreak: "break-all" }}>
                https://mybonzo-v3.stolarnia-ams.workers.dev
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                Status: OPERACYJNY (Cloudflare D1: mybonzo | 61 tabel | MCP Tools: Aktywne)
              </div>
            </div>

            <div style={{ background: "#11141c", border: "1px solid #2d3748", padding: "10px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>PRO100 PROJEKTY SERVER (PORT 3333):</div>
              <div style={{ fontSize: "12px", color: "#d4a574" }}>
                http://localhost:3333
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                Lokalizacja: E:\PRO100_MCP_AI (Katalog _pro100_watch, szablony, cenniki xlsx)
              </div>
            </div>

            <div style={{ background: "#11141c", border: "1px solid #2d3748", padding: "10px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>ZENO BROWSER TOOL SERVER (PORT 4111):</div>
              <div style={{ fontSize: "12px", color: "#00e5ff" }}>
                http://localhost:4111 (JIMBO Local Tools + RAG)
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                Status: 100% AKTYWNY (Zasoby FS, SYS, SQLite, Podman, RAG, Web Search)
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* AI Audyt Modal / Box */}
      {aiReport && (
        <div style={{ background: "#11141c", border: "1px solid #00E6A8", padding: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h4 style={{ color: "#00E6A8", margin: 0, fontSize: "13px" }}>
              AUDYT AI RENTOWNOŚCI PROJEKTU: {aiReport.id}
            </h4>
            <button
              onClick={() => setAiReport(null)}
              style={{ background: "none", border: "1px solid #2d3748", color: "#94a3b8", cursor: "pointer", fontSize: "10px" }}
            >
              [ZAMKNIJ]
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#e2e8f0", marginBottom: "8px" }}>
            <b>OBSERWACJE EKSPERTA:</b>
            <ul style={{ margin: "4px 0 10px 20px", padding: 0 }}>
              {(aiReport.insights || []).map((ins: string, idx: number) => (
                <li key={idx} style={{ color: "#94a3b8" }}>{ins}</li>
              ))}
            </ul>
          </div>
          <div style={{ fontSize: "11px", color: "#e2e8f0" }}>
            <b>REKOMENDACJE I DZIAŁANIA:</b>
            <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
              {(aiReport.recommendations || []).map((rec: string, idx: number) => (
                <li key={idx} style={{ color: "#d4a574" }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Lista projektów D1 */}
      <div style={{ background: "#0a0e14", border: "1px solid #1a202c", padding: "16px" }}>
        <h3 style={{ color: "#ffffff", fontSize: "13px", marginTop: 0, borderBottom: "1px solid #1a202c", paddingBottom: "8px" }}>
          AKTYWNE PROJEKTY STOLARSKIE (CLOUDFLARE D1)
        </h3>
        
        {projekty.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "12px" }}>Brak projektów stolarskich w bazie D1.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2d3748", color: "#94a3b8" }}>
                  <th style={{ padding: "8px 6px" }}>ID</th>
                  <th style={{ padding: "8px 6px" }}>NAZWA PROJEKTU</th>
                  <th style={{ padding: "8px 6px" }}>KLIENT</th>
                  <th style={{ padding: "8px 6px" }}>STATUS</th>
                  <th style={{ padding: "8px 6px" }}>WYCENA</th>
                  <th style={{ padding: "8px 6px" }}>MATERIAŁY</th>
                  <th style={{ padding: "8px 6px" }}>ROBOCIZNA</th>
                  <th style={{ padding: "8px 6px" }}>ZYSK</th>
                  <th style={{ padding: "8px 6px" }}>MARŻA</th>
                  <th style={{ padding: "8px 6px" }}>AKCJE</th>
                </tr>
              </thead>
              <tbody>
                {projekty.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #181c26" }}>
                    <td style={{ padding: "8px 6px", color: "#00e5ff" }}>{p.id}</td>
                    <td style={{ padding: "8px 6px", color: "#fff", fontWeight: "bold" }}>{p.nazwa}</td>
                    <td style={{ padding: "8px 6px", color: "#94a3b8" }}>{p.klient || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span style={{
                        padding: "2px 6px",
                        fontSize: "9px",
                        background: p.status === "w_toku" ? "#1e3a2b" : "#2a2d36",
                        color: p.status === "w_toku" ? "#00E6A8" : "#94a3b8"
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", color: "#fff" }}>{p.wycena_klienta} zł</td>
                    <td style={{ padding: "8px 6px", color: "#94a3b8" }}>{p.koszty_materialow} zł</td>
                    <td style={{ padding: "8px 6px", color: "#94a3b8" }}>{p.koszty_robocizny} zł</td>
                    <td style={{ padding: "8px 6px", color: p.zysk_brutto >= 0 ? "#00E6A8" : "#fc8181", fontWeight: "bold" }}>
                      {p.zysk_brutto} zł
                    </td>
                    <td style={{ padding: "8px 6px", color: p.marza_proc >= 30 ? "#00E6A8" : p.marza_proc >= 20 ? "#d4a574" : "#fc8181", fontWeight: "bold" }}>
                      {p.marza_proc}%
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <button
                        onClick={() => handleAiAudit(p.id)}
                        disabled={analyzingId === p.id}
                        style={{
                          background: "#181c26",
                          border: "1px solid #2d3748",
                          color: "#d4a574",
                          padding: "4px 8px",
                          fontSize: "10px",
                          cursor: "pointer"
                        }}
                      >
                        {analyzingId === p.id ? "[ANALIZA...]" : "[AUDYT AI]"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
