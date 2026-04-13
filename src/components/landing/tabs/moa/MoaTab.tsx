// @ts-nocheck
import type { MoaTabProps } from "./types";

export function MoaTab({
  moaTopic,
  setMoaTopic,
  moaType,
  setMoaType,
  moaLang,
  setMoaLang,
  moaProfile,
  setMoaProfile,
  handleMoaGenerate,
  handleMoaStream,
  moaLoading,
  moaResult,
  jimboOnline,
  jimboToolEvents,
  moaSource,
  moaStreamContent,
}: MoaTabProps) {
  return (
    <div className="tab-content">
      <h2>
        🧬 Mixture-of-Agents Pipeline{" "}
        <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Multi-stage AI pipeline: Parallel Writing → Critique → Aggregation →
        Validation
      </p>
      <section className="card">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Topic</label>
            <input
              type="text"
              value={moaTopic}
              onChange={(e) => setMoaTopic(e.target.value)}
              placeholder="Enter topic for MOA pipeline..."
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select
              value={moaType}
              onChange={(e) => setMoaType(e.target.value)}
            >
              <option value="article">Article</option>
              <option value="blog">Blog Post</option>
              <option value="social">Social Media</option>
              <option value="product">Product Description</option>
            </select>
          </div>
          <div className="form-group">
            <label>Language</label>
            <select
              value={moaLang}
              onChange={(e) => setMoaLang(e.target.value)}
            >
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="form-group">
            <label>Profile</label>
            <select
              value={moaProfile}
              onChange={(e) => setMoaProfile(e.target.value)}
            >
              <option value="DEFAULT">DEFAULT</option>
              <option value="BLOG">BLOG</option>
              <option value="DATA_ANALYSIS">DATA_ANALYSIS</option>
              <option value="SOCIAL_MEDIA">SOCIAL_MEDIA</option>
              <option value="PRODUCT_COPY">PRODUCT_COPY</option>
            </select>
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleMoaGenerate}
              disabled={moaLoading}
            >
              {moaLoading ? "Running Pipeline..." : "Run MOA Pipeline"}
            </button>
            <button
              className="btn-sm"
              onClick={handleMoaStream}
              disabled={moaLoading}
              style={{ marginTop: 8 }}
            >
              {moaLoading ? "..." : "Uruchom przez JIMbo"}
            </button>
          </div>
        </div>
      </section>

      {(moaStreamContent || jimboToolEvents?.length > 0) && (
        <section className="card">
          <p className="muted">Źródło: {moaSource || "—"}</p>
          {jimboToolEvents?.map((evt, i) => (
            <div key={i} className="status-row">
              {evt}
            </div>
          ))}
          {moaStreamContent && (
            <div className="ai-output">
              <pre>{moaStreamContent}</pre>
            </div>
          )}
        </section>
      )}

      {moaResult && (
        <section className="card">
          <h3>MOA Pipeline Result</h3>
          {moaResult.pipeline && (
            <div className="moa-meta">
              <div className="moa-stages">
                {moaResult.pipeline.stages?.map((s: string) => (
                  <span key={s} className="badge badge-green">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mini-stats">
                <span>Drafts: {moaResult.pipeline.draftsGenerated}</span>
                <span>Quality: {moaResult.pipeline.qualityScore}/10</span>
                <span>
                  Time: {(moaResult.pipeline.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
              {moaResult.pipeline.scores && (
                <div className="moa-scores">
                  {moaResult.pipeline.scores.map((s: any) => (
                    <span key={s.model} className="score-badge">
                      {s.model}: {s.score}/10
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="ai-output">
            <pre>{moaResult.content}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
