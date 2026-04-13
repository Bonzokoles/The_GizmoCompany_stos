// @ts-nocheck
import { useRef } from "react";
import type { MediaHubTabProps } from "./types";

export function MediaHubTab({
  mediaList,
  mediaLoading,
  uploadLoading,
  selectedMedia,
  playingMedia,
  mediaFilter,
  setMediaFilter,
  generatedMetadata,
  metadataLoading,
  jimboOnline,
  handleLoadMedia,
  handleGenerateMetadata,
  handleSelectMedia,
  handlePlayMedia,
  handleUploadMedia,
}: MediaHubTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadMedia(file);
    e.target.value = "";
  };

  const mediaIcon = (type: string) => {
    if (type === "audio") return "🎵";
    if (type === "video") return "🎬";
    if (type === "image") return "🖼";
    return "📄";
  };

  return (
    <div className="tab-content">
      <h2>
        ♫ BONZO Media Hub{" "}
        <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        muzyka · filmy · streams · AI biblioteka
      </p>

      {/* Links + Upload */}
      <section
        className="card"
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,image/*"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
        <button
          className="btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadLoading}
          title="Dodaj plik do R2"
        >
          {uploadLoading ? "⏳ Wysyłam..." : "⬆ Dodaj plik"}
        </button>
      </section>

      {/* Odtwarzacz inline */}
      {playingMedia && (
        <section className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{mediaIcon(playingMedia.type)}</span>
            <strong style={{ fontSize: 13 }}>{playingMedia.name}</strong>
            <button
              className="btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => handlePlayMedia(playingMedia)}
            >
              ✕ Zamknij
            </button>
          </div>
          {playingMedia.type === "audio" && playingMedia.url && (
            <audio
              controls
              autoPlay
              src={playingMedia.url}
              style={{ width: "100%", borderRadius: 6 }}
            >
              Twoja przeglądarka nie obsługuje odtwarzacza audio.
            </audio>
          )}
          {playingMedia.type === "video" && playingMedia.url && (
            <video
              controls
              autoPlay
              src={playingMedia.url}
              style={{ width: "100%", maxHeight: 400, borderRadius: 6, background: "#000" }}
            >
              Twoja przeglądarka nie obsługuje odtwarzacza video.
            </video>
          )}
          {playingMedia.type === "image" && playingMedia.url && (
            <img
              src={playingMedia.url}
              alt={playingMedia.name}
              style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 6, display: "block" }}
            />
          )}
          {!playingMedia.url && (
            <p className="muted" style={{ fontSize: 12 }}>Brak URL — plik może nie mieć publicznego dostępu.</p>
          )}
        </section>
      )}

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
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {mediaList.map((item) => {
            const isPlaying = playingMedia?.key === item.key;
            const isSelected = selectedMedia?.key === item.key;
            const canPlay = item.type === "audio" || item.type === "video" || item.type === "image";
            return (
              <div
                key={item.key}
                className={`card status-card${isSelected ? " active" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => handleSelectMedia(item)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{mediaIcon(item.type)}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {item.type}
                  {item.size ? ` · ${(item.size / 1024).toFixed(1)} KB` : ""}
                </div>
                {item.metadata?.title && (
                  <div style={{ fontSize: 11, marginTop: 4, color: "#60a5fa" }}>
                    {item.metadata.title}
                  </div>
                )}
                {canPlay && (
                  <button
                    className={`btn-sm${isPlaying ? " btn-accent" : ""}`}
                    style={{ marginTop: 8, width: "100%", fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); handlePlayMedia(item); }}
                  >
                    {isPlaying ? "⏹ Stop" : item.type === "image" ? "👁 Podgląd" : "▶ Odtwórz"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Selected + Metadata */}
      {selectedMedia && (
        <section className="card">
          <h3>{mediaIcon(selectedMedia.type)} {selectedMedia.name}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {selectedMedia.url && (
              <a
                href={selectedMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sm"
              >
                ↗ Otwórz plik
              </a>
            )}
            {(selectedMedia.type === "audio" || selectedMedia.type === "video" || selectedMedia.type === "image") && (
              <button
                className="btn-sm"
                onClick={() => handlePlayMedia(selectedMedia)}
              >
                {playingMedia?.key === selectedMedia.key
                  ? "⏹ Stop"
                  : selectedMedia.type === "image" ? "👁 Podgląd" : "▶ Odtwórz"}
              </button>
            )}
          </div>
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