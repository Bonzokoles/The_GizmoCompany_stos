/**
 * ZENO Browser — Operations Dashboard
 * Central operations hub for all sites, Workers, AI, storage and databases
 * Deployed on zenbrowsers.org (CF Pages)
 */
import { useState, useEffect, useCallback } from 'react';

/* ─── Types ──────────────────────────────────────── */

type TabId = 'overview' | 'workers' | 'content' | 'analytics' | 'pipelines' | 'crawlers' | 'storage' | 'databases' | 'images' | 'moa' | 'render' | 'queues' | 'aihub';
type Status = 'online' | 'offline' | 'checking' | 'unknown';

interface SiteStatus { name: string; status: Status; url: string }
interface ApiStatus { name: string; endpoint: string; status: Status }
interface WorkerInfo { id: string; name: string; category: string; route?: string; description: string; status?: Status; latency?: number }
interface BucketInfo { name: string; description: string; category: string }
interface DbInfo { id: string; name: string; description: string; project: string }

/* ─── Constants ─────────────────────────────────── */

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'workers', label: 'Workers', icon: '⚙️' },
  { id: 'content', label: 'Content', icon: '📝' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'pipelines', label: 'Pipelines', icon: '🔀' },
  { id: 'crawlers', label: 'Crawlers', icon: '🕷️' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'databases', label: 'Databases', icon: '🗄️' },
  { id: 'images', label: 'Images', icon: '🖼️' },
  { id: 'moa', label: 'MOA', icon: '🧬' },
  { id: 'render', label: 'Render', icon: '🌐' },
  { id: 'queues', label: 'Queues', icon: '📨' },
  { id: 'aihub', label: 'AI Hub', icon: '🤖' },
];

const API_SERVICES: ApiStatus[] = [
  { name: 'WebGate', endpoint: '/api/webgate/status', status: 'checking' },
  { name: 'AI Gate', endpoint: '/api/ai/status', status: 'checking' },
  { name: 'Search', endpoint: '/api/search/status', status: 'checking' },
  { name: 'Sites Hub', endpoint: '/api/sites/status', status: 'checking' },
  { name: 'Workers Monitor', endpoint: '/api/workers/status', status: 'checking' },
  { name: 'Content Pipeline', endpoint: '/api/content/status', status: 'checking' },
  { name: 'Analytics Hub', endpoint: '/api/analytics/status', status: 'checking' },
  { name: 'Storage Manager', endpoint: '/api/storage/status', status: 'checking' },
  { name: 'Database Explorer', endpoint: '/api/db/status', status: 'checking' },
  { name: 'MOA Pipeline', endpoint: '/api/moa/status', status: 'checking' },
  { name: 'Images API', endpoint: '/api/images/status', status: 'checking' },
  { name: 'Crawlers Monitor', endpoint: '/api/crawlers/status', status: 'checking' },
  { name: 'Pipelines API', endpoint: '/api/pipelines/status', status: 'checking' },
  { name: 'Browser Rendering', endpoint: '/api/render/status', status: 'checking' },
];

const PIPELINES_LIST = [
  'page-analytics', 'worker-metrics', 'content-pipeline',
  'crawler-events', 'ecommerce-events', 'ai-usage', 'search-events',
];

/* ─── Helpers ────────────────────────────────────── */

async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
    const data = await r.json();
    return data as T;
  } catch { return null; }
}

/* ─── Main Component ─────────────────────────────── */

