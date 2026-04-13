import type { TabId, ApiStatus, AnalyticsSource } from "./types";

export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "workers", label: "Workers", icon: "▲" },
  { id: "content", label: "Content", icon: "◇" },
  { id: "analytics", label: "Analytics", icon: "◆" },
  { id: "pipelines", label: "Pipelines", icon: "▶" },
  { id: "crawlers", label: "Crawlers", icon: "◎" },
  { id: "storage", label: "Storage", icon: "▣" },
  { id: "databases", label: "Databases", icon: "▦" },
  { id: "images", label: "Images", icon: "◧" },
  { id: "moa", label: "MOA", icon: "⊕" },
  { id: "render", label: "Render", icon: "◕" },
  { id: "queues", label: "Queues", icon: "▷" },
  { id: "aihub", label: "AI Chat", icon: "◈" },
  { id: "assistant", label: "Asystent", icon: "◉" },
  { id: "mediahub", label: "Media Hub", icon: "♫" },
  { id: "biztools", label: "BizTools", icon: "▨" },
  { id: "workflows", label: "Workflows", icon: "⚡" },
];

export const API_SERVICES: ApiStatus[] = [
  { name: "WebGate", endpoint: "/api/webgate/status", status: "checking" },
  { name: "AI Gate", endpoint: "/api/ai/status", status: "checking" },
  { name: "Search", endpoint: "/api/search/status", status: "checking" },
  { name: "Sites Hub", endpoint: "/api/sites/status", status: "checking" },
  {
    name: "Workers Monitor",
    endpoint: "/api/workers/status",
    status: "checking",
  },
  {
    name: "Content Pipeline",
    endpoint: "/api/content/status",
    status: "checking",
  },
  {
    name: "Analytics Hub",
    endpoint: "/api/analytics/status",
    status: "checking",
  },
  {
    name: "Storage Manager",
    endpoint: "/api/storage/status",
    status: "checking",
  },
  { name: "Database Explorer", endpoint: "/api/db/status", status: "checking" },
  { name: "MOA Pipeline", endpoint: "/api/moa/status", status: "checking" },
  { name: "Images API", endpoint: "/api/images/status", status: "checking" },
  {
    name: "Crawlers Monitor",
    endpoint: "/api/crawlers/status",
    status: "checking",
  },
  {
    name: "Pipelines API",
    endpoint: "/api/pipelines/status",
    status: "checking",
  },
  {
    name: "Browser Rendering",
    endpoint: "/api/render/status",
    status: "checking",
  },
];

export const PIPELINES_LIST = [
  "page-analytics",
  "worker-metrics",
  "content-pipeline",
  "crawler-events",
  "ecommerce-events",
  "ai-usage",
  "search-events",
];

export const ANALYTICS_SOURCES: {
  id: AnalyticsSource;
  label: string;
  endpoint: string;
}[] = [
  {
    id: "mybonzo",
    label: "mybonzo.com",
    endpoint: "https://mybonzo.com/api/analytics/overview",
  },
  { id: "local", label: "ZENO local", endpoint: "/api/analytics/overview" },
];

/* ─── BizTools Catalog ───────────────────────────── */

export interface BizTool {
  name: string;
  url: string;
  category: string;
  desc: string;
  free?: boolean;
  open?: boolean;
}

export const BIZ_CATEGORIES = [
  "all",
  "trading",
  "analytics",
  "accounting",
  "crm",
  "erp",
  "scraping",
  "automation",
  "api",
];

