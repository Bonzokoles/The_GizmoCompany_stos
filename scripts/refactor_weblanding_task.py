from pathlib import Path
import re


ROOT = Path("u:/WWW_Zen_BRo_wser_org3")
SRC = ROOT / "src/components/landing/WebLanding.tsx"
BASE = ROOT / "src/components/landing"


def normalize(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def write(path: Path, content: str):
    ensure_dir(path.parent)
    path.write_text(content, encoding="utf-8")


def extract_section(text: str, start_marker: str, end_marker: str) -> str:
    s = text.index(start_marker)
    e = text.index(end_marker, s)
    return text[s:e]


def find_statement(text: str, startswith: str) -> str:
    i = text.index(startswith)
    depth = 0
    in_str = False
    str_ch = ""
    esc = False
    j = i
    while j < len(text):
        ch = text[j]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == str_ch:
                in_str = False
        else:
            if ch in ('"', "'", "`"):
                in_str = True
                str_ch = ch
            elif ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif ch == ";" and depth == 0:
                return text[i : j + 1]
        j += 1
    raise ValueError(f"Could not extract statement for {startswith}")


def trim2(s: str) -> str:
    lines = s.split("\n")
    out = []
    for ln in lines:
        if ln.startswith("  "):
            out.append(ln[2:])
        else:
            out.append(ln)
    return "\n".join(out).strip("\n")


def extract_tab_inner(text: str, tab_id: str) -> str:
    pattern = '{tab === "' + tab_id + '" && ('
    i = text.index(pattern)
    open_paren = text.index("(", i + len(pattern) - 1)
    depth = 1
    j = open_paren + 1
    in_str = False
    str_ch = ""
    esc = False
    while j < len(text):
        ch = text[j]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == str_ch:
                in_str = False
        else:
            if ch in ('"', "'", "`"):
                in_str = True
                str_ch = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    return text[open_paren + 1 : j].strip("\n")
        j += 1
    raise ValueError(f"Tab block parse failed for {tab_id}")


def make_hook(text: str, state_starts, cb_starts, extra_starts=None) -> str:
    extra_starts = extra_starts or []
    parts = []
    for s in state_starts + extra_starts + cb_starts:
        parts.append(trim2(find_statement(text, s)))
    return "\n\n".join(parts)


def build_component(name: str, props_type: str, destructure: list[str], jsx_inner: str) -> str:
    destruct = ", ".join(destructure)
    return f'''import type {{ {props_type} }} from "./types";

export function {name}({{ {destruct} }}: {props_type}) {{
  return (
{jsx_inner}
  );
}}
'''


def build_types(props_type: str) -> str:
    return f'''export interface {props_type} {{
  [key: string]: any;
}}
'''


def main():
    src = normalize(SRC.read_text(encoding="utf-8"))

    # shared files
    types_section = extract_section(src, "type TabId =", "/* ─── Constants")
    constants_section = extract_section(src, "const TABS", "/* ─── Helpers")
    api_fetch = trim2(find_statement(src, "async function apiFetch"))

    write(
        BASE / "shared/types.ts",
        f'''{types_section.strip()}\n''',
    )
    write(
        BASE / "shared/constants.ts",
        f'''{constants_section.strip()}\n''',
    )
    write(
        BASE / "shared/api.ts",
        f'''{api_fetch}\n''',
    )

    tabs = [
        ("overview", "OverviewTab", "useOverview"),
        ("workers", "WorkersTab", "useWorkers"),
        ("content", "ContentTab", "useContent"),
        ("analytics", "AnalyticsTab", "useAnalytics"),
        ("crawlers", "CrawlersTab", "useCrawlers"),
        ("storage", "StorageTab", "useStorage"),
        ("databases", "DatabasesTab", "useDatabases"),
        ("images", "ImagesTab", "useImages"),
        ("moa", "MoaTab", "useMoa"),
        ("pipelines", "PipelinesTab", "usePipelines"),
        ("render", "RenderTab", "useRender"),
        ("queues", "QueuesTab", "useQueues"),
        ("aihub", "AiHubTab", "useAiHub"),
        ("biztools", "BizToolsTab", "useBizTools"),
        ("workflows", "WorkflowsTab", "useWorkflows"),
        ("mediahub", "MediaHubTab", None),
    ]

    props_map = {
        "overview": [
            "searchQuery", "setSearchQuery", "searchResults", "searching", "aiPrompt", "setAiPrompt", "aiResponse", "aiLoading", "handleSearch", "handleAI", "onlineApis", "apis", "sites"
        ],
        "workers": [
            "workers", "workerFilter", "setWorkerFilter", "workersLoading", "loadWorkers", "healthCheckWorkers", "filteredWorkers", "workerCategories"
        ],
        "content": [
            "cmsView", "setCmsView", "loadArticles", "resetEditor", "cmsMessage", "setCmsMessage", "articlesList", "articlesLoading", "openArticle", "articleTitle", "setArticleTitle", "articleContent", "setArticleContent", "articleExcerpt", "setArticleExcerpt", "articleCategory", "setArticleCategory", "articleTags", "setArticleTags", "articleLang", "setArticleLang", "articleStatus", "setArticleStatus", "articleSeoTitle", "setArticleSeoTitle", "articleSeoDesc", "setArticleSeoDesc", "handleSaveArticle", "cmsSaving", "handlePublishArticle", "cmsPublishing", "selectedArticleId", "handleUnpublishArticle", "contentTopic", "setContentTopic", "contentType", "setContentType", "contentLang", "setContentLang", "contentTone", "setContentTone", "handleContentGenerate", "contentLoading", "contentResult", "handleUseGenerated"
        ],
        "analytics": [
            "analyticsSource", "setAnalyticsSource", "analyticsPeriod", "setAnalyticsPeriod", "loadAnalytics", "analyticsLoading", "analyticsData", "ANALYTICS_SOURCES"
        ],
        "crawlers": [
            "crawlersPeriod", "setCrawlersPeriod", "loadCrawlers", "crawlersLoading", "crawlersData", "crawlerFilter", "setCrawlerFilter", "crawlerProfiles"
        ],
        "storage": [
            "buckets", "loadBuckets", "storageLoading", "selectedBucket", "browseBucket", "bucketObjects"
        ],
        "databases": [
            "databases", "loadDatabases", "dbLoading", "selectedDb", "loadTables", "dbTables", "sqlQuery", "setSqlQuery", "runQuery", "queryResult"
        ],
        "images": [
            "imgPrompt", "setImgPrompt", "imgStyle", "setImgStyle", "handleImageGenerate", "imgLoading", "imgResult"
        ],
        "moa": [
            "moaTopic", "setMoaTopic", "moaType", "setMoaType", "moaLang", "setMoaLang", "handleMoaGenerate", "moaLoading", "moaResult"
        ],
        "pipelines": [
            "loadPipelines", "pipelinesLoading", "pipelineStats", "pipelinesData", "pipelineFilter", "setPipelineFilter", "pipelineEvents", "ingestPipeline", "setIngestPipeline", "PIPELINES_LIST", "ingestType", "setIngestType", "ingestPayload", "setIngestPayload", "handleIngest", "ingestResult"
        ],
        "render": [
            "renderUrl", "setRenderUrl", "renderAction", "setRenderAction", "renderSelectors", "setRenderSelectors", "renderPrompt", "setRenderPrompt", "handleRender", "renderLoading", "renderResult"
        ],
        "queues": [
            "loadConsumerHealth", "loadRecentResults", "consumerHealth", "queueName", "setQueueName", "queueAction", "setQueueAction", "queuePrompt", "setQueuePrompt", "handleQueueSend", "queueLoading", "queueResult", "queueTaskId", "setQueueTaskId", "handleQueueLookup", "queueLookupResult", "recentResults"
        ],
        "aihub": [
            "aiProvidersStatus", "aiHubProvider", "setAiHubProvider", "aiHubHistory", "aiHubLoading", "aiHubPrompt", "setAiHubPrompt", "handleAiHubChat", "setTab", "setQueueName", "setQueueAction"
        ],
        "biztools": [
            "BIZTOOLS_CATALOG", "bizSearch", "setBizSearch", "bizCategory", "setBizCategory", "BIZ_CATEGORIES", "tavilyKey", "setTavilyKey", "tavilyQuery", "setTavilyQuery", "handleTavilySearch", "tavilyLoading", "tavilyError", "tavilyResults"
        ],
        "workflows": [
            "workflowEndpoint", "setWorkflowEndpoint", "loadWorkflowStatuses", "workflowList", "workflowSelected", "setWorkflowSelected", "setWorkflowParams", "setWorkflowResult", "workflowParams", "handleWorkflowTrigger", "workflowLoading", "workflowResult", "workflowStatuses"
        ],
        "mediahub": [],
    }

    hook_specs = {
        "overview": (
            [
                "const [searchQuery, setSearchQuery] = useState",
                "const [searchResults, setSearchResults] = useState",
                "const [searching, setSearching] = useState",
                "const [aiPrompt, setAiPrompt] = useState",
                "const [aiResponse, setAiResponse] = useState",
                "const [aiLoading, setAiLoading] = useState",
            ],
            ["const handleSearch = useCallback(", "const handleAI = useCallback("],
            [],
        ),
        "workers": (
            [
                "const [workers, setWorkers] = useState",
                "const [workerFilter, setWorkerFilter] = useState",
                "const [workersLoading, setWorkersLoading] = useState",
            ],
            ["const loadWorkers = useCallback(", "const healthCheckWorkers = useCallback("],
            [],
        ),
        "content": (
            [
                "const [contentTopic, setContentTopic] = useState",
                "const [contentType, setContentType] = useState",
                "const [contentLang, setContentLang] = useState",
                "const [contentTone, setContentTone] = useState",
                "const [contentResult, setContentResult] = useState",
                "const [contentLoading, setContentLoading] = useState",
                "const [cmsView, setCmsView] = useState",
                "const [articlesList, setArticlesList] = useState",
                "const [articlesLoading, setArticlesLoading] = useState",
                "const [selectedArticleId, setSelectedArticleId] = useState",
                "const [articleTitle, setArticleTitle] = useState",
                "const [articleContent, setArticleContent] = useState",
                "const [articleExcerpt, setArticleExcerpt] = useState",
                "const [articleCategory, setArticleCategory] = useState",
                "const [articleTags, setArticleTags] = useState",
                "const [articleLang, setArticleLang] = useState",
                "const [articleSeoTitle, setArticleSeoTitle] = useState",
                "const [articleSeoDesc, setArticleSeoDesc] = useState",
                "const [articleStatus, setArticleStatus] = useState",
                "const [cmsSaving, setCmsSaving] = useState",
                "const [cmsPublishing, setCmsPublishing] = useState",
                "const [cmsMessage, setCmsMessage] = useState",
            ],
            [
                "const handleContentGenerate = useCallback(",
                "const loadArticles = useCallback(",
                "const resetEditor = useCallback(",
                "const openArticle = useCallback(",
                "const handleSaveArticle = useCallback(",
                "const handlePublishArticle = useCallback(",
                "const handleUnpublishArticle = useCallback(",
                "const handleUseGenerated = useCallback(",
            ],
            ["const slugify = (text: string) =>"],
        ),
        "analytics": (
            [
                "const [analyticsData, setAnalyticsData] = useState",
                "const [analyticsPeriod, setAnalyticsPeriod] = useState",
                "const [analyticsLoading, setAnalyticsLoading] = useState",
                "const [analyticsSource, setAnalyticsSource] =",
            ],
            ["const loadAnalytics = useCallback("],
            [],
        ),
        "crawlers": (
            [
                "const [crawlersData, setCrawlersData] = useState",
                "const [crawlersPeriod, setCrawlersPeriod] = useState",
                "const [crawlersLoading, setCrawlersLoading] = useState",
                "const [crawlerProfiles, setCrawlerProfiles] = useState",
                "const [crawlerFilter, setCrawlerFilter] = useState",
            ],
            ["const loadCrawlers = useCallback("],
            [],
        ),
        "storage": (
            [
                "const [buckets, setBuckets] = useState",
                "const [selectedBucket, setSelectedBucket] = useState",
                "const [bucketObjects, setBucketObjects] = useState",
                "const [storageLoading, setStorageLoading] = useState",
            ],
            ["const loadBuckets = useCallback(", "const browseBucket = useCallback("],
            [],
        ),
        "databases": (
            [
                "const [databases, setDatabases] = useState",
                "const [selectedDb, setSelectedDb] = useState",
                "const [dbTables, setDbTables] = useState",
                "const [sqlQuery, setSqlQuery] = useState",
                "const [queryResult, setQueryResult] = useState",
                "const [dbLoading, setDbLoading] = useState",
            ],
            ["const loadDatabases = useCallback(", "const loadTables = useCallback(", "const runQuery = useCallback("],
            [],
        ),
        "images": (
            [
                "const [imgPrompt, setImgPrompt] = useState",
                "const [imgStyle, setImgStyle] = useState",
                "const [imgResult, setImgResult] = useState",
                "const [imgLoading, setImgLoading] = useState",
            ],
            ["const handleImageGenerate = useCallback("],
            [],
        ),
        "moa": (
            [
                "const [moaTopic, setMoaTopic] = useState",
                "const [moaType, setMoaType] = useState",
                "const [moaLang, setMoaLang] = useState",
                "const [moaResult, setMoaResult] = useState",
                "const [moaLoading, setMoaLoading] = useState",
            ],
            ["const handleMoaGenerate = useCallback("],
            [],
        ),
        "pipelines": (
            [
                "const [pipelinesData, setPipelinesData] = useState",
                "const [pipelinesLoading, setPipelinesLoading] = useState",
                "const [pipelineFilter, setPipelineFilter] = useState",
                "const [pipelineEvents, setPipelineEvents] = useState",
                "const [pipelineStats, setPipelineStats] = useState",
                "const [ingestPipeline, setIngestPipeline] = useState",
                "const [ingestType, setIngestType] = useState",
                "const [ingestPayload, setIngestPayload] = useState",
                "const [ingestResult, setIngestResult] = useState",
            ],
            ["const loadPipelines = useCallback(", "const handleIngest = useCallback("],
            [],
        ),
        "render": (
            [
                "const [renderUrl, setRenderUrl] = useState",
                "const [renderAction, setRenderAction] = useState",
                "const [renderSelectors, setRenderSelectors] = useState",
                "const [renderPrompt, setRenderPrompt] = useState",
                "const [renderResult, setRenderResult] = useState",
                "const [renderLoading, setRenderLoading] = useState",
            ],
            ["const handleRender = useCallback("],
            [],
        ),
        "queues": (
            [
                "const [queueName, setQueueName] = useState",
                "const [queueAction, setQueueAction] = useState",
                "const [queuePrompt, setQueuePrompt] = useState",
                "const [queueResult, setQueueResult] = useState",
                "const [queueLoading, setQueueLoading] = useState",
                "const [consumerHealth, setConsumerHealth] = useState",
                "const [recentResults, setRecentResults] = useState",
                "const [queueTaskId, setQueueTaskId] = useState",
                "const [queueLookupResult, setQueueLookupResult] = useState",
            ],
            [
                "const loadConsumerHealth = useCallback(",
                "const handleQueueSend = useCallback(",
                "const handleQueueLookup = useCallback(",
                "const loadRecentResults = useCallback(",
            ],
            [],
        ),
        "aihub": (
            [
                "const [aiHubPrompt, setAiHubPrompt] = useState",
                "const [aiHubProvider, setAiHubProvider] = useState",
                "const [aiHubResponse, setAiHubResponse] = useState",
                "const [aiHubLoading, setAiHubLoading] = useState",
                "const [aiHubHistory, setAiHubHistory] = useState",
                "const [aiProvidersStatus, setAiProvidersStatus] = useState",
            ],
            ["const handleAiHubChat = useCallback(", "const loadAiProviders = useCallback("],
            [],
        ),
        "biztools": (
            [
                "const [bizSearch, setBizSearch] = useState",
                "const [bizCategory, setBizCategory] = useState",
                "const [tavilyKey, setTavilyKey] = useState",
                "const [tavilyQuery, setTavilyQuery] = useState",
                "const [tavilyResults, setTavilyResults] = useState",
                "const [tavilyLoading, setTavilyLoading] = useState",
                "const [tavilyError, setTavilyError] = useState",
                "const [tavilyAutoRan, setTavilyAutoRan] = useState",
            ],
            ["const handleTavilySearch = useCallback("],
            [],
        ),
        "workflows": (
            [
                "const [workflowList, setWorkflowList] = useState",
                "const [workflowSelected, setWorkflowSelected] = useState",
                "const [workflowParams, setWorkflowParams] = useState",
                "const [workflowResult, setWorkflowResult] = useState",
                "const [workflowLoading, setWorkflowLoading] = useState",
                "const [workflowStatuses, setWorkflowStatuses] = useState",
                "const [workflowEndpoint, setWorkflowEndpoint] = useState",
            ],
            ["const handleWorkflowTrigger = useCallback(", "const loadWorkflowStatuses = useCallback("],
            [],
        ),
    }

    tab_exports = []
    hook_imports = []
    hook_inits = []

    for tab_id, comp, hook in tabs:
        folder = BASE / "tabs" / tab_id
        ensure_dir(folder)
        jsx = extract_tab_inner(src, tab_id)
        props_type = f"{comp}Props"
        write(folder / "types.ts", build_types(props_type))
        write(
            folder / f"{comp}.tsx",
            build_component(comp, props_type, props_map[tab_id], jsx),
        )
        if hook:
            states, cbs, extras = hook_specs[tab_id]
            hook_body = make_hook(src, states, cbs, extras)
            # infer imports
            imports = ["useState", "useCallback"]
            hook_content = f'''import {{ {", ".join(imports)} }} from "react";
import {{ apiFetch }} from "../../shared/api";
import {{ ANALYTICS_SOURCES }} from "../../shared/constants";

export function {hook}() {{
{hook_body}

  return {{
    {", ".join(sorted(set(re.findall(r"\\b[a-zA-Z_][a-zA-Z0-9_]*\\b", hook_body))))}
  }};
}}
'''
            write(folder / f"{hook}.ts", hook_content)

        write(
            folder / "index.ts",
            f'''export * from "./{comp}";
{f'export * from "./{hook}";' if hook else ''}
export * from "./types";
''',
        )
        tab_exports.append(f'export * from "./{tab_id}";')
        if hook:
            hook_imports.append(f'import {{ {hook} }} from "./tabs/{tab_id}/{hook}";')
            hook_inits.append(f"  const {tab_id} = {hook}();")

    write(BASE / "tabs/index.ts", "\n".join(tab_exports) + "\n")

    web_landing = f'''/**
 * ZENO Browser — Operations Dashboard
 * Central operations hub for all sites, Workers, AI, storage and databases
 * Deployed on zenbrowsers.org (CF Pages)
 */
import {{ useState, useEffect }} from "react";
import {{ BuchChatWidget }} from "../assistant/BuchChatWidget";
import {{ AssistantPage }} from "../assistant/AssistantPage";
import {{ JimboKitPanel }} from "../assistant/JimboKitPanel";
import {{ TABS, API_SERVICES, ANALYTICS_SOURCES, PIPELINES_LIST, BIZ_CATEGORIES, BIZTOOLS_CATALOG }} from "./shared/constants";
import {{ apiFetch }} from "./shared/api";
import type {{ TabId, Status, AnalyticsSource }} from "./shared/types";
import {{
  OverviewTab,
  WorkersTab,
  ContentTab,
  AnalyticsTab,
  CrawlersTab,
  StorageTab,
  DatabasesTab,
  ImagesTab,
  MoaTab,
  PipelinesTab,
  RenderTab,
  QueuesTab,
  AiHubTab,
  BizToolsTab,
  WorkflowsTab,
  MediaHubTab,
}} from "./tabs";
{chr(10).join(hook_imports)}

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

export function WebLanding() {{
  const [tab, setTab] = useState<TabId>("overview");
  const [showJimboKit, setShowJimboKit] = useState(false);
  const [apis, setApis] = useState(API_SERVICES);
  const [sites, setSites] = useState<any[]>([]);

{chr(10).join(hook_inits)}

  const onlineApis = apis.filter((a) => a.status === "online").length;
  const filteredWorkers =
    workers.workerFilter === "all"
      ? workers.workers
      : workers.workers.filter((w: any) => w.category === workers.workerFilter);
  const workerCategories = [...new Set(workers.workers.map((w: any) => w.category))];

  useEffect(() => {{
    API_SERVICES.forEach((svc, i) => {{
      fetch(svc.endpoint)
        .then((r) => (r.ok ? "online" : "offline") as Status)
        .catch(() => "offline" as Status)
        .then((status) => {{
          setApis((prev) => prev.map((s, j) => (j === i ? {{ ...s, status }} : s)));
        }});
    }});

    apiFetch("/api/sites/ping", {{
      method: "POST",
      headers: {{ "Content-Type": "application/json" }},
      body: "{{}}",
    }}).then((data: any) => {{
      if (data?.results) {{
        setSites(
          data.results
            .filter((s: any) => s.name !== "zenbrowsers.org")
            .map((s: any) => ({{ name: s.name, status: s.status, url: s.url }})),
        );
      }}
    }});
  }}, []);

  useEffect(() => {{
    if (tab === "workers" && workers.workers.length === 0) workers.loadWorkers();
    if (tab === "analytics") analytics.loadAnalytics();
    if (tab === "crawlers") crawlers.loadCrawlers();
    if (tab === "pipelines") pipelines.loadPipelines();
    if (tab === "storage" && storage.buckets.length === 0) storage.loadBuckets();
    if (tab === "databases" && databases.databases.length === 0) databases.loadDatabases();
    if (tab === "queues") {{
      queues.loadConsumerHealth();
      queues.loadRecentResults();
    }}
    if (tab === "aihub") aihub.loadAiProviders();
    if (tab === "workflows") workflows.loadWorkflowStatuses();
    if (tab === "biztools" && !biztools.tavilyAutoRan && biztools.tavilyKey) {{
      biztools.setTavilyAutoRan(true);
      biztools.handleTavilySearch("business financial analytics tools open source AI 2025");
    }}
  }}, [tab]);

  return (
    <div className={{`web-landing ops-dashboard${{tab === "assistant" ? " assistant-active" : ""}}`}}>
      <header className="hero compact">
        <div className="hero-glow" />
        <h1><span className="accent">ZENO</span> Ops</h1>
        <p className="subtitle">Operations Dashboard — zenbrowsers.org</p>
        <div className="hero-stats">
          <span className="stat"><b>{{onlineApis}}</b>/{{apis.length}} APIs</span>
          <span className="stat"><b>{{sites.filter((s: any) => s.status === "online").length}}</b>/{{sites.length}} Sites</span>
          <span className="stat"><b>{{workers.workers.length}}</b> Workers</span>
        </div>
      </header>

      <nav className="tab-nav">
        {{TABS.map((t) => (
          <button key={{t.id}} className={{`tab-btn ${{tab === t.id ? "active" : ""}}`}} onClick={{() => setTab(t.id)}}>
            <span className="tab-icon">{{t.icon}}</span>
            <span className="tab-label">{{t.label}}</span>
          </button>
        ))}}
      </nav>

      {{tab === "overview" && <OverviewTab {{...overview}} apis={{apis}} sites={{sites}} onlineApis={{onlineApis}} />}}
      {{tab === "workers" && <WorkersTab {{...workers}} filteredWorkers={{filteredWorkers}} workerCategories={{workerCategories}} />}}
      {{tab === "content" && <ContentTab {{...content}} />}}
      {{tab === "analytics" && <AnalyticsTab {{...analytics}} ANALYTICS_SOURCES={{ANALYTICS_SOURCES}} />}}
      {{tab === "crawlers" && <CrawlersTab {{...crawlers}} />}}
      {{tab === "storage" && <StorageTab {{...storage}} />}}
      {{tab === "databases" && <DatabasesTab {{...databases}} />}}
      {{tab === "images" && <ImagesTab {{...images}} />}}
      {{tab === "moa" && <MoaTab {{...moa}} />}}
      {{tab === "pipelines" && <PipelinesTab {{...pipelines}} PIPELINES_LIST={{PIPELINES_LIST}} />}}
      {{tab === "render" && <RenderTab {{...renderTab}} />}}
      {{tab === "queues" && <QueuesTab {{...queues}} />}}
      {{tab === "aihub" && <AiHubTab {{...aihub}} setTab={{setTab}} setQueueName={{queues.setQueueName}} setQueueAction={{queues.setQueueAction}} />}}
      {{tab === "biztools" && <BizToolsTab {{...biztools}} BIZ_CATEGORIES={{BIZ_CATEGORIES}} BIZTOOLS_CATALOG={{BIZTOOLS_CATALOG}} />}}
      {{tab === "workflows" && <WorkflowsTab {{...workflows}} />}}
      {{tab === "assistant" && <AssistantPage />}}
      {{tab === "mediahub" && <MediaHubTab />}}

      <footer>
        <p>ZENO Ops &copy; {{new Date().getFullYear()}} — Powered by Cloudflare Workers &amp; AI</p>
      </footer>

      <BuchChatWidget onOpenFull={{() => setTab("assistant")}} />

      {{isElectron && (
        <button
          onClick={{() => setShowJimboKit((v) => !v)}}
          className={{`chat-toggle${{showJimboKit ? " buch-toggle-active" : ""}}`}}
          style={{{{ bottom: "28px", right: "182px" }}}}
          title="JimboKit Agent Terminal"
        >
          <span className="ct-dot" />⌨ Jimbo
        </button>
      )}}

      {{isElectron && showJimboKit && (
        <JimboKitPanel
          floating
          onClose={{() => setShowJimboKit(false)}}
          onNavigate={{(url) => window.open(url, "_blank")}}
          onNewTab={{() => window.open("about:blank", "_blank")}}
          onReload={{() => window.location.reload()}}
          currentUrl={{window.location.href}}
        />
      )}}
    </div>
  );
}}
'''
    write(SRC, web_landing)


if __name__ == "__main__":
    main()
