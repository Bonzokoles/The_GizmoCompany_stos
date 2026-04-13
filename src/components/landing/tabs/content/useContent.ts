// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboStream, isJimboOnline } from "../../shared/jimboClient";

export function useContent() {
  const [contentTopic, setContentTopic] = useState("");

  const [contentType, setContentType] = useState("article");

  const [contentLang, setContentLang] = useState("pl");

  const [contentTone, setContentTone] = useState("professional");

  const [contentResult, setContentResult] = useState<any>(null);

  const [contentLoading, setContentLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboStreaming, setJimboStreaming] = useState(false);

  const [jimboStreamContent, setJimboStreamContent] = useState("");

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [cmsView, setCmsView] = useState<"list" | "editor" | "generate">(
    "list",
  );

  const [articlesList, setArticlesList] = useState<any[]>([]);

  const [articlesLoading, setArticlesLoading] = useState(false);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );

  const [articleTitle, setArticleTitle] = useState("");

  const [articleContent, setArticleContent] = useState("");

  const [articleExcerpt, setArticleExcerpt] = useState("");

  const [articleCategory, setArticleCategory] = useState("");

  const [articleTags, setArticleTags] = useState("");

  const [articleLang, setArticleLang] = useState("pl");

  const [articleSeoTitle, setArticleSeoTitle] = useState("");

  const [articleSeoDesc, setArticleSeoDesc] = useState("");

  const [articleStatus, setArticleStatus] = useState("draft");

  const [cmsSaving, setCmsSaving] = useState(false);

  const [cmsPublishing, setCmsPublishing] = useState(false);

  const [cmsMessage, setCmsMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await isJimboOnline();
      if (mounted) setJimboOnline(ok);
    };
    check();
    const id = window.setInterval(check, 30000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[ąà]/g, "a")
      .replace(/[ćč]/g, "c")
      .replace(/[ęè]/g, "e")
      .replace(/[łl]/g, "l")
      .replace(/[ńñ]/g, "n")
      .replace(/[óò]/g, "o")
      .replace(/[śš]/g, "s")
      .replace(/[źżž]/g, "z")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleContentGenerate = useCallback(async () => {
    if (!contentTopic.trim()) return;
    setContentLoading(true);
    setContentResult(null);
    const data = await apiFetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: contentTopic,
        type: contentType,
        language: contentLang,
        tone: contentTone,
      }),
    });
    setContentResult(data);
    setContentLoading(false);
  }, [contentTopic, contentType, contentLang, contentTone]);

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    const data = await apiFetch("/api/content/articles");
    if (data?.articles) setArticlesList(data.articles);
    setArticlesLoading(false);
  }, []);

  const resetEditor = useCallback(() => {
    setSelectedArticleId(null);
    setArticleTitle("");
    setArticleContent("");
    setArticleExcerpt("");
    setArticleCategory("");
    setArticleTags("");
    setArticleLang("pl");
    setArticleSeoTitle("");
    setArticleSeoDesc("");
    setArticleStatus("draft");
    setCmsMessage(null);
  }, []);

  const openArticle = useCallback(async (slug: string) => {
    const data = await apiFetch(`/api/content/article/${slug}`);
    if (data?.article) {
      const a = data.article;
      setSelectedArticleId(a.id);
      setArticleTitle(a.title || "");
      setArticleContent(a.content || "");
      setArticleExcerpt(a.excerpt || "");
      setArticleCategory(a.category || "");
      setArticleTags(Array.isArray(a.tags) ? a.tags.join(", ") : a.tags || "");
      setArticleLang(a.language || "pl");
      setArticleSeoTitle(a.seo_title || "");
      setArticleSeoDesc(a.seo_description || "");
      setArticleStatus(a.status || "draft");
      setCmsView("editor");
    }
  }, []);

  const handleSaveArticle = useCallback(async () => {
    if (!articleTitle.trim()) {
      setCmsMessage({ type: "err", text: "Tytuł jest wymagany" });
      return;
    }
    setCmsSaving(true);
    setCmsMessage(null);
    const payload = {
      title: articleTitle,
      slug: slugify(articleTitle),
      content: articleContent,
      excerpt: articleExcerpt,
      category: articleCategory,
      tags: articleTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      language: articleLang,
      seoTitle: articleSeoTitle,
      seoDescription: articleSeoDesc,
    };
    const data = await apiFetch<any>("/api/content/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setCmsSaving(false);
    if (data?.slug) {
      setCmsMessage({ type: "ok", text: `Artykuł zapisany (${data.status})` });
      loadArticles();
    } else {
      setCmsMessage({ type: "err", text: data?.error || "Błąd zapisu" });
    }
  }, [
    articleTitle,
    articleContent,
    articleExcerpt,
    articleCategory,
    articleTags,
    articleLang,
    articleSeoTitle,
    articleSeoDesc,
    loadArticles,
  ]);

  const handlePublishArticle = useCallback(async () => {
    if (!articleTitle.trim()) return;
    setCmsPublishing(true);
    setCmsMessage(null);
    const payload = {
      title: articleTitle,
      slug: slugify(articleTitle),
      content: articleContent,
      excerpt: articleExcerpt,
      category: articleCategory,
      tags: articleTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      language: articleLang,
      seoTitle: articleSeoTitle,
      seoDescription: articleSeoDesc,
    };
    const data = await apiFetch<any>("/api/content/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setCmsPublishing(false);
    if (data?.slug) {
      setArticleStatus("published");
      setCmsMessage({ type: "ok", text: "Opublikowano!" });
      loadArticles();
    } else {
      setCmsMessage({ type: "err", text: data?.error || "Błąd publikacji" });
    }
  }, [
    articleTitle,
    articleContent,
    articleExcerpt,
    articleCategory,
    articleTags,
    articleLang,
    articleSeoTitle,
    articleSeoDesc,
    loadArticles,
  ]);

  const handleUnpublishArticle = useCallback(async () => {
    if (!selectedArticleId) return;
    const data = await apiFetch<any>("/api/content/unpublish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slugify(articleTitle) }),
    });
    if (data?.status === "archived") {
      setArticleStatus("archived");
      setCmsMessage({ type: "ok", text: "Artykuł zarchiwizowany" });
      loadArticles();
    }
  }, [selectedArticleId, articleTitle, loadArticles]);

  const handleUseGenerated = useCallback(() => {
    if (contentResult?.content) {
      setArticleTitle(contentTopic);
      setArticleContent(contentResult.content);
      setCmsView("editor");
    }
  }, [contentResult, contentTopic]);

  const handleJimboGenerate = useCallback(async () => {
    if (!contentTopic.trim()) return;

    const online = await isJimboOnline();
    setJimboOnline(online);
    setJimboToolEvents([]);

    if (!online) {
      setCmsMessage({
        type: "err",
        text: "JIMbo jest offline. Użyj standardowego generatora AI.",
      });
      return;
    }

    setJimboStreaming(true);
    setJimboStreamContent("");
    setArticleContent("");
    setCmsView("editor");

    jimboStream(
      `Napisz ${contentType} po ${contentLang} na temat: ${contentTopic}. Ton: ${contentTone}`,
      `content-${Date.now()}`,
      (chunk) => {
        setJimboStreamContent((prev) => `${prev}${chunk}`);
        setArticleContent((prev) => `${prev}${chunk}`);
      },
      (full) => {
        const finalText = full || "Brak odpowiedzi z JIMbo.";
        setJimboStreamContent(finalText);
        setArticleContent(finalText);
        setArticleTitle(contentTopic);
        setJimboStreaming(false);
      },
      (tool, result) => {
        if (tool.includes("search")) {
          setJimboToolEvents((prev) => [
            ...prev,
            `💡 Szukam: ${result || contentTopic}`,
          ]);
        } else if (tool.includes("fetch") || tool.includes("url")) {
          setJimboToolEvents((prev) => [
            ...prev,
            `🔗 Pobieram: ${result || "źródło"}`,
          ]);
        }
      },
    );
  }, [contentTopic, contentType, contentLang, contentTone]);

  return {
    contentTopic,
    setContentTopic,
    contentType,
    setContentType,
    contentLang,
    setContentLang,
    contentTone,
    setContentTone,
    contentResult,
    setContentResult,
    contentLoading,
    setContentLoading,
    jimboOnline,
    setJimboOnline,
    jimboStreaming,
    setJimboStreaming,
    jimboStreamContent,
    setJimboStreamContent,
    jimboToolEvents,
    setJimboToolEvents,
    cmsView,
    setCmsView,
    articlesList,
    setArticlesList,
    articlesLoading,
    setArticlesLoading,
    selectedArticleId,
    setSelectedArticleId,
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
    articleSeoTitle,
    setArticleSeoTitle,
    articleSeoDesc,
    setArticleSeoDesc,
    articleStatus,
    setArticleStatus,
    cmsSaving,
    setCmsSaving,
    cmsPublishing,
    setCmsPublishing,
    cmsMessage,
    setCmsMessage,
    handleContentGenerate,
    loadArticles,
    resetEditor,
    openArticle,
    handleSaveArticle,
    handlePublishArticle,
    handleUnpublishArticle,
    handleUseGenerated,
    handleJimboGenerate,
    slugify,
  };
}
