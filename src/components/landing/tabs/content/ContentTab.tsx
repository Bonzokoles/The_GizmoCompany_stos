// @ts-nocheck
import type { ContentTabProps } from "./types";

export function ContentTab({
  cmsView,
  setCmsView,
  loadArticles,
  resetEditor,
  cmsMessage,
  setCmsMessage,
  articlesList,
  articlesLoading,
  openArticle,
  articleTitle,
  setArticleTitle,
  articleContent,
  setArticleContent,
  articleExcerpt,
  setArticleExcerpt,
  articleCategory,
  setArticleCategory,
  articleTags,
  setArticleTags,
  articleLang,
  setArticleLang,
  articleStatus,
  setArticleStatus,
  articleSeoTitle,
  setArticleSeoTitle,
  articleSeoDesc,
  setArticleSeoDesc,
  handleSaveArticle,
  cmsSaving,
  handlePublishArticle,
  cmsPublishing,
  selectedArticleId,
  handleUnpublishArticle,
  contentTopic,
  setContentTopic,
  contentType,
  setContentType,
  contentLang,
  setContentLang,
  contentTone,
  setContentTone,
  handleContentGenerate,
  contentLoading,
  contentResult,
  handleUseGenerated,
  jimboOnline,
  jimboStreaming,
  jimboStreamContent,
  jimboToolEvents,
  handleJimboGenerate,
}: ContentTabProps) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>
          📝 Content & CMS{" "}
          <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
        </h2>
        <div className="tab-actions">
          <button
            className={`btn-sm ${cmsView === "list" ? "active" : ""}`}
            onClick={() => {
              setCmsView("list");
              loadArticles();
            }}
          >
            📋 Artykuły
          </button>
          <button
            className={`btn-sm ${cmsView === "editor" ? "active" : ""}`}
            onClick={() => {
              resetEditor();
              setCmsView("editor");
            }}
          >
            ✏️ Nowy
          </button>
          <button
            className={`btn-sm ${cmsView === "generate" ? "active" : ""}`}
            onClick={() => setCmsView("generate")}
          >
            Generuj AI
          </button>
        </div>
      </div>

      {cmsMessage && (
        <div
          className={`cms-message ${cmsMessage.type === "ok" ? "cms-success" : "cms-error"}`}
        >
          {cmsMessage.text}
          <button className="cms-msg-close" onClick={() => setCmsMessage(null)}>
            ×
          </button>
        </div>
      )}

      {/* ── Articles List ── */}
      {cmsView === "list" && (
        <section className="card">
          <div className="card-header">
            <h3>Opublikowane artykuły</h3>
            <button
              className="btn-sm"
              onClick={loadArticles}
              disabled={articlesLoading}
            >
              {articlesLoading ? "Ładowanie..." : "🔄 Odśwież"}
            </button>
          </div>
          {articlesList.length === 0 && !articlesLoading && (
            <p className="empty-state">
              Brak artykułów. Utwórz nowy lub wygeneruj AI.
            </p>
          )}
          <div className="articles-list">
            {articlesList.map((a: any) => (
              <div
                key={a.slug}
                className="article-row"
                onClick={() => openArticle(a.slug)}
              >
                <div className="article-row-main">
                  <span className="article-title">{a.title}</span>
                  <span className={`status-badge status-${a.status}`}>
                    {a.status}
                  </span>
                </div>
                <div className="article-row-meta">
                  {a.category && <span className="tag">{a.category}</span>}
                  <span className="meta-date">
                    {a.published_at
                      ? new Date(a.published_at).toLocaleDateString("pl")
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Article Editor ── */}
      {cmsView === "editor" && (
        <>
          <section className="card cms-editor">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Tytuł artykułu</label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="Tytuł..."
                />
              </div>
              <div className="form-group full-width">
                <label>Treść (Markdown)</label>
                <textarea
                  className="cms-textarea"
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="Pisz tutaj w Markdown..."
                  rows={16}
                />
              </div>
              <div className="form-group full-width">
                <label>Wstęp / Excerpt</label>
                <textarea
                  value={articleExcerpt}
                  onChange={(e) => setArticleExcerpt(e.target.value)}
                  placeholder="Krótki opis artykułu..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Kategoria</label>
                <input
                  type="text"
                  value={articleCategory}
                  onChange={(e) => setArticleCategory(e.target.value)}
                  placeholder="np. Technologia"
                />
              </div>
              <div className="form-group">
                <label>Tagi (oddzielone przecinkami)</label>
                <input
                  type="text"
                  value={articleTags}
                  onChange={(e) => setArticleTags(e.target.value)}
                  placeholder="AI, browser, zeno"
                />
              </div>
              <div className="form-group">
                <label>Język</label>
                <select
                  value={articleLang}
                  onChange={(e) => setArticleLang(e.target.value)}
                >
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={articleStatus}
                  onChange={(e) => setArticleStatus(e.target.value)}
                >
                  <option value="draft">Szkic</option>
                  <option value="published">Opublikowany</option>
                  <option value="archived">Archiwum</option>
                </select>
              </div>
            </div>

            {/* SEO Section */}
            <details className="cms-seo-section">
              <summary>🔍 SEO</summary>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>SEO Title</label>
                  <input
                    type="text"
                    value={articleSeoTitle}
                    onChange={(e) => setArticleSeoTitle(e.target.value)}
                    placeholder="Tytuł SEO (opcjonalnie)"
                  />
                </div>
                <div className="form-group full-width">
                  <label>SEO Description</label>
                  <textarea
                    value={articleSeoDesc}
                    onChange={(e) => setArticleSeoDesc(e.target.value)}
                    placeholder="Meta opis..."
                    rows={2}
                  />
                </div>
              </div>
            </details>

            {/* Actions */}
            <div className="cms-actions">
              <button
                className="btn-primary"
                onClick={handleSaveArticle}
                disabled={cmsSaving}
              >
                {cmsSaving ? "Zapisywanie..." : "💾 Zapisz"}
              </button>
              <button
                className="btn-success"
                onClick={handlePublishArticle}
                disabled={cmsPublishing || !articleTitle.trim()}
              >
                {cmsPublishing ? "Publikowanie..." : "🚀 Opublikuj"}
              </button>
              {selectedArticleId && articleStatus === "published" && (
                <button
                  className="btn-warning"
                  onClick={handleUnpublishArticle}
                >
                  📦 Archiwizuj
                </button>
              )}
              <button
                className="btn-ghost"
                onClick={() => {
                  resetEditor();
                  setCmsView("list");
                }}
              >
                ← Wróć do listy
              </button>
            </div>
          </section>

          {/* Live Preview */}
          {articleContent && (
            <section className="card">
              <h3>Podgląd</h3>
              <div className="cms-preview">
                <h1>{articleTitle || "Bez tytułu"}</h1>
                {articleExcerpt && (
                  <p className="preview-excerpt">{articleExcerpt}</p>
                )}
                <pre className="preview-content">{articleContent}</pre>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── AI Generator ── */}
      {cmsView === "generate" && (
        <>
          <section className="card">
            <h3>🤖 Generuj treść AI</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Temat / Tytuł</label>
                <input
                  type="text"
                  value={contentTopic}
                  onChange={(e) => setContentTopic(e.target.value)}
                  placeholder="Wpisz temat..."
                />
              </div>
              <div className="form-group">
                <label>Typ</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                >
                  <option value="article">Artykuł</option>
                  <option value="blog">Blog Post</option>
                  <option value="social">Social Media</option>
                  <option value="email">Email</option>
                  <option value="product">Opis produktu</option>
                </select>
              </div>
              <div className="form-group">
                <label>Język</label>
                <select
                  value={contentLang}
                  onChange={(e) => setContentLang(e.target.value)}
                >
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ton</label>
                <select
                  value={contentTone}
                  onChange={(e) => setContentTone(e.target.value)}
                >
                  <option value="professional">Profesjonalny</option>
                  <option value="casual">Swobodny</option>
                  <option value="creative">Kreatywny</option>
                  <option value="technical">Techniczny</option>
                  <option value="persuasive">Perswazyjny</option>
                </select>
              </div>
              <div className="form-group">
                <button
                  className="btn-primary"
                  onClick={handleContentGenerate}
                  disabled={contentLoading}
                >
                  {contentLoading ? "Generowanie..." : "🤖 Generuj"}
                </button>
                <button
                  className="btn-sm"
                  onClick={handleJimboGenerate}
                  disabled={jimboStreaming || contentLoading}
                  style={{ marginTop: 8 }}
                >
                  {jimboStreaming ? "Streaming..." : "⚡ Generuj z JIMbo"}
                </button>
              </div>
            </div>
          </section>
          {(jimboStreamContent || jimboToolEvents?.length > 0) && (
            <section className="card">
              {jimboToolEvents?.length > 0 && (
                <div className="status-list" style={{ marginBottom: 8 }}>
                  {jimboToolEvents.map((evt, i) => (
                    <div key={i} className="status-row">
                      {evt}
                    </div>
                  ))}
                </div>
              )}
              {jimboStreamContent && (
                <div className="ai-output">
                  <pre>{jimboStreamContent}</pre>
                </div>
              )}
            </section>
          )}
          {contentResult && (
            <section className="card">
              <div className="card-header">
                <h3>Wygenerowana treść</h3>
                <button
                  className="btn-sm btn-success"
                  onClick={handleUseGenerated}
                >
                  ✏️ Użyj w edytorze
                </button>
              </div>
              <div className="ai-output">
                <pre>
                  {contentResult.content ||
                    JSON.stringify(contentResult, null, 2)}
                </pre>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
