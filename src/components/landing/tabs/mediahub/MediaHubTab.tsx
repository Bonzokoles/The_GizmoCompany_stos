// @ts-nocheck
import type { MediaHubTabProps } from "./types";

export function MediaHubTab({
  mediaList,
  mediaLoading,
  selectedMedia,
  mediaFilter,
  setMediaFilter,
  generatedMetadata,
  metadataLoading,
  jimboOnline,
  handleLoadMedia,
  handleGenerateMetadata,
  handleSelectMedia,
}: MediaHubTabProps) {
  return (
    <div className="tab-content">
      <h2>
        ♫ BONZO Media Hub{" "}
        <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        muzyka · filmy · streams · AI biblioteka
      </p>

      {/* Links */}
      <section
        className="card"
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}
      >
        <a
          href="https://bonzo-media-hub.stolarnia-ams.workers.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          ↗ Otwórz BONZO Media Hub
        </a>
        <a
          href="https://github.com/Bonzokoles/BONZO_media_HUB"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sm"
        >
          GitHub ↗
        </a>
      </section>

      {/* Filter + Load */}
      <section className="card">
        <div className="tab-header" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>📂 Media Library</h3>
          <div className="tab-actions">
            {(["all", "audio", "video", "image"] as const).map((f) => (
              <button
                key={f}
                className={`filter-btn ${mediaFilter === f ? "active" : ""}`}
                onClick={() => {
                  setMediaFilter(f);
                  handleLoadMedia(f);
                }}
              >
                {f}
              </button>
            ))}
            <button
              className="btn-sm"
              onClick={() => handleLoadMedia(mediaFilter)}
              disabled={mediaLoading}
            >
              {mediaLoading ? "Ładuję..." : "Odśwież"}
            </button>
          </div>
        </div>

        {mediaList.length === 0 && !mediaLoading && (
          <p className="muted">Brak mediów. Kliknij Odśwież lub wybierz typ.</p>
        )}

        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {mediaList.map((item) => (
            <div
              key={item.key}
              className={`card status-card${selectedMedia?.key === item.key ? " active" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => handleSelectMedia(item)}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
                {item.name}
              </div>
              <div className="muted" style={{ fontSize: 11 }}>
                {item.type}{" "}
                {item.size ? `· ${(item.size / 1024).toFixed(1)} KB` : ""}
              </div>
              {item.metadata?.title && (
                <div style={{ fontSize: 11, marginTop: 4, color: "#60a5fa" }}>
                  {item.metadata.title}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Selected + Metadata */}
      {selectedMedia && (
        <section className="card">
          <h3>🎵 {selectedMedia.name}</h3>
          {selectedMedia.url && (
            <a
              href={selectedMedia.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sm"
              style={{ marginBottom: 12, display: "inline-block" }}
            >
              ↗ Otwórz plik
            </a>
          )}
          <div style={{ marginTop: 8 }}>
            <button
              className="btn-primary"
              onClick={() => handleGenerateMetadata(selectedMedia.key)}
              disabled={metadataLoading}
            >
              {metadataLoading
                ? "Generuję..."
                : jimboOnline
                  ? "🤖 Generuj metadane (JIMbo)"
                  : "🌐 Generuj metadane (CF AI)"}
            </button>
          </div>
          {generatedMetadata && (
            <pre
              style={{
                marginTop: 12,
                background: "#0f172a",
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {generatedMetadata}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