export function WebLanding() {
  const [tab, setTab] = useState<TabId>('overview');
  const [apis, setApis] = useState(API_SERVICES);
  const [sites, setSites] = useState<SiteStatus[]>([]);

  // Search & AI (overview)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Workers
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [workerFilter, setWorkerFilter] = useState('all');
  const [workersLoading, setWorkersLoading] = useState(false);

  // Content
  const [contentTopic, setContentTopic] = useState('');
  const [contentType, setContentType] = useState('article');
  const [contentLang, setContentLang] = useState('pl');
  const [contentTone, setContentTone] = useState('professional');
  const [contentResult, setContentResult] = useState<any>(null);
  const [contentLoading, setContentLoading] = useState(false);

  // CMS — article editor + publish
  const [cmsView, setCmsView] = useState<'list' | 'editor' | 'generate'>('list');
  const [articlesList, setArticlesList] = useState<any[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleExcerpt, setArticleExcerpt] = useState('');
  const [articleCategory, setArticleCategory] = useState('');
  const [articleTags, setArticleTags] = useState('');
  const [articleLang, setArticleLang] = useState('pl');
  const [articleSeoTitle, setArticleSeoTitle] = useState('');
  const [articleSeoDesc, setArticleSeoDesc] = useState('');
  const [articleStatus, setArticleStatus] = useState('draft');
  const [cmsSaving, setCmsSaving] = useState(false);
  const [cmsPublishing, setCmsPublishing] = useState(false);
  const [cmsMessage, setCmsMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Analytics
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('24h');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Storage
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [bucketObjects, setBucketObjects] = useState<any[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);

  // Databases
  const [databases, setDatabases] = useState<DbInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Images
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgStyle, setImgStyle] = useState('');
  const [imgResult, setImgResult] = useState<any>(null);
  const [imgLoading, setImgLoading] = useState(false);

  // Crawlers
  const [crawlersData, setCrawlersData] = useState<any>(null);
  const [crawlersPeriod, setCrawlersPeriod] = useState('24h');
  const [crawlersLoading, setCrawlersLoading] = useState(false);
  const [crawlerProfiles, setCrawlerProfiles] = useState<any[]>([]);
  const [crawlerFilter, setCrawlerFilter] = useState('all');

  // MOA
  const [moaTopic, setMoaTopic] = useState('');
  const [moaType, setMoaType] = useState('article');
  const [moaLang, setMoaLang] = useState('pl');
  const [moaResult, setMoaResult] = useState<any>(null);
  const [moaLoading, setMoaLoading] = useState(false);

  // Pipelines
  const [pipelinesData, setPipelinesData] = useState<any>(null);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [pipelineEvents, setPipelineEvents] = useState<any[]>([]);
  const [pipelineStats, setPipelineStats] = useState<any>(null);
  const [ingestPipeline, setIngestPipeline] = useState('');
  const [ingestType, setIngestType] = useState('');
  const [ingestPayload, setIngestPayload] = useState('{}');
  const [ingestResult, setIngestResult] = useState<any>(null);

  // Render
  const [renderUrl, setRenderUrl] = useState('');
  const [renderAction, setRenderAction] = useState<'screenshot' | 'pdf' | 'scrape' | 'markdown' | 'json'>('screenshot');
  const [renderSelectors, setRenderSelectors] = useState('h1, h2, p, a');
  const [renderPrompt, setRenderPrompt] = useState('');
  const [renderResult, setRenderResult] = useState<any>(null);
  const [renderLoading, setRenderLoading] = useState(false);

  // Queues
  const [queueName, setQueueName] = useState<string>('agent-tasks');
  const [queueAction, setQueueAction] = useState('summarize');
  const [queuePrompt, setQueuePrompt] = useState('');
  const [queueResult, setQueueResult] = useState<any>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [consumerHealth, setConsumerHealth] = useState<any>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [queueTaskId, setQueueTaskId] = useState('');
  const [queueLookupResult, setQueueLookupResult] = useState<any>(null);

  // AI Hub
  const [aiHubPrompt, setAiHubPrompt] = useState('');
  const [aiHubProvider, setAiHubProvider] = useState('deepseek');
  const [aiHubResponse, setAiHubResponse] = useState<any>(null);
  const [aiHubLoading, setAiHubLoading] = useState(false);
  const [aiHubHistory, setAiHubHistory] = useState<{ role: string; text: string; provider: string; tokens?: number }[]>([]);
  const [aiProvidersStatus, setAiProvidersStatus] = useState<{ name: string; status: string }[]>([]);

  // AI Chatbox Helper
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Cześć! Jestem asystentem ZENO Ops. Zapytaj mnie o dowolną zakładkę lub funkcję dashboardu — podpowiem co i gdzie wpisać.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  /* ─── Init ─── */
  useEffect(() => {
    // Check all API statuses
    API_SERVICES.forEach((svc, i) => {
      fetch(svc.endpoint)
        .then((r) => (r.ok ? 'online' : 'offline') as Status)
        .catch(() => 'offline' as Status)
        .then((status) => {
          setApis((prev) => prev.map((s, j) => (j === i ? { ...s, status } : s)));
        });
    });

    // Ping connected sites
    apiFetch('/api/sites/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((data: any) => {
        if (data?.results) {
          setSites(data.results.filter((s: any) => s.name !== 'zenbrowsers.org').map((s: any) => ({
            name: s.name, status: s.status, url: s.url,
          })));
        }
      });
  }, []);

  /* ─── API Calls ─── */

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchResults(null);
    const data = await apiFetch('/api/search/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery, limit: 10 }),
    });
    setSearchResults(data?.results || []);
    setSearching(false);
  }, [searchQuery]);

  const handleAI = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResponse(null);
    const data = await apiFetch('/api/ai/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt, maxTokens: 2048 }),
    });
    setAiResponse(data?.content || data?.error || 'No response');
    setAiLoading(false);
  }, [aiPrompt]);

  const loadWorkers = useCallback(async () => {
    setWorkersLoading(true);
    const data = await apiFetch('/api/workers/list');
    if (data?.workers) setWorkers(data.workers);
    setWorkersLoading(false);
  }, []);

  const healthCheckWorkers = useCallback(async () => {
    setWorkersLoading(true);
    const data = await apiFetch('/api/workers/health', { method: 'POST' });
    if (data?.results) {
      setWorkers((prev) => prev.map((w) => {
        const result = data.results.find((r: any) => r.name === w.name);
        return result ? { ...w, status: result.status, latency: result.latencyMs } : w;
      }));
    }
    setWorkersLoading(false);
  }, []);

  const handleContentGenerate = useCallback(async () => {
    if (!contentTopic.trim()) return;
    setContentLoading(true); setContentResult(null);
    const data = await apiFetch('/api/content/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: contentTopic, type: contentType, language: contentLang, tone: contentTone }),
    });
    setContentResult(data);
    setContentLoading(false);
  }, [contentTopic, contentType, contentLang, contentTone]);

  // CMS handlers
  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    const data = await apiFetch('/api/content/articles');
    if (data?.articles) setArticlesList(data.articles);
    setArticlesLoading(false);
  }, []);

  const resetEditor = useCallback(() => {
    setSelectedArticleId(null);
    setArticleTitle(''); setArticleContent(''); setArticleExcerpt('');
    setArticleCategory(''); setArticleTags(''); setArticleLang('pl');
    setArticleSeoTitle(''); setArticleSeoDesc(''); setArticleStatus('draft');
    setCmsMessage(null);
  }, []);

  const openArticle = useCallback(async (slug: string) => {
    const data = await apiFetch(`/api/content/article/${slug}`);
    if (data?.article) {
      const a = data.article;
      setSelectedArticleId(a.id);
      setArticleTitle(a.title || '');
      setArticleContent(a.content || '');
      setArticleExcerpt(a.excerpt || '');
      setArticleCategory(a.category || '');
      setArticleTags(Array.isArray(a.tags) ? a.tags.join(', ') : (a.tags || ''));
      setArticleLang(a.language || 'pl');
      setArticleSeoTitle(a.seo_title || '');
      setArticleSeoDesc(a.seo_description || '');
      setArticleStatus(a.status || 'draft');
      setCmsView('editor');
    }
  }, []);

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[ąà]/g,'a').replace(/[ćč]/g,'c').replace(/[ęè]/g,'e').replace(/[łl]/g,'l')
      .replace(/[ńñ]/g,'n').replace(/[óò]/g,'o').replace(/[śš]/g,'s').replace(/[źżž]/g,'z')
      .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');

  const handleSaveArticle = useCallback(async () => {
    if (!articleTitle.trim()) { setCmsMessage({ type: 'err', text: 'Tytuł jest wymagany' }); return; }
    setCmsSaving(true); setCmsMessage(null);
    const payload = {
      title: articleTitle, slug: slugify(articleTitle), content: articleContent, excerpt: articleExcerpt,
      category: articleCategory, tags: articleTags.split(',').map(t => t.trim()).filter(Boolean),
      language: articleLang, seoTitle: articleSeoTitle, seoDescription: articleSeoDesc,
    };
    const data = await apiFetch<any>('/api/content/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setCmsSaving(false);
    if (data?.slug) {
      setCmsMessage({ type: 'ok', text: `Artykuł zapisany (${data.status})` });
      loadArticles();
    } else {
      setCmsMessage({ type: 'err', text: data?.error || 'Błąd zapisu' });
    }
  }, [articleTitle, articleContent, articleExcerpt, articleCategory, articleTags, articleLang, articleSeoTitle, articleSeoDesc, loadArticles]);

  const handlePublishArticle = useCallback(async () => {
    if (!articleTitle.trim()) return;
    setCmsPublishing(true); setCmsMessage(null);
    const payload = {
      title: articleTitle, slug: slugify(articleTitle), content: articleContent, excerpt: articleExcerpt,
      category: articleCategory, tags: articleTags.split(',').map(t => t.trim()).filter(Boolean),
      language: articleLang, seoTitle: articleSeoTitle, seoDescription: articleSeoDesc,
    };
    const data = await apiFetch<any>('/api/content/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setCmsPublishing(false);
    if (data?.slug) {
      setArticleStatus('published');
      setCmsMessage({ type: 'ok', text: 'Opublikowano!' });
      loadArticles();
    } else {
      setCmsMessage({ type: 'err', text: data?.error || 'Błąd publikacji' });
    }
  }, [articleTitle, articleContent, articleExcerpt, articleCategory, articleTags, articleLang, articleSeoTitle, articleSeoDesc, loadArticles]);

  const handleUnpublishArticle = useCallback(async () => {
    if (!selectedArticleId) return;
    const data = await apiFetch<any>('/api/content/unpublish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugify(articleTitle) }),
    });
    if (data?.status === 'archived') {
      setArticleStatus('archived');
      setCmsMessage({ type: 'ok', text: 'Artykuł zarchiwizowany' });
      loadArticles();
    }
  }, [selectedArticleId, articleTitle, loadArticles]);

  const handleUseGenerated = useCallback(() => {
    if (contentResult?.content) {
      setArticleTitle(contentTopic);
      setArticleContent(contentResult.content);
      setCmsView('editor');
    }
  }, [contentResult, contentTopic]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    const data = await apiFetch(`/api/analytics/overview?period=${analyticsPeriod}`);
    setAnalyticsData(data);
    setAnalyticsLoading(false);
  }, [analyticsPeriod]);

  const loadBuckets = useCallback(async () => {
    setStorageLoading(true);
    const data = await apiFetch('/api/storage/buckets');
    if (data?.buckets) setBuckets(data.buckets);
    setStorageLoading(false);
  }, []);

  const browseBucket = useCallback(async (bucket: string) => {
    setSelectedBucket(bucket); setStorageLoading(true);
    const data = await apiFetch(`/api/storage/browse/${bucket}`);
    setBucketObjects(data?.objects || []);
    setStorageLoading(false);
  }, []);

  const loadDatabases = useCallback(async () => {
    setDbLoading(true);
    const data = await apiFetch('/api/db/databases');
    if (data?.databases) setDatabases(data.databases);
    setDbLoading(false);
  }, []);

  const loadTables = useCallback(async (dbId: string) => {
    setSelectedDb(dbId); setDbLoading(true);
    const data = await apiFetch(`/api/db/tables/${dbId}`);
    setDbTables(data?.tables || []);
    setDbLoading(false);
  }, []);

  const runQuery = useCallback(async () => {
    if (!selectedDb || !sqlQuery.trim()) return;
    setDbLoading(true); setQueryResult(null);
    const data = await apiFetch(`/api/db/query/${selectedDb}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sqlQuery }),
    });
    setQueryResult(data);
    setDbLoading(false);
  }, [selectedDb, sqlQuery]);

  const handleImageGenerate = useCallback(async () => {
    if (!imgPrompt.trim()) return;
    setImgLoading(true); setImgResult(null);
    const data = await apiFetch('/api/images/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: imgPrompt, style: imgStyle, width: 1024, height: 1024 }),
    });
    setImgResult(data);
    setImgLoading(false);
  }, [imgPrompt, imgStyle]);

  const loadCrawlers = useCallback(async () => {
    setCrawlersLoading(true);
    const [historyData, profilesData] = await Promise.all([
      apiFetch(`/api/crawlers/history?period=${crawlersPeriod}`),
      crawlerProfiles.length === 0 ? apiFetch('/api/crawlers/profiles') : Promise.resolve(null),
    ]);
    if (historyData) setCrawlersData(historyData);
    if (profilesData?.profiles) setCrawlerProfiles(profilesData.profiles);
    setCrawlersLoading(false);
  }, [crawlersPeriod, crawlerProfiles.length]);

  const handleMoaGenerate = useCallback(async () => {
    if (!moaTopic.trim()) return;
    setMoaLoading(true); setMoaResult(null);
    const data = await apiFetch('/api/moa/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: moaTopic, type: moaType, language: moaLang }),
    });
    setMoaResult(data);
    setMoaLoading(false);
  }, [moaTopic, moaType, moaLang]);

  const loadPipelines = useCallback(async () => {
    setPipelinesLoading(true);
    const [listData, statsData, eventsData] = await Promise.all([
      apiFetch('/api/pipelines/list'),
      apiFetch('/api/pipelines/stats'),
      apiFetch('/api/pipelines/events?limit=20'),
    ]);
    if (listData) setPipelinesData(listData);
    if (statsData) setPipelineStats(statsData);
    if (eventsData?.events) setPipelineEvents(eventsData.events);
    setPipelinesLoading(false);
  }, []);

  const handleIngest = useCallback(async () => {
    if (!ingestPipeline || !ingestType) return;
    setIngestResult(null);
    let payload = {};
    try { payload = JSON.parse(ingestPayload); } catch { /* use empty */ }
    const data = await apiFetch('/api/pipelines/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: ingestPipeline, event_type: ingestType, payload, source: 'dashboard' }),
    });
    setIngestResult(data);
    if (data?.success) loadPipelines();
  }, [ingestPipeline, ingestType, ingestPayload, loadPipelines]);

  const handleRender = useCallback(async () => {
    if (!renderUrl.trim()) return;
    setRenderLoading(true); setRenderResult(null);
    const payload: any = { url: renderUrl };
    if (renderAction === 'scrape') {
      payload.selectors = renderSelectors.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (renderAction === 'json') {
      payload.prompt = renderPrompt || 'Extract the main content and key information';
    }
    const data = await apiFetch(`/api/render/${renderAction}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setRenderResult(data);
    setRenderLoading(false);
  }, [renderUrl, renderAction, renderSelectors, renderPrompt]);

  const CONSUMER_URL = 'https://zeno-queue-consumer.stolarnia-ams.workers.dev';

  const loadConsumerHealth = useCallback(async () => {
    const data = await apiFetch(CONSUMER_URL + '/');
    setConsumerHealth(data);
  }, []);

  const handleQueueSend = useCallback(async () => {
    if (!queuePrompt.trim()) return;
    setQueueLoading(true); setQueueResult(null);
    const actionMap: Record<string, any> = {
      'agent-tasks': { action: queueAction, prompt: queuePrompt },
      'image-gen': { action: 'generate', prompt: queuePrompt },
      'image-proc': { action: 'analyze', url: queuePrompt },
      'voice': { action: 'transcribe', url: queuePrompt },
    };
    const data = await apiFetch('/api/queues/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue: queueName, data: actionMap[queueName] || { prompt: queuePrompt } }),
    });
    setQueueResult(data);
    setQueueLoading(false);
  }, [queueName, queueAction, queuePrompt]);

  const handleQueueLookup = useCallback(async () => {
    if (!queueTaskId.trim()) return;
    setQueueLookupResult(null);
    const data = await apiFetch(CONSUMER_URL + '/results?taskId=' + encodeURIComponent(queueTaskId));
    setQueueLookupResult(data);
  }, [queueTaskId]);

  const loadRecentResults = useCallback(async () => {
    const data = await apiFetch(CONSUMER_URL + '/results?recent=5');
    if (data?.results) setRecentResults(data.results);
    else if (Array.isArray(data)) setRecentResults(data);
  }, []);

  const handleAiHubChat = useCallback(async () => {
    if (!aiHubPrompt.trim()) return;
    setAiHubLoading(true); setAiHubResponse(null);
    const userText = aiHubPrompt;
    setAiHubPrompt('');
    setAiHubHistory((prev) => [...prev, { role: 'user', text: userText, provider: aiHubProvider }]);

    const data = await apiFetch<any>('/api/ai/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userText, provider: aiHubProvider, maxTokens: 2048 }),
    });

    const reply = data?.content || data?.error || 'Brak odpowiedzi';
    const tokens = data?.usage?.total_tokens || data?.tokens;
    setAiHubResponse(data);
    setAiHubHistory((prev) => [...prev, { role: 'ai', text: reply, provider: data?.provider || aiHubProvider, tokens }]);
    setAiHubLoading(false);
  }, [aiHubPrompt, aiHubProvider]);

  const loadAiProviders = useCallback(async () => {
    const providers = ['deepseek', 'openrouter', 'anthropic', 'workers-ai'];
    const statuses = await Promise.all(
      providers.map(async (p) => {
        const ok = await apiFetch('/api/ai/status');
        return { name: p, status: ok ? 'online' : 'offline' };
      })
    );
    setAiProvidersStatus(statuses);
  }, []);

  const CHAT_SYSTEM_PROMPT = `Jesteś asystentem dashboardu ZENO Ops (zenbrowsers.org). Odpowiadasz TYLKO po polsku. Znasz wszystkie 13 zakładek i ich funkcje:

1. OVERVIEW — Główna strona. Pola: "Search" (wyszukiwarka web), "AI Gate" (pytania do AI — wpisz pytanie i kliknij Ask). Wyświetla status API, podłączone strony, WebGate proxy, link do aplikacji Desktop.

2. WORKERS — Lista Cloudflare Workers. Przycisk "Refresh" ładuje listę, "Health Check" sprawdza status. Filtruj po kategoriach (core, ai, content, ecommerce, analytics, infrastructure).

3. CONTENT (CMS) — System zarządzania treścią. Trzy widoki:
   - "Artykuły" — lista opublikowanych. Kliknij artykuł aby edytować.
   - "Nowy" — edytor: Tytuł (wymagany!), Treść (Markdown), Wstęp, Kategoria, Tagi (oddzielone przecinkami), Język, Status. Sekcja SEO: SEO Title, SEO Description. Przyciski: Zapisz (draft), Opublikuj (publish), Archiwizuj.
   - "Generuj AI" — podaj Temat, Typ (artykuł/blog/social/email/produkt), Język, Ton. Kliknij Generuj, potem "Użyj w edytorze" aby przenieść treść.

4. ANALYTICS — Statystyki odwiedzin. Wybierz okres (24h/7d/30d), kliknij Refresh. Pokazuje: Pageviews, Visitors, Visits per strona.

5. PIPELINES — Event streaming. Pokazuje aktywne pipeline'y, statystyki eventów, architekturę przepływu danych. "Send Test Event": wybierz Pipeline z listy, wpisz Event Type (np. pageview, click), Payload jako JSON, kliknij Send.

6. CRAWLERS — Monitor botów. Okres (24h/7d/30d) + Refresh. Pokazuje: Total Requests, Human vs Bot, unikalne crawlery, nieznane boty. Filtruj po typie.

7. STORAGE — R2 buckety. Kliknij bucket aby przeglądać pliki. Refresh odświeża listę.

8. DATABASES — D1 bazy danych. Kliknij bazę → tabele. SQL Query: wpisz zapytanie SELECT i kliknij Run.

9. IMAGES — Generuj obrazy AI. Wpisz Prompt (opis obrazu po angielsku), wybierz Style, kliknij Generate.

10. MOA — Mixture-of-Agents pipeline. Podaj Topic, Type, Language. Uruchamia wieloetapowy pipeline AI (Drafts → Critique → Aggregation → Validation).

11. RENDER — Browser Rendering. Wpisz URL, wybierz akcję (Screenshot/PDF/Scrape/Markdown/AI JSON). Dla Scrape podaj CSS Selectors, dla AI JSON podaj prompt ekstrakcji.

12. QUEUES — Cloudflare Queues. Wysyłaj zadania AI do kolejek (agent-tasks, image-gen, image-proc, voice). Sprawdzaj status konsumera i przeglądaj wyniki. Lookup: wklej taskId aby pobrać rezultat.

13. AI HUB — Centrum AI. Czat z różnymi providerami (DeepSeek, OpenRouter, Anthropic, Workers AI), historia rozmów, generowanie treści przez kolejki, szybkie akcje AI.

Odpowiadaj krótko i konkretnie. Podawaj dokładne instrukcje krok po kroku.`;

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    const context = chatMessages.slice(-6).map((m) => `${m.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${m.text}`).join('\n');
    const fullPrompt = `${CHAT_SYSTEM_PROMPT}\n\nHistoria:\n${context}\nUżytkownik: ${userMsg}\nAsystent:`;

    const data = await apiFetch<any>('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt, maxTokens: 1024 }),
    });

    const reply = data?.content || data?.error || 'Przepraszam, nie udało się uzyskać odpowiedzi.';
    setChatMessages((prev) => [...prev, { role: 'ai', text: reply }]);
    setChatLoading(false);
  }, [chatInput, chatLoading, chatMessages]);

  /* ─── Tab Load Effects ─── */
  useEffect(() => {
    if (tab === 'workers' && workers.length === 0) loadWorkers();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'crawlers') loadCrawlers();
    if (tab === 'pipelines') loadPipelines();
    if (tab === 'storage' && buckets.length === 0) loadBuckets();
    if (tab === 'databases' && databases.length === 0) loadDatabases();
    if (tab === 'queues') { loadConsumerHealth(); loadRecentResults(); }
    if (tab === 'aihub') loadAiProviders();
  }, [tab]);

  /* ─── Derived ─── */
  const onlineApis = apis.filter((a) => a.status === 'online').length;
  const filteredWorkers = workerFilter === 'all' ? workers : workers.filter((w) => w.category === workerFilter);
  const workerCategories = [...new Set(workers.map((w) => w.category))];

  /* ─── Render ─── */
  return (
    <div className="web-landing ops-dashboard">
      {/* Header */}
      <header className="hero compact">
        <div className="hero-glow" />
        <h1><span className="accent">ZENO</span> Ops</h1>
        <p className="subtitle">Operations Dashboard — zenbrowsers.org</p>
        <div className="hero-stats">
          <span className="stat"><b>{onlineApis}</b>/{apis.length} APIs</span>
          <span className="stat"><b>{sites.filter((s) => s.status === 'online').length}</b>/{sites.length} Sites</span>
          <span className="stat"><b>{workers.length}</b> Workers</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        {TABS.map((t) => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === 'overview' && (
        <div className="tab-content">
          {/* Search */}
          <section className="card search-section">
            <h2>🔍 Search</h2>
            <div className="input-row">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search the web via ZENO..." />
              <button onClick={handleSearch} disabled={searching}>{searching ? '...' : 'Search'}</button>
            </div>
            {searchResults && (
              <div className="results">
                {searchResults.length === 0 ? <p className="muted">No results found.</p> :
                  searchResults.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="result-item">
                      <strong>{r.title}</strong><span className="result-url">{r.url}</span><p>{r.content}</p>
                    </a>
                  ))}
              </div>
            )}
          </section>

          {/* AI Gate */}
          <section className="card ai-section">
            <h2>🤖 AI Gate</h2>
            <div className="input-row">
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ask AI anything..." rows={3} />
              <button onClick={handleAI} disabled={aiLoading}>{aiLoading ? '...' : 'Ask'}</button>
            </div>
            {aiResponse && <div className="ai-output"><pre>{aiResponse}</pre></div>}
          </section>

          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            <section className="card">
              <h2>⚡ API Services ({onlineApis}/{apis.length})</h2>
              <div className="status-list">
                {apis.map((svc) => (
                  <div key={svc.name} className="status-row">
                    <span className={`dot ${svc.status}`} /><span className="name">{svc.name}</span>
                    <code>{svc.endpoint}</code>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>🌐 Connected Sites</h2>
              <div className="status-list">
                {sites.map((site) => (
                  <div key={site.name} className="status-row">
                    <span className={`dot ${site.status}`} />
                    <a href={site.url} target="_blank" rel="noopener noreferrer">{site.name}</a>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>🚀 WebGate</h2>
              <p className="muted">CORS-free web proxy on Cloudflare Edge</p>
              <div className="endpoint-list">
                <code>POST /api/webgate/fetch</code>
                <code>POST /api/webgate/scrape</code>
              </div>
            </section>

            <section className="card">
              <h2>📦 Desktop App</h2>
              <p className="muted">Full ZENO Browser experience with Electron</p>
              <div className="downloads">
                <a href="https://github.com/Bonzokoles/The_GizmoCompany_stos/releases" target="_blank" rel="noopener noreferrer" className="btn-primary">
                  GitHub Releases
                </a>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ─── WORKERS TAB ─── */}
      {tab === 'workers' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>⚙️ Workers Infrastructure ({workers.length})</h2>
            <div className="tab-actions">
              <button className="btn-sm" onClick={loadWorkers} disabled={workersLoading}>Refresh</button>
              <button className="btn-sm btn-accent" onClick={healthCheckWorkers} disabled={workersLoading}>Health Check</button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-bar">
            <button className={`filter-btn ${workerFilter === 'all' ? 'active' : ''}`} onClick={() => setWorkerFilter('all')}>
              All ({workers.length})
            </button>
            {workerCategories.map((cat) => (
              <button key={cat} className={`filter-btn ${workerFilter === cat ? 'active' : ''}`} onClick={() => setWorkerFilter(cat)}>
                {cat} ({workers.filter((w) => w.category === cat).length})
              </button>
            ))}
          </div>

          {workersLoading && <div className="loading-bar" />}

          <div className="workers-grid">
            {filteredWorkers.map((w) => (
              <div key={w.id || w.name} className={`worker-card ${w.status || ''}`}>
                <div className="worker-header">
                  {w.status && <span className={`dot ${w.status}`} />}
                  <span className="worker-name">{w.name}</span>
                  <span className="worker-cat">{w.category}</span>
                </div>
                <p className="worker-desc">{w.description}</p>
                {w.route && <code className="worker-route">{w.route}</code>}
                {w.latency != null && <span className="worker-latency">{w.latency}ms</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CONTENT TAB ─── */}
      {tab === 'content' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>📝 Content & CMS</h2>
            <div className="tab-actions">
              <button className={`btn-sm ${cmsView === 'list' ? 'active' : ''}`} onClick={() => { setCmsView('list'); loadArticles(); }}>📋 Artykuły</button>
              <button className={`btn-sm ${cmsView === 'editor' ? 'active' : ''}`} onClick={() => { resetEditor(); setCmsView('editor'); }}>✏️ Nowy</button>
              <button className={`btn-sm ${cmsView === 'generate' ? 'active' : ''}`} onClick={() => setCmsView('generate')}>🤖 Generuj AI</button>
            </div>
          </div>

          {cmsMessage && (
            <div className={`cms-message ${cmsMessage.type === 'ok' ? 'cms-success' : 'cms-error'}`}>
              {cmsMessage.text}
              <button className="cms-msg-close" onClick={() => setCmsMessage(null)}>×</button>
            </div>
          )}

          {/* ── Articles List ── */}
          {cmsView === 'list' && (
            <section className="card">
              <div className="card-header">
                <h3>Opublikowane artykuły</h3>
                <button className="btn-sm" onClick={loadArticles} disabled={articlesLoading}>
                  {articlesLoading ? 'Ładowanie...' : '🔄 Odśwież'}
                </button>
              </div>
              {articlesList.length === 0 && !articlesLoading && (
                <p className="empty-state">Brak artykułów. Utwórz nowy lub wygeneruj AI.</p>
              )}
              <div className="articles-list">
                {articlesList.map((a: any) => (
                  <div key={a.slug} className="article-row" onClick={() => openArticle(a.slug)}>
                    <div className="article-row-main">
                      <span className="article-title">{a.title}</span>
                      <span className={`status-badge status-${a.status}`}>{a.status}</span>
                    </div>
                    <div className="article-row-meta">
                      {a.category && <span className="tag">{a.category}</span>}
                      <span className="meta-date">{a.published_at ? new Date(a.published_at).toLocaleDateString('pl') : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Article Editor ── */}
          {cmsView === 'editor' && (
            <>
              <section className="card cms-editor">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Tytuł artykułu</label>
                    <input type="text" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Tytuł..." />
                  </div>
                  <div className="form-group full-width">
                    <label>Treść (Markdown)</label>
                    <textarea className="cms-textarea" value={articleContent} onChange={(e) => setArticleContent(e.target.value)} placeholder="Pisz tutaj w Markdown..." rows={16} />
                  </div>
                  <div className="form-group full-width">
                    <label>Wstęp / Excerpt</label>
                    <textarea value={articleExcerpt} onChange={(e) => setArticleExcerpt(e.target.value)} placeholder="Krótki opis artykułu..." rows={3} />
                  </div>
                  <div className="form-group">
                    <label>Kategoria</label>
                    <input type="text" value={articleCategory} onChange={(e) => setArticleCategory(e.target.value)} placeholder="np. Technologia" />
                  </div>
                  <div className="form-group">
                    <label>Tagi (oddzielone przecinkami)</label>
                    <input type="text" value={articleTags} onChange={(e) => setArticleTags(e.target.value)} placeholder="AI, browser, zeno" />
                  </div>
                  <div className="form-group">
                    <label>Język</label>
                    <select value={articleLang} onChange={(e) => setArticleLang(e.target.value)}>
                      <option value="pl">Polski</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={articleStatus} onChange={(e) => setArticleStatus(e.target.value)}>
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
                      <input type="text" value={articleSeoTitle} onChange={(e) => setArticleSeoTitle(e.target.value)} placeholder="Tytuł SEO (opcjonalnie)" />
                    </div>
                    <div className="form-group full-width">
                      <label>SEO Description</label>
                      <textarea value={articleSeoDesc} onChange={(e) => setArticleSeoDesc(e.target.value)} placeholder="Meta opis..." rows={2} />
                    </div>
                  </div>
                </details>

                {/* Actions */}
                <div className="cms-actions">
                  <button className="btn-primary" onClick={handleSaveArticle} disabled={cmsSaving}>
                    {cmsSaving ? 'Zapisywanie...' : '💾 Zapisz'}
                  </button>
                  <button className="btn-success" onClick={handlePublishArticle} disabled={cmsPublishing || !articleTitle.trim()}>
                    {cmsPublishing ? 'Publikowanie...' : '🚀 Opublikuj'}
                  </button>
                  {selectedArticleId && articleStatus === 'published' && (
                    <button className="btn-warning" onClick={handleUnpublishArticle}>📦 Archiwizuj</button>
                  )}
                  <button className="btn-ghost" onClick={() => { resetEditor(); setCmsView('list'); }}>← Wróć do listy</button>
                </div>
              </section>

              {/* Live Preview */}
              {articleContent && (
                <section className="card">
                  <h3>Podgląd</h3>
                  <div className="cms-preview">
                    <h1>{articleTitle || 'Bez tytułu'}</h1>
                    {articleExcerpt && <p className="preview-excerpt">{articleExcerpt}</p>}
                    <pre className="preview-content">{articleContent}</pre>
                  </div>
                </section>
              )}
            </>
          )}

          {/* ── AI Generator ── */}
          {cmsView === 'generate' && (
            <>
              <section className="card">
                <h3>🤖 Generuj treść AI</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Temat / Tytuł</label>
                    <input type="text" value={contentTopic} onChange={(e) => setContentTopic(e.target.value)} placeholder="Wpisz temat..." />
                  </div>
                  <div className="form-group">
                    <label>Typ</label>
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                      <option value="article">Artykuł</option>
                      <option value="blog">Blog Post</option>
                      <option value="social">Social Media</option>
                      <option value="email">Email</option>
                      <option value="product">Opis produktu</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Język</label>
                    <select value={contentLang} onChange={(e) => setContentLang(e.target.value)}>
                      <option value="pl">Polski</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ton</label>
                    <select value={contentTone} onChange={(e) => setContentTone(e.target.value)}>
                      <option value="professional">Profesjonalny</option>
                      <option value="casual">Swobodny</option>
                      <option value="creative">Kreatywny</option>
                      <option value="technical">Techniczny</option>
                      <option value="persuasive">Perswazyjny</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <button className="btn-primary" onClick={handleContentGenerate} disabled={contentLoading}>
                      {contentLoading ? 'Generowanie...' : '🤖 Generuj'}
                    </button>
                  </div>
                </div>
              </section>
              {contentResult && (
                <section className="card">
                  <div className="card-header">
                    <h3>Wygenerowana treść</h3>
                    <button className="btn-sm btn-success" onClick={handleUseGenerated}>✏️ Użyj w edytorze</button>
                  </div>
                  <div className="ai-output"><pre>{contentResult.content || JSON.stringify(contentResult, null, 2)}</pre></div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {tab === 'analytics' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>📈 Analytics Hub</h2>
            <div className="tab-actions">
              <select value={analyticsPeriod} onChange={(e) => { setAnalyticsPeriod(e.target.value); }}>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <button className="btn-sm" onClick={loadAnalytics} disabled={analyticsLoading}>Refresh</button>
            </div>
          </div>

          {analyticsLoading && <div className="loading-bar" />}

          {analyticsData && (
            <>
              {/* Totals */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{analyticsData.totals?.pageviews?.toLocaleString() || '—'}</span>
                  <span className="stat-label">Pageviews</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{analyticsData.totals?.visitors?.toLocaleString() || '—'}</span>
                  <span className="stat-label">Visitors</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{analyticsData.totals?.visits?.toLocaleString() || '—'}</span>
                  <span className="stat-label">Visits</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{analyticsData.trackedSites || '—'}</span>
                  <span className="stat-label">Tracked Sites</span>
                </div>
              </div>

              {/* Per-site */}
              <div className="dashboard-grid">
                {analyticsData.sites?.map((s: any) => (
                  <section key={s.site} className="card">
                    <h3>{s.site}</h3>
                    <div className="mini-stats">
                      <span>👁 {s.stats?.pageviews?.value || 0} pageviews</span>
                      <span>👤 {s.stats?.visitors?.value || 0} visitors</span>
                      <span>🔄 {s.stats?.visits?.value || 0} visits</span>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          {!analyticsData && !analyticsLoading && (
            <section className="card"><p className="muted">Click Refresh to load analytics data.</p></section>
          )}
        </div>
      )}

      {/* ─── CRAWLERS TAB ─── */}
      {tab === 'crawlers' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>🕷️ Crawlers & Bots Monitor</h2>
            <div className="tab-actions">
              <select value={crawlersPeriod} onChange={(e) => setCrawlersPeriod(e.target.value)}>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <button className="btn-sm" onClick={loadCrawlers} disabled={crawlersLoading}>Refresh</button>
            </div>
          </div>

          {crawlersLoading && <div className="loading-bar" />}

          {crawlersData?.summary && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{crawlersData.summary.totalRequests?.toLocaleString() || '—'}</span>
                  <span className="stat-label">Total Requests</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{crawlersData.summary.humanRequests?.toLocaleString() || '—'}</span>
                  <span className="stat-label">Human</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{crawlersData.summary.botRequests?.toLocaleString() || '—'}</span>
                  <span className="stat-label">Bot Requests</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{crawlersData.summary.botPercentage}%</span>
                  <span className="stat-label">Bot Traffic</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{crawlersData.summary.uniqueCrawlers || '—'}</span>
                  <span className="stat-label">Unique Crawlers</span>
                </div>
              </div>

              {/* By Type */}
              {crawlersData.byType && (
                <section className="card">
                  <h3>📊 Requests by Crawler Type</h3>
                  <div className="crawler-type-grid">
                    {Object.entries(crawlersData.byType).sort(([,a]: any, [,b]: any) => b - a).map(([type, count]: any) => (
                      <div key={type} className="crawler-type-item">
                        <span className={`badge badge-${type}`}>{type}</span>
                        <span className="crawler-type-count">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Detected Crawlers */}
              {crawlersData.crawlers?.length > 0 && (
                <section className="card">
                  <h3>🤖 Detected Crawlers ({crawlersData.crawlers.length})</h3>
                  <div className="filter-bar">
                    <button className={`filter-btn ${crawlerFilter === 'all' ? 'active' : ''}`} onClick={() => setCrawlerFilter('all')}>
                      All
                    </button>
                    {[...new Set(crawlersData.crawlers.map((c: any) => c.type))].map((type: any) => (
                      <button key={type} className={`filter-btn ${crawlerFilter === type ? 'active' : ''}`} onClick={() => setCrawlerFilter(type)}>
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="crawlers-list">
                    {crawlersData.crawlers
                      .filter((c: any) => crawlerFilter === 'all' || c.type === crawlerFilter)
                      .map((c: any) => (
                        <div key={c.name} className="crawler-row">
                          <div className="crawler-info">
                            <span className="crawler-name">{c.name}</span>
                            <span className={`badge badge-${c.type}`}>{c.type}</span>
                          </div>
                          <span className="crawler-count">{c.count.toLocaleString()} req</span>
                          <p className="crawler-desc">{c.description}</p>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Unknown Bots */}
              {crawlersData.unknownBots?.length > 0 && (
                <section className="card">
                  <h3>❓ Unknown Bots ({crawlersData.unknownBots.length})</h3>
                  <div className="crawlers-list">
                    {crawlersData.unknownBots.map((b: any, i: number) => (
                      <div key={i} className="crawler-row unknown">
                        <div className="crawler-info">
                          <code className="crawler-ua">{b.userAgent}</code>
                        </div>
                        <span className="crawler-count">{b.count.toLocaleString()} req</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {crawlersData?.note && !crawlersData?.summary && (
            <section className="card">
              <p className="muted">⚠️ {crawlersData.note}</p>
              {crawlersData.crawlersByType && (
                <div className="mini-stats" style={{ marginTop: 12 }}>
                  {Object.entries(crawlersData.crawlersByType).map(([type, count]: any) => (
                    <span key={type}>{type}: {count}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Known Crawler Profiles */}
          {crawlerProfiles.length > 0 && (
            <section className="card">
              <h3>📋 Known Crawler Profiles ({crawlerProfiles.length})</h3>
              <div className="crawlers-list compact">
                {crawlerProfiles.map((p: any) => (
                  <div key={p.name} className="crawler-row">
                    <div className="crawler-info">
                      <span className="crawler-name">{p.name}</span>
                      <span className={`badge badge-${p.type}`}>{p.type}</span>
                    </div>
                    <p className="crawler-desc">{p.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!crawlersData && !crawlersLoading && (
            <section className="card"><p className="muted">Click Refresh to load crawler data.</p></section>
          )}
        </div>
      )}

      {/* ─── STORAGE TAB ─── */}
      {tab === 'storage' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>💾 R2 Storage ({buckets.length} buckets)</h2>
            <button className="btn-sm" onClick={loadBuckets} disabled={storageLoading}>Refresh</button>
          </div>

          {storageLoading && <div className="loading-bar" />}

          <div className="dashboard-grid">
            {buckets.map((b) => (
              <div key={b.name} className={`card bucket-card ${selectedBucket === b.name ? 'selected' : ''}`}
                onClick={() => browseBucket(b.name)} role="button" tabIndex={0}>
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
                  {bucketObjects.map((obj: any, i: number) => (
                    <div key={i} className="object-row">
                      <span>{obj.key}</span>
                      <span className="muted">{obj.size ? `${(obj.size / 1024).toFixed(1)} KB` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ─── DATABASES TAB ─── */}
      {tab === 'databases' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>🗄️ D1 Databases ({databases.length})</h2>
            <button className="btn-sm" onClick={loadDatabases} disabled={dbLoading}>Refresh</button>
          </div>

          {dbLoading && <div className="loading-bar" />}

          <div className="dashboard-grid">
            {databases.map((db) => (
              <div key={db.id} className={`card db-card ${selectedDb === db.id ? 'selected' : ''}`}
                onClick={() => loadTables(db.id)} role="button" tabIndex={0}>
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
                  {dbTables.map((t) => <code key={t} className="table-badge">{t}</code>)}
                </div>
              ) : (
                <p className="muted">No tables found or credentials needed.</p>
              )}

              <div className="query-section">
                <h4>SQL Query (read-only)</h4>
                <div className="input-row">
                  <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM table_name LIMIT 10" rows={3} />
                  <button onClick={runQuery} disabled={dbLoading}>Run</button>
                </div>
              </div>

              {queryResult && (
                <div className="query-results">
                  {queryResult.results?.length > 0 ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>{Object.keys(queryResult.results[0]).map((k) => <th key={k}>{k}</th>)}</tr>
                        </thead>
                        <tbody>
                          {queryResult.results.map((row: any, i: number) => (
                            <tr key={i}>{Object.values(row).map((v: any, j: number) => <td key={j}>{String(v)}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="muted">{queryResult.note || 'No results.'}</p>
                  )}
                  {queryResult.meta && <p className="muted">Rows: {queryResult.meta.rows} | Duration: {queryResult.meta.duration}ms</p>}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ─── IMAGES TAB ─── */}
      {tab === 'images' && (
        <div className="tab-content">
          <h2>🖼️ AI Image Generation</h2>
          <section className="card">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Prompt</label>
                <textarea value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..." rows={3} />
              </div>
              <div className="form-group">
                <label>Style</label>
                <select value={imgStyle} onChange={(e) => setImgStyle(e.target.value)}>
                  <option value="">Default</option>
                  <option value="photorealistic">Photorealistic</option>
                  <option value="digital art">Digital Art</option>
                  <option value="anime">Anime</option>
                  <option value="oil painting">Oil Painting</option>
                  <option value="watercolor">Watercolor</option>
                  <option value="3d render">3D Render</option>
                </select>
              </div>
              <div className="form-group">
                <button className="btn-primary" onClick={handleImageGenerate} disabled={imgLoading}>
                  {imgLoading ? 'Generating...' : 'Generate Image'}
                </button>
              </div>
            </div>
          </section>
          {imgResult && (
            <section className="card">
              <h3>Result</h3>
              <div className="ai-output"><pre>{JSON.stringify(imgResult, null, 2)}</pre></div>
            </section>
          )}
        </div>
      )}

      {/* ─── MOA TAB ─── */}
      {tab === 'moa' && (
        <div className="tab-content">
          <h2>🧬 Mixture-of-Agents Pipeline</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Multi-stage AI pipeline: Parallel Writing → Critique → Aggregation → Validation
          </p>
          <section className="card">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Topic</label>
                <input type="text" value={moaTopic} onChange={(e) => setMoaTopic(e.target.value)} placeholder="Enter topic for MOA pipeline..." />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={moaType} onChange={(e) => setMoaType(e.target.value)}>
                  <option value="article">Article</option>
                  <option value="blog">Blog Post</option>
                  <option value="social">Social Media</option>
                  <option value="product">Product Description</option>
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <select value={moaLang} onChange={(e) => setMoaLang(e.target.value)}>
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="form-group">
                <button className="btn-primary" onClick={handleMoaGenerate} disabled={moaLoading}>
                  {moaLoading ? 'Running Pipeline...' : 'Run MOA Pipeline'}
                </button>
              </div>
            </div>
          </section>

          {moaResult && (
            <section className="card">
              <h3>MOA Pipeline Result</h3>
              {moaResult.pipeline && (
                <div className="moa-meta">
                  <div className="moa-stages">
                    {moaResult.pipeline.stages?.map((s: string) => (
                      <span key={s} className="badge badge-green">{s}</span>
                    ))}
                  </div>
                  <div className="mini-stats">
                    <span>Drafts: {moaResult.pipeline.draftsGenerated}</span>
                    <span>Quality: {moaResult.pipeline.qualityScore}/10</span>
                    <span>Time: {(moaResult.pipeline.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                  {moaResult.pipeline.scores && (
                    <div className="moa-scores">
                      {moaResult.pipeline.scores.map((s: any) => (
                        <span key={s.model} className="score-badge">{s.model}: {s.score}/10</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="ai-output"><pre>{moaResult.content}</pre></div>
            </section>
          )}
        </div>
      )}

      {/* ─── PIPELINES TAB ─── */}
      {tab === 'pipelines' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>🔀 Event Pipelines</h2>
            <div className="tab-actions">
              <button className="btn-sm" onClick={loadPipelines} disabled={pipelinesLoading}>Refresh</button>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 16 }}>
            LinkedOut-style event streaming: Source → CF Worker → D1 → R2 Data Catalog (Iceberg) → R2 SQL
          </p>

          {pipelinesLoading && <div className="loading-bar" />}

          {/* Pipeline Stats */}
          {pipelineStats?.summary && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{pipelineStats.summary.totalPipelines}</span>
                <span className="stat-label">Pipelines</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{pipelineStats.summary.active}</span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{pipelineStats.summary.totalEventsPerDay?.toLocaleString()}</span>
                <span className="stat-label">Events / Day</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{pipelineStats.summary.estimatedMonthly?.toLocaleString()}</span>
                <span className="stat-label">Est. Monthly</span>
              </div>
            </div>
          )}

          {/* Data Flow Architecture */}
          {pipelineStats?.dataFlow && (
            <section className="card pipeline-architecture">
              <h3>📐 Data Flow Architecture</h3>
              <div className="pipeline-flow">
                <div className="flow-stage">
                  <span className="flow-icon">📡</span>
                  <span className="flow-label">Sources</span>
                  <div className="flow-items">
                    {pipelineStats.dataFlow.sources.map((s: string) => (
                      <span key={s} className="badge">{s}</span>
                    ))}
                  </div>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-stage">
                  <span className="flow-icon">⚡</span>
                  <span className="flow-label">CF Worker</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-stage">
                  <span className="flow-icon">🗃️</span>
                  <span className="flow-label">D1 Events</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-stage">
                  <span className="flow-icon">🧊</span>
                  <span className="flow-label">R2 Iceberg</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-stage">
                  <span className="flow-icon">📊</span>
                  <span className="flow-label">R2 SQL</span>
                </div>
              </div>
            </section>
          )}

          {/* Category Filter */}
          {pipelinesData && (
            <div className="filter-bar">
              <button className={`filter-btn ${pipelineFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPipelineFilter('all')}>
                All ({pipelinesData.total})
              </button>
              {Object.entries(pipelinesData.categories || {}).map(([cat, count]) => (
                <button key={cat} className={`filter-btn ${pipelineFilter === cat ? 'active' : ''}`}
                  onClick={() => setPipelineFilter(cat)}>
                  {cat} ({count as number})
                </button>
              ))}
            </div>
          )}

          {/* Pipeline Cards */}
          <div className="pipeline-grid">
            {(pipelinesData?.pipelines || [])
              .filter((p: any) => pipelineFilter === 'all' || p.category === pipelineFilter)
              .map((p: any) => (
                <div key={p.id} className={`pipeline-card pipeline-${p.status}`}>
                  <div className="pipeline-header">
                    <span className={`dot ${p.status === 'active' ? 'healthy' : p.status === 'paused' ? 'warning' : 'error'}`} />
                    <span className="pipeline-name">{p.name}</span>
                    <span className="pipeline-cat">{p.category}</span>
                  </div>
                  <p className="pipeline-desc">{p.description}</p>
                  <div className="pipeline-meta">
                    <span>📡 {p.source}</span>
                    <span>📦 {p.destination}</span>
                    {p.status === 'active' && <span>⚡ ~{p.eventsPerDay.toLocaleString()} events/day</span>}
                    {p.status === 'paused' && <span className="badge badge-yellow">Paused</span>}
                  </div>
                </div>
              ))}
          </div>

          {/* Recent Events */}
          {pipelineEvents.length > 0 && (
            <section className="card">
              <h3>📋 Recent Events</h3>
              <div className="events-table-wrapper">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>Pipeline</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineEvents.slice(0, 15).map((evt: any) => (
                      <tr key={evt.id}>
                        <td><code>{evt.pipeline_id}</code></td>
                        <td>{evt.event_type}</td>
                        <td>{evt.source}</td>
                        <td>{new Date(evt.timestamp).toLocaleString('pl-PL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Ingest Test Event */}
          <section className="card">
            <h3>🧪 Send Test Event</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Pipeline</label>
                <select value={ingestPipeline} onChange={(e) => setIngestPipeline(e.target.value)}>
                  <option value="">Select pipeline...</option>
                  {PIPELINES_LIST.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Event Type</label>
                <input type="text" value={ingestType} onChange={(e) => setIngestType(e.target.value)}
                  placeholder="pageview, click, purchase..." />
              </div>
              <div className="form-group full-width">
                <label>Payload (JSON)</label>
                <textarea value={ingestPayload} onChange={(e) => setIngestPayload(e.target.value)}
                  rows={2} placeholder='{"page": "/home", "referrer": "google.com"}' />
              </div>
              <div className="form-group">
                <button className="btn-primary" onClick={handleIngest} disabled={!ingestPipeline || !ingestType}>
                  Send Event
                </button>
              </div>
            </div>
            {ingestResult && (
              <div className={`ingest-result ${ingestResult.success ? 'success' : 'error'}`}>
                {ingestResult.success
                  ? `✅ Event ${ingestResult.eventId} ingested into ${ingestResult.pipeline}`
                  : `❌ ${ingestResult.error}`}
              </div>
            )}
          </section>

          {/* DB Stats */}
          {pipelineStats?.dbStats && pipelineStats.dbStats.length > 0 && (
            <section className="card">
              <h3>💾 D1 Storage Stats</h3>
              <div className="dashboard-grid">
                {pipelineStats.dbStats.map((s: any) => (
                  <div key={s.pipeline_id} className="card" style={{ background: 'var(--color-bg)' }}>
                    <h4>{s.pipeline_id}</h4>
                    <div className="mini-stats">
                      <span>📊 {s.count} events</span>
                      <span>🕐 First: {new Date(s.first_event).toLocaleDateString('pl-PL')}</span>
                      <span>🕐 Last: {new Date(s.last_event).toLocaleDateString('pl-PL')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!pipelinesData && !pipelinesLoading && (
            <section className="card"><p className="muted">Click Refresh to load pipeline data.</p></section>
          )}
        </div>
      )}

      {/* ─── RENDER TAB ─── */}
      {tab === 'render' && (
        <div className="tab-content">
          <h2>🌐 Browser Rendering</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Screenshot, PDF, Scrape, Markdown &amp; AI JSON extraction via Cloudflare Browser Rendering
          </p>
          <section className="card">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>URL</label>
                <input type="text" value={renderUrl} onChange={(e) => setRenderUrl(e.target.value)}
                  placeholder="https://example.com" />
              </div>
              <div className="form-group">
                <label>Action</label>
                <select value={renderAction} onChange={(e) => setRenderAction(e.target.value as any)}>
                  <option value="screenshot">📸 Screenshot</option>
                  <option value="pdf">📄 PDF</option>
                  <option value="scrape">🔍 Scrape</option>
                  <option value="markdown">📝 Markdown</option>
                  <option value="json">🤖 AI JSON Extract</option>
                </select>
              </div>
              {renderAction === 'scrape' && (
                <div className="form-group">
                  <label>CSS Selectors (comma-separated)</label>
                  <input type="text" value={renderSelectors} onChange={(e) => setRenderSelectors(e.target.value)}
                    placeholder="h1, h2, p, a" />
                </div>
              )}
              {renderAction === 'json' && (
                <div className="form-group full-width">
                  <label>AI Prompt</label>
                  <textarea value={renderPrompt} onChange={(e) => setRenderPrompt(e.target.value)}
                    placeholder="Extract the main products with names and prices..." rows={2} />
                </div>
              )}
              <div className="form-group">
                <button className="btn-primary" onClick={handleRender} disabled={renderLoading}>
                  {renderLoading ? 'Rendering...' : 'Render'}
                </button>
              </div>
            </div>
          </section>

          {renderResult && (
            <section className="card render-result">
              <h3>Result</h3>
              {renderResult.error && <p className="error-text">❌ {renderResult.error}</p>}

              {/* Screenshot preview */}
              {renderResult.image && (
                <div className="render-preview">
                  <div className="render-meta">
                    <span>📸 {renderResult.url}</span>
                    <span>{(renderResult.size / 1024).toFixed(1)} KB</span>
                    <a href={renderResult.image} download={`screenshot-${Date.now()}.png`} className="btn-sm btn-accent">Download PNG</a>
                  </div>
                  <img src={renderResult.image} alt="Screenshot" className="render-screenshot" />
                </div>
              )}

              {/* PDF download */}
              {renderResult.data && renderResult.format === 'pdf' && (
                <div className="render-preview">
                  <div className="render-meta">
                    <span>📄 {renderResult.url}</span>
                    <span>{(renderResult.size / 1024).toFixed(1)} KB</span>
                    <a href={renderResult.data} download={`page-${Date.now()}.pdf`} className="btn-sm btn-accent">Download PDF</a>
                  </div>
                  <iframe src={renderResult.data} className="render-pdf-preview" title="PDF Preview" />
                </div>
              )}

              {/* Markdown output */}
              {renderResult.markdown && (
                <div className="render-preview">
                  <div className="render-meta">
                    <span>📝 Markdown from {renderResult.url}</span>
                    <button className="btn-sm" onClick={() => navigator.clipboard.writeText(renderResult.markdown)}>Copy</button>
                  </div>
                  <pre className="render-markdown">{renderResult.markdown}</pre>
                </div>
              )}

              {/* Scrape results */}
              {renderResult.result && renderAction === 'scrape' && (
                <div className="render-preview">
                  <div className="render-meta">
                    <span>🔍 Scraped {renderResult.selectors?.length || 0} selectors from {renderResult.url}</span>
                  </div>
                  {Array.isArray(renderResult.result) && renderResult.result.map((group: any, gi: number) => (
                    <div key={gi} className="scrape-group">
                      <h4><code>{group.selector}</code> ({group.results?.length || 0} matches)</h4>
                      <div className="scrape-items">
                        {group.results?.slice(0, 20).map((item: any, ii: number) => (
                          <div key={ii} className="scrape-item">
                            <span className="scrape-text">{item.text}</span>
                            {item.attributes?.find((a: any) => a.name === 'href') && (
                              <code className="scrape-href">{item.attributes.find((a: any) => a.name === 'href').value}</code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON AI result */}
              {renderResult.result && renderAction === 'json' && (
                <div className="render-preview">
                  <div className="render-meta">
                    <span>🤖 AI extracted from {renderResult.url}</span>
                    <span>Prompt: {renderResult.prompt}</span>
                  </div>
                  <pre className="render-json">{JSON.stringify(renderResult.result, null, 2)}</pre>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ─── QUEUES TAB ─── */}
      {tab === 'queues' && (
        <div className="tab-content">
          <div className="tab-header">
            <h2>📨 Cloudflare Queues</h2>
            <div className="tab-actions">
              <button className="btn-sm" onClick={() => { loadConsumerHealth(); loadRecentResults(); }}>Refresh</button>
            </div>
          </div>

          {/* Consumer Health */}
          <section className="card">
            <h3>🏥 Queue Consumer Status</h3>
            {consumerHealth ? (
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><span className="stat-label">Status</span><span className="stat-value" style={{ color: '#4ade80' }}>✅ Online</span></div>
                <div className="stat-card"><span className="stat-label">Service</span><span className="stat-value">{consumerHealth.service || 'queue-consumer'}</span></div>
                <div className="stat-card"><span className="stat-label">Queues</span><span className="stat-value">{consumerHealth.queues?.join(', ') || 'agent-tasks, image, voice'}</span></div>
                <div className="stat-card"><span className="stat-label">AI Fallback</span><span className="stat-value">{consumerHealth.ai_fallback || 'Gemma 7b-it'}</span></div>
              </div>
            ) : (
              <p className="muted">Sprawdzam status konsumera...</p>
            )}
          </section>

          {/* Send Task */}
          <section className="card">
            <h3>📤 Wyślij zadanie do kolejki</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Queue</label>
                <select value={queueName} onChange={(e) => setQueueName(e.target.value)}>
                  <option value="agent-tasks">🤖 Agent Tasks (AI text)</option>
                  <option value="image-gen">🖼️ Image Generation</option>
                  <option value="image-proc">👁️ Image Analysis</option>
                  <option value="voice">🎙️ Voice Processing</option>
                </select>
              </div>
              {queueName === 'agent-tasks' && (
                <div className="form-group">
                  <label>Action</label>
                  <select value={queueAction} onChange={(e) => setQueueAction(e.target.value)}>
                    <option value="summarize">Summarize</option>
                    <option value="translate">Translate</option>
                    <option value="analyze">Analyze</option>
                    <option value="generate">Generate</option>
                  </select>
                </div>
              )}
              <div className="form-group full-width">
                <label>{queueName === 'voice' ? 'Audio URL' : queueName === 'image-proc' ? 'Image URL' : 'Prompt / Input'}</label>
                <textarea value={queuePrompt} onChange={(e) => setQueuePrompt(e.target.value)}
                  placeholder={queueName === 'voice' ? 'https://example.com/audio.mp3' : queueName === 'image-proc' ? 'https://example.com/image.jpg' : 'Opisz co ma zrobić AI...'}
                  rows={3} />
              </div>
              <div className="form-group">
                <button className="btn-primary" onClick={handleQueueSend} disabled={queueLoading}>
                  {queueLoading ? 'Wysyłam...' : '📤 Wyślij'}
                </button>
              </div>
            </div>
            {queueResult && (
              <div className="ai-output" style={{ marginTop: 16 }}>
                <h4>{queueResult.ok ? '✅ Wysłano!' : '❌ Błąd'}</h4>
                <pre>{JSON.stringify(queueResult, null, 2)}</pre>
              </div>
            )}
          </section>

          {/* Lookup Result */}
          <section className="card">
            <h3>🔍 Szukaj wyniku (Task ID)</h3>
            <div className="input-row">
              <input type="text" value={queueTaskId} onChange={(e) => setQueueTaskId(e.target.value)}
                placeholder="Wklej taskId z odpowiedzi..." />
              <button onClick={handleQueueLookup}>Szukaj</button>
            </div>
            {queueLookupResult && (
              <div className="ai-output" style={{ marginTop: 12 }}>
                <pre>{JSON.stringify(queueLookupResult, null, 2)}</pre>
              </div>
            )}
          </section>

          {/* Recent Results */}
          <section className="card">
            <h3>📋 Ostatnie wyniki</h3>
            {recentResults.length > 0 ? (
              <div className="status-list">
                {recentResults.map((r, i) => (
                  <div key={i} className="status-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, width: '100%', alignItems: 'center' }}>
                      <span className={`dot ${r.status === 'completed' ? 'online' : r.status === 'error' ? 'offline' : 'checking'}`} />
                      <strong>{r.queue || r.type}</strong>
                      <code style={{ fontSize: 11, opacity: 0.6 }}>{r.task_id?.slice(0, 20)}...</code>
                      <span className="muted" style={{ marginLeft: 'auto' }}>{r.provider || ''}</span>
                    </div>
                    {r.result && <pre style={{ fontSize: 12, maxHeight: 100, overflow: 'auto', width: '100%', margin: 0, opacity: 0.8 }}>{typeof r.result === 'string' ? r.result.slice(0, 200) : JSON.stringify(r.result, null, 2).slice(0, 200)}</pre>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Brak wyników. Wyślij zadanie lub kliknij Refresh.</p>
            )}
          </section>
        </div>
      )}

      {/* ─── AI HUB TAB ─── */}
      {tab === 'aihub' && (
        <div className="tab-content">
          <h2>🤖 AI Hub — Centrum Sztucznej Inteligencji</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Czat z wieloma providerami AI, generowanie treści, obrazów i transkrypcji przez kolejki
          </p>

          {/* Provider Status */}
          <section className="card">
            <h3>📡 Dostępne Providery AI</h3>
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {[
                { name: 'DeepSeek', key: 'deepseek', icon: '🧠', desc: 'R1 — najtańszy, szybki' },
                { name: 'OpenRouter', key: 'openrouter', icon: '🌐', desc: '8 modeli — fallback' },
                { name: 'Anthropic', key: 'anthropic', icon: '🔮', desc: 'Claude — premium' },
                { name: 'Workers AI', key: 'workers-ai', icon: '⚡', desc: 'Gemma 7b-it — darmowy (PL)' },
              ].map((p) => {
                const s = aiProvidersStatus.find((x) => x.name === p.key);
                return (
                  <div key={p.key} className="stat-card" style={{ cursor: 'pointer', border: aiHubProvider === p.key ? '1px solid #60a5fa' : '1px solid transparent' }}
                    onClick={() => setAiHubProvider(p.key)}>
                    <span className="stat-label">{p.icon} {p.name}</span>
                    <span className="stat-value" style={{ fontSize: 13 }}>{p.desc}</span>
                    <span className={`dot ${s?.status === 'online' ? 'online' : 'checking'}`} style={{ marginTop: 4 }} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* AI Chat */}
          <section className="card">
            <h3>💬 AI Chat — {aiHubProvider.toUpperCase()}</h3>
            <div className="chatbox-messages" style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 12, padding: '8px 0' }}>
              {aiHubHistory.length === 0 && <p className="muted">Zacznij rozmowę — wpisz pytanie poniżej</p>}
              {aiHubHistory.map((msg, i) => (
                <div key={i} className={`chat-msg chat-${msg.role === 'user' ? 'user' : 'ai'}`} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span className="chat-role">{msg.role === 'user' ? 'Ty' : 'AI'}</span>
                    <code style={{ fontSize: 10, opacity: 0.5 }}>{msg.provider}</code>
                    {msg.tokens && <span style={{ fontSize: 10, opacity: 0.5 }}>({msg.tokens} tokens)</span>}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                </div>
              ))}
              {aiHubLoading && (
                <div className="chat-msg chat-ai">
                  <span className="chat-role">AI</span>
                  <p className="chat-typing">Myślę...</p>
                </div>
              )}
            </div>
            <div className="input-row">
              <select value={aiHubProvider} onChange={(e) => setAiHubProvider(e.target.value)} style={{ maxWidth: 150 }}>
                <option value="deepseek">🧠 DeepSeek</option>
                <option value="openrouter">🌐 OpenRouter</option>
                <option value="anthropic">🔮 Anthropic</option>
                <option value="workers-ai">⚡ Workers AI</option>
              </select>
              <textarea value={aiHubPrompt} onChange={(e) => setAiHubPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiHubChat(); } }}
                placeholder="Zapytaj AI o cokolwiek..." rows={2} style={{ flex: 1 }} />
              <button className="btn-primary" onClick={handleAiHubChat} disabled={aiHubLoading}>
                {aiHubLoading ? '...' : '➤'}
              </button>
            </div>
          </section>

          {/* Quick Actions via Queues */}
          <section className="card">
            <h3>⚡ Szybkie Akcje AI (via Queues)</h3>
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { setTab('queues'); setQueueName('agent-tasks'); setQueueAction('summarize'); }}>
                <span className="stat-label">📝 Podsumuj tekst</span>
                <span className="stat-value" style={{ fontSize: 12 }}>Agent Tasks → Summarize</span>
              </div>
              <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { setTab('queues'); setQueueName('agent-tasks'); setQueueAction('translate'); }}>
                <span className="stat-label">🌍 Przetłumacz</span>
                <span className="stat-value" style={{ fontSize: 12 }}>Agent Tasks → Translate</span>
              </div>
              <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { setTab('queues'); setQueueName('image-gen'); }}>
                <span className="stat-label">🖼️ Generuj obraz</span>
                <span className="stat-value" style={{ fontSize: 12 }}>SD-XL Lightning</span>
              </div>
              <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { setTab('queues'); setQueueName('voice'); }}>
                <span className="stat-label">🎙️ Transkrypcja audio</span>
                <span className="stat-value" style={{ fontSize: 12 }}>Whisper STT</span>
              </div>
            </div>
          </section>

          {/* AI Tools Overview */}
          <section className="card">
            <h3>🛠️ Narzędzia AI w ZENO</h3>
            <div className="status-list">
              <div className="status-row"><span className="dot online" /><span className="name">AI Chat (Overview)</span><code>/api/ai/chat</code></div>
              <div className="status-row"><span className="dot online" /><span className="name">Content Generator (CMS)</span><code>/api/content/generate</code></div>
              <div className="status-row"><span className="dot online" /><span className="name">MOA Pipeline</span><code>/api/moa/generate</code></div>
              <div className="status-row"><span className="dot online" /><span className="name">Image Generation</span><code>/api/images/generate</code></div>
              <div className="status-row"><span className="dot online" /><span className="name">Browser AI Extract</span><code>/api/render/json</code></div>
              <div className="status-row"><span className="dot online" /><span className="name">Queue Consumer (AI)</span><code>zeno-queue-consumer.workers.dev</code></div>
            </div>
          </section>
        </div>
      )}

      <footer>
        <p>ZENO Ops &copy; {new Date().getFullYear()} — Powered by Cloudflare Workers &amp; AI</p>
      </footer>

      {/* ─── AI CHATBOX HELPER ─── */}
      <button className="chat-toggle" onClick={() => setChatOpen((o) => !o)} title="Asystent ZENO">
        {chatOpen ? '✕' : '💬'}
      </button>

      {chatOpen && (
        <div className="ops-chatbox">
          <div className="chatbox-header">
            <span>🤖 Asystent ZENO Ops</span>
            <button className="chatbox-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="chatbox-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-${msg.role}`}>
                <span className="chat-role">{msg.role === 'user' ? 'Ty' : 'AI'}</span>
                <p>{msg.text}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-msg chat-ai">
                <span className="chat-role">AI</span>
                <p className="chat-typing">Myślę...</p>
              </div>
            )}
          </div>
          <div className="chatbox-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Zapytaj o funkcje dashboardu..."
            />
            <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? '...' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
