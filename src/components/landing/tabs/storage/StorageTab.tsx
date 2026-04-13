// @ts-nocheck
import type { StorageTabProps } from "./types";

export function StorageTab({
  buckets,
  loadBuckets,
  storageLoading,
  selectedBucket,
  browseBucket,
  bucketObjects,
  jimboOnline,
  jimboLoading,
  jimboResponse,
  jimboToolEvents,
  handleDeleteFile,
  handleAskStorage,
}: StorageTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          💾 R2 Storage ({buckets.length} buckets){" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <button
          className="btn-sm"
          onClick={loadBuckets}
          disabled={storageLoading}
        >
          Refresh
        </button>
        <button
          className="btn-sm btn-accent"
          onClick={handleAskStorage}
          disabled={jimboLoading || !selectedBucket}
        >
          Zapytaj o storage
        </button>
      </div>

      {storageLoading && <div className="loading-bar" />}

      <div className="dashboard-grid">
        {buckets.map((b) => (
          <div
            key={b.name}
            className={`card bucket-card ${selectedBucket === b.name ? "selected" : ""}`}
            onClick={() => browseBucket(b.name)}
            role="button"
            tabIndex={0}
          >
            <h3>{b.name}</h3>
            <p className="muted">{b.description}</p>
            <span className="badge">{b.category}</span>
          </div>
        ))}
      </div>

      {selectedBucket && (
        <section className="card">
          <h3>📁 {selectedBucket}</h3>
          {bucketObjects.length === 0 ? (
            <p className="muted">No objects found or credentials needed.</p>
          ) : (
            <div className="object-list">
              {bucketObjects.map((obj: any, i: number) => {
                const fileUrl = `/api/storage/file/${selectedBucket}/${encodeURIComponent(obj.key)}`;
                const ext = obj.key.split(".").pop()?.toLowerCase() ?? "";
                const isImage = [
                  "jpg",
                  "jpeg",
                  "png",
                  "gif",
                  "webp",
                  "svg",
                  "avif",
                ].includes(ext);
                const isPdf = ext === "pdf";
                const isText = [
                  "txt",
                  "md",
                  "json",
                  "csv",
                  "yaml",
                  "yml",
                  "xml",
                  "html",
                  "ts",
                  "js",
                ].includes(ext);
                return (
                  <div
                    key={i}
                    className="object-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ flex: 1, wordBreak: "break-all" }}>
                      {obj.key}
                    </span>
                    <span className="muted" style={{ whiteSpace: "nowrap" }}>
                      {obj.size ? `${(obj.size / 1024).toFixed(1)} KB` : ""}
                    </span>
                    {(isImage || isPdf || isText) && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sm"
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: "0.72rem",
                        }}
                      >
                        {isImage
                          ? "🖼 Podgląd"
                          : isPdf
                            ? "📄 Otwórz"
                            : "📝 Czytaj"}
                      </a>
                    )}
                    <a
                      href={fileUrl}
                      download={obj.key.split("/").pop()}
                      className="btn-sm"
                      style={{ whiteSpace: "nowrap", fontSize: "0.72rem" }}
                    >
                      ⬇ Pobierz
                    </a>
                    <button
                      className="btn-sm"
                      onClick={() => handleDeleteFile(selectedBucket, obj.key)}
                    >
                      🗑 Usuń
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {(jimboToolEvents?.length > 0 || jimboResponse) && (
        <section className="card">
          {jimboToolEvents?.map((evt, i) => (
            <div key={i} className="status-row">
              {evt}
            </div>
          ))}
          {jimboResponse && (
            <div className="ai-output">
              <pre>{jimboResponse}</pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