export const BIZTOOLS_CATALOG: BizTool[] = [
  // Trading & Finance
  {
    name: "TradingView",
    url: "https://tradingview.com",
    category: "trading",
    desc: "Wykresy giełdowe i platforma tradingowa",
    free: true,
  },
  {
    name: "OpenBB Terminal",
    url: "https://openbb.co",
    category: "trading",
    desc: "Open-source alternatywa dla Bloomberg Terminal",
    free: true,
    open: true,
  },
  {
    name: "Finviz",
    url: "https://finviz.com",
    category: "trading",
    desc: "Screener akcji i wizualizacja danych fin.",
    free: true,
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com",
    category: "trading",
    desc: "Wiadomości i dane finansowe",
    free: true,
  },
  {
    name: "Seeking Alpha",
    url: "https://seekingalpha.com",
    category: "trading",
    desc: "Analizy inwestycyjne i raporty spółek",
    free: false,
  },
  {
    name: "Macrotrends",
    url: "https://macrotrends.net",
    category: "trading",
    desc: "Długoterminowe wykresy makroekonomiczne",
    free: true,
  },
  {
    name: "SimplyWall.st",
    url: "https://simplywall.st",
    category: "trading",
    desc: "Analiza fundamentalna spółek",
    free: false,
  },
  // Analytics & BI
  {
    name: "Metabase",
    url: "https://metabase.com",
    category: "analytics",
    desc: "Open-source narzędzie BI i dashboardy SQL",
    free: true,
    open: true,
  },
  {
    name: "Apache Superset",
    url: "https://superset.apache.org",
    category: "analytics",
    desc: "Eksploracja i wizualizacja danych",
    free: true,
    open: true,
  },
  {
    name: "Grafana",
    url: "https://grafana.com",
    category: "analytics",
    desc: "Dashboardy metryk, monitorowania i alertów",
    free: true,
    open: true,
  },
  {
    name: "Redash",
    url: "https://redash.io",
    category: "analytics",
    desc: "Zapytania i wizualizacja danych z SQL",
    free: true,
    open: true,
  },
  {
    name: "Lightdash",
    url: "https://lightdash.com",
    category: "analytics",
    desc: "BI dla danych dbt/SQL",
    free: true,
    open: true,
  },
  {
    name: "Evidence",
    url: "https://evidence.dev",
    category: "analytics",
    desc: "BI jako kod — Markdown + SQL",
    free: true,
    open: true,
  },
  {
    name: "Plausible Analytics",
    url: "https://plausible.io",
    category: "analytics",
    desc: "Prywatna analityka webowa (GDPR)",
    free: false,
    open: true,
  },
  {
    name: "Umami",
    url: "https://umami.is",
    category: "analytics",
    desc: "Self-hosted analityka webowa",
    free: true,
    open: true,
  },
  // Accounting
  {
    name: "Wave",
    url: "https://waveapps.com",
    category: "accounting",
    desc: "Bezpłatna księgowość dla małych firm",
    free: true,
  },
  {
    name: "GNUCash",
    url: "https://gnucash.org",
    category: "accounting",
    desc: "Open-source program finansowo-księgowy",
    free: true,
    open: true,
  },
  {
    name: "Invoice Ninja",
    url: "https://invoiceninja.com",
    category: "accounting",
    desc: "Fakturowanie i zarządzanie płatnościami",
    free: true,
    open: true,
  },
  {
    name: "Odoo Accounting",
    url: "https://odoo.com/app/accounting",
    category: "accounting",
    desc: "Moduł księgowy pakietu ERP Odoo",
    free: true,
    open: true,
  },
  {
    name: "Beancount",
    url: "https://beancount.github.io",
    category: "accounting",
    desc: "Podwójna księgowość w plikach tekstowych",
    free: true,
    open: true,
  },
  // CRM
  {
    name: "SuiteCRM",
    url: "https://suitecrm.com",
    category: "crm",
    desc: "Open-source CRM klasy enterprise",
    free: true,
    open: true,
  },
  {
    name: "HubSpot CRM",
    url: "https://hubspot.com/crm",
    category: "crm",
    desc: "CRM z marketing automation (free tier)",
    free: true,
  },
  {
    name: "Mautic",
    url: "https://mautic.org",
    category: "crm",
    desc: "Open-source marketing automation",
    free: true,
    open: true,
  },
  {
    name: "Twenty CRM",
    url: "https://twenty.com",
    category: "crm",
    desc: "Nowoczesny open-source CRM",
    free: true,
    open: true,
  },
  {
    name: "Attio",
    url: "https://attio.com",
    category: "crm",
    desc: "CRM oparty na danych (nowoczesny)",
    free: false,
  },
  // ERP
  {
    name: "ERPNext",
    url: "https://erpnext.com",
    category: "erp",
    desc: "Open-source ERP: finanse, HR, magazyn",
    free: true,
    open: true,
  },
  {
    name: "Odoo Community",
    url: "https://odoo.com",
    category: "erp",
    desc: "Kompleksowy pakiet ERP + CRM",
    free: true,
    open: true,
  },
  {
    name: "Dolibarr",
    url: "https://dolibarr.org",
    category: "erp",
    desc: "ERP/CRM dla małych i średnich firm",
    free: true,
    open: true,
  },
  {
    name: "Akaunting",
    url: "https://akaunting.com",
    category: "erp",
    desc: "Open-source platforma finansowo-biznesowa",
    free: true,
    open: true,
  },
  // Web Scraping
  {
    name: "Firecrawl",
    url: "https://firecrawl.dev",
    category: "scraping",
    desc: "Scraping stron do Markdown — idealne dla AI",
    free: true,
  },
  {
    name: "Jina AI Reader",
    url: "https://r.jina.ai",
    category: "scraping",
    desc: "Konwersja dowolnej strony do czytelnego tekstu",
    free: true,
  },
  {
    name: "Tavily",
    url: "https://tavily.com",
    category: "scraping",
    desc: "Wyszukiwarka zaprojektowana dla agentów AI",
    free: true,
  },
  {
    name: "Apify",
    url: "https://apify.com",
    category: "scraping",
    desc: "Platforma web scraping i automatyzacji danych",
    free: true,
  },
  {
    name: "Bright Data",
    url: "https://brightdata.com",
    category: "scraping",
    desc: "Infrastruktura proxy i scraping danych",
    free: false,
  },
  {
    name: "Crawl4AI",
    url: "https://crawl4ai.com",
    category: "scraping",
    desc: "Open-source scraper do projektów AI",
    free: true,
    open: true,
  },
  {
    name: "Browserless",
    url: "https://browserless.io",
    category: "scraping",
    desc: "Headless Chrome jako API (skalowalny)",
    free: false,
  },
  {
    name: "SerpAPI",
    url: "https://serpapi.com",
    category: "scraping",
    desc: "API wyników wyszukiwarek Google/Bing",
    free: false,
  },
  // Automation
  {
    name: "n8n",
    url: "https://n8n.io",
    category: "automation",
    desc: "Open-source workflow automation (self-hosted)",
    free: true,
    open: true,
  },
  {
    name: "Node-RED",
    url: "https://nodered.org",
    category: "automation",
    desc: "Wizualne programowanie przepływów danych IoT/API",
    free: true,
    open: true,
  },
  {
    name: "Windmill",
    url: "https://windmill.dev",
    category: "automation",
    desc: "Platforma automatyzacji dla deweloperów",
    free: true,
    open: true,
  },
  {
    name: "Activepieces",
    url: "https://activepieces.com",
    category: "automation",
    desc: "Open-source alternatywa dla Zapier",
    free: true,
    open: true,
  },
  {
    name: "Temporal",
    url: "https://temporal.io",
    category: "automation",
    desc: "Niezawodna orkiestracja workflow (durable exec)",
    free: true,
    open: true,
  },
  {
    name: "Prefect",
    url: "https://prefect.io",
    category: "automation",
    desc: "Orkiestracja pipeline'ów danych i AI",
    free: true,
    open: true,
  },
  // APIs — Finance & News
  {
    name: "Alpha Vantage",
    url: "https://alphavantage.co",
    category: "api",
    desc: "API cen akcji, forex i kryptowalut",
    free: true,
  },
  {
    name: "Polygon.io",
    url: "https://polygon.io",
    category: "api",
    desc: "Dane rynkowe w czasie rzeczywistym — US markets",
    free: false,
  },
  {
    name: "Financial Modeling Prep",
    url: "https://financialmodelingprep.com",
    category: "api",
    desc: "API danych spółek: bilanse, rachunki wyników",
    free: true,
  },
  {
    name: "NewsAPI",
    url: "https://newsapi.org",
    category: "api",
    desc: "API wiadomości z 80 000+ źródeł",
    free: true,
  },
  {
    name: "FRED API",
    url: "https://fred.stlouisfed.org/docs/api/fred",
    category: "api",
    desc: "Dane makroekonomiczne US Federal Reserve",
    free: true,
  },
  {
    name: "World Bank API",
    url: "https://data.worldbank.org/developers",
    category: "api",
    desc: "Dane makroekonomiczne Banku Światowego",
    free: true,
  },
  {
    name: "CoinGecko",
    url: "https://coingecko.com/api",
    category: "api",
    desc: "API danych kryptowalut (spot + DeFi)",
    free: true,
  },
  {
    name: "OpenExchangeRates",
    url: "https://openexchangerates.org",
    category: "api",
    desc: "Kursy walut i dane forex",
    free: true,
  },
];
