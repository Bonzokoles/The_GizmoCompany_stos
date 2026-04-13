// @ts-nocheck
import type { DatabasesTabProps } from "./types";

export function DatabasesTab({
  databases,
  loadDatabases,
  dbLoading,
  selectedDb,
  loadTables,
  dbTables,
  sqlQuery,
  setSqlQuery,
  runQuery,
  queryResult,
  jimboOnline,
  nlQuery,
  setNlQuery,
  generatedSql,
  handleNlToSql,
  handleExecuteSql,
}: DatabasesTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          🗄️ D1 Databases ({databases.length}){" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <button className="btn-sm" onClick={loadDatabases} disabled={dbLoading}>
          Refresh
        </button>
      </div>

      {dbLoading && <div className="loading-bar" />}

      <div className="dashboard-grid">
        {databases.map((db) => (
          <div
            key={db.id}
            className={`card db-card ${selectedDb === db.id ? "selected" : ""}`}
            onClick={() => loadTables(db.id)}
            role="button"
            tabIndex={0}
          >
            <h3>{db.name}</h3>
            <p className="muted">{db.description}</p>
            <span className="badge">{db.project}</span>
          </div>
        ))}
      </div>

      {selectedDb && (
        <section className="card">
          <h3>Tables in {databases.find((d) => d.id === selectedDb)?.name}</h3>
          {dbTables.length > 0 ? (
            <div className="table-list">
              {dbTables.map((t) => (
                <code key={t} className="table-badge">
                  {t}
                </code>
              ))}
            </div>
          ) : (
            <p className="muted">No tables found or credentials needed.</p>
          )}

          <div className="query-section">
            <h4>SQL Query (read-only)</h4>
            <div className="input-row" style={{ marginBottom: 8 }}>
              <input
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder="Zapytaj po polsku..."
              />
              <button
                onClick={() => handleNlToSql(nlQuery)}
                disabled={!nlQuery.trim()}
              >
                Zapytaj po polsku
              </button>
            </div>
            {generatedSql && (
              <p className="muted">
                SQL: <code>{generatedSql}</code>
              </p>
            )}
            <div className="input-row">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM table_name LIMIT 10"
                rows={3}
              />
              <button
                onClick={() => handleExecuteSql(sqlQuery, selectedDb)}
                disabled={dbLoading}
              >
                Run
              </button>
            </div>
          </div>

          {queryResult && (
            <div className="query-results">
              {queryResult.results?.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(queryResult.results[0]).map((k) => (
                          <th key={k}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.results.map((row: any, i: number) => (
                        <tr key={i}>
                          {Object.values(row).map((v: any, j: number) => (
                            <td key={j}>{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">{queryResult.note || "No results."}</p>
              )}
              {queryResult.meta && (
                <p className="muted">
                  Rows: {queryResult.meta.rows} | Duration:{" "}
                  {queryResult.meta.duration}ms
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
