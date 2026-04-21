// @ts-nocheck
/**
 * ZENO Browser — Operations Dashboard
 * Central operations hub for all sites, Workers, AI, storage and databases
 * Deployed on zenbrowsers.org (CF Pages)
 */
import { useState, useEffect } from "react";
import { ErrorBoundary } from "../ErrorBoundary";
import { LoadingSpinner } from "../LoadingSpinner";
import { BuchChatWidget } from "../assistant/BuchChatWidget";
import { AssistantPage } from "../assistant/AssistantPage";
import { JimboKitPanel } from "../assistant/JimboKitPanel";
import {
  TABS,
  API_SERVICES,
  ANALYTICS_SOURCES,
  PIPELINES_LIST,
  BIZ_CATEGORIES,
  BIZTOOLS_CATALOG,
} from "./shared/constants";
import { apiFetch } from "./shared/api";
import type { TabId, Status, AnalyticsSource } from "./shared/types";
import {
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
} from "./tabs";
import { useOverview } from "./tabs/overview/useOverview";
import { useWorkers } from "./tabs/workers/useWorkers";
import { useContent } from "./tabs/content/useContent";
import { useAnalytics } from "./tabs/analytics/useAnalytics";
import { useCrawlers } from "./tabs/crawlers/useCrawlers";
import { useStorage } from "./tabs/storage/useStorage";
import { useDatabases } from "./tabs/databases/useDatabases";
import { useImages } from "./tabs/images/useImages";
import { useMoa } from "./tabs/moa/useMoa";
import { usePipelines } from "./tabs/pipelines/usePipelines";
import { useRender } from "./tabs/render/useRender";
import { useQueues } from "./tabs/queues/useQueues";
import { useAiHub } from "./tabs/aihub/useAiHub";
import { useBizTools } from "./tabs/biztools/useBizTools";
import { useWorkflows } from "./tabs/workflows/useWorkflows";
import { useMediaHub } from "./tabs/mediahub/useMediaHub";

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

export function WebLanding() {
  const [tab, setTab] = useState<TabId>("overview");
  const [showJimboKit, setShowJimboKit] = useState(false);
  const [apis, setApis] = useState(API_SERVICES);
  const [sites, setSites] = useState<any[]>([]);

  const overview = useOverview();
  const workers = useWorkers();
  const content = useContent();
  const analytics = useAnalytics();
  const crawlers = useCrawlers();
  const storage = useStorage();
  const databases = useDatabases();
  const images = useImages();
  const moa = useMoa();
  const pipelines = usePipelines();
  const render = useRender();
  const queues = useQueues();
  const aihub = useAiHub();
  const biztools = useBizTools();
  const workflows = useWorkflows();
  const mediahub = useMediaHub();

  const onlineApis = apis.filter((a) => a.status === "online").length;
  const filteredWorkers =
    workers.workerFilter === "all"
      ? workers.workers
      : workers.workers.filter((w: any) => w.category === workers.workerFilter);
  const workerCategories = [
    ...new Set(workers.workers.map((w: any) => w.category)),
  ];

  useEffect(() => {
    API_SERVICES.forEach((svc, i) => {
      fetch(svc.endpoint)
        .then((r) => (r.ok ? "online" : "offline") as Status)
        .catch(() => "offline" as Status)
        .then((status) => {
          setApis((prev) =>
            prev.map((s, j) => (j === i ? { ...s, status } : s)),
          );
        });
    });

    apiFetch("/api/sites/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).then((data: any) => {
      if (data?.results) {
        setSites(
          data.results
            .filter((s: any) => s.name !== "zenbrowsers.org")
            .map((s: any) => ({ name: s.name, status: s.status, url: s.url })),
        );
      }
    });
  }, []);

  useEffect(() => {
    if (tab === "workers" && workers.workers.length === 0)
      workers.loadWorkers();
    if (tab === "analytics") analytics.loadAnalytics();
    if (tab === "crawlers") crawlers.loadCrawlers();
    if (tab === "pipelines") pipelines.loadPipelines();
    if (tab === "storage" && storage.buckets.length === 0)
      storage.loadBuckets();
    if (tab === "databases" && databases.databases.length === 0)
      databases.loadDatabases();
    if (tab === "queues") {
      queues.loadConsumerHealth();
      queues.loadRecentResults();
    }
    if (tab === "aihub") aihub.loadAiProviders();
    if (tab === "workflows") workflows.loadWorkflowStatuses();
    // Removed auto-run Tavily - requires explicit user consent via button click
  }, [tab]);

  return (
    <div
      className={`web-landing ops-dashboard${tab === "assistant" ? " assistant-active" : ""}`}
    >
      <header className="hero compact">
        <div className="hero-glow" />
        <h1>
          <span className="accent">ZENO</span> O_O_SHELL
        </h1>
        <p className="subtitle">
          THE_second Layer_Operations_Dashboard_Zenbrowsers.org
        </p>
        <div className="hero-stats">
          <span className="stat">
            <b>{onlineApis}</b>/{apis.length} APIs
          </span>
          <span className="stat">
            <b>{sites.filter((s: any) => s.status === "online").length}</b>/
            {sites.length} Sites
          </span>
          <span className="stat">
            <b>{workers.workers.length}</b> Workers
          </span>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <ErrorBoundary>
        {tab === "overview" && (
          <OverviewTab
            {...overview}
            apis={apis}
            sites={sites}
            onlineApis={onlineApis}
          />
        )}
        {tab === "workers" && (
          <WorkersTab
            {...workers}
            filteredWorkers={filteredWorkers}
            workerCategories={workerCategories}
          />
        )}
        {tab === "content" && <ContentTab {...content} />}
        {tab === "analytics" && (
          <AnalyticsTab {...analytics} ANALYTICS_SOURCES={ANALYTICS_SOURCES} />
        )}
        {tab === "crawlers" && <CrawlersTab {...crawlers} />}
        {tab === "storage" && <StorageTab {...storage} />}
        {tab === "databases" && <DatabasesTab {...databases} />}
        {tab === "images" && <ImagesTab {...images} />}
        {tab === "moa" && <MoaTab {...moa} />}
        {tab === "pipelines" && (
          <PipelinesTab {...pipelines} PIPELINES_LIST={PIPELINES_LIST} />
        )}
        {tab === "render" && <RenderTab {...render} />}
        {tab === "queues" && <QueuesTab {...queues} />}
        {tab === "aihub" && (
          <AiHubTab
            {...aihub}
            setTab={setTab}
            setQueueName={queues.setQueueName}
            setQueueAction={queues.setQueueAction}
          />
        )}
        {tab === "biztools" && (
          <BizToolsTab
            {...biztools}
            BIZ_CATEGORIES={BIZ_CATEGORIES}
            BIZTOOLS_CATALOG={BIZTOOLS_CATALOG}
          />
        )}
        {tab === "workflows" && <WorkflowsTab {...workflows} />}
        {tab === "assistant" && <AssistantPage />}
        {tab === "mediahub" && <MediaHubTab {...mediahub} />}
      </ErrorBoundary>

      <footer>
        <p>
          ZENO Ops &copy; {new Date().getFullYear()} — Powered by Cloudflare
          Workers &amp; AI
        </p>
      </footer>

      <BuchChatWidget onOpenFull={() => setTab("assistant")} />

      {isElectron && (
        <button
          onClick={() => setShowJimboKit((v) => !v)}
          className={`chat-toggle${showJimboKit ? " buch-toggle-active" : ""}`}
          style={{ bottom: "28px", right: "182px" }}
          title="JimboKit Agent Terminal"
        >
          <span className="ct-dot" />⌨ Jimbo
        </button>
      )}

      {isElectron && showJimboKit && (
        <JimboKitPanel
          floating
          onClose={() => setShowJimboKit(false)}
          onNavigate={(url) => window.open(url, "_blank")}
          onNewTab={() => window.open("about:blank", "_blank")}
          onReload={() => window.location.reload()}
          currentUrl={window.location.href}
        />
      )}
    </div>
  );
}
