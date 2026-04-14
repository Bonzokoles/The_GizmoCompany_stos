/**
 * Electron API Bridge — Type Definitions
 * Auto-typed interface for contextBridge.exposeInMainWorld('electronAPI', api)
 */

// ── CSS Module declarations ─────────────────────────────────────
declare module '*.css';


// ── Domain Models ──────────────────────────────────────────────

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface TunnelStatus {
  hostname: string;
  service: string;
  status: 'active' | 'disconnected' | 'error';
  lastCheck: Date;
  uptime: number;
  requestsPerMinute: number;
}

export interface TunnelMetrics {
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  activeConnections: number;
  bytesTransferred: number;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  icon?: string;
  enabled: boolean;
  hasUpdate?: boolean;
}

export type AIProviderType =
  | 'deepseek'
  | 'openrouter'
  | 'edenai'
  | 'openai'
  | 'anthropic'
  | 'local';

export type AICapability =
  | 'text-generation'
  | 'reasoning'
  | 'code-generation'
  | 'web-search'
  | 'vision'
  | 'audio'
  | 'streaming';

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  context?: string[];
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  id: string;
  content: string;
  model: string;
  latency: number;
  provider: AIProviderType;
  cost?: number;
  cached?: boolean;
  timestamp?: Date;
  tokens?: { input: number; output: number; total: number };
}

export interface AIProvider {
  name: AIProviderType;
  displayName: string;
  enabled: boolean;
  priority: number;
  models: string[];
  capabilities: AICapability[];
}

export interface AIMetrics {
  totalRequests: number;
  cacheHits: number;
  avgLatency: number;
  totalCost: number;
  providers: Array<{ name: string; enabled: boolean; priority: number }>;
  cacheSize: number;
}

export interface NetworkReport {
  totalRequests: number;
  totalDataTransferred: number;
  avgLatency: number;
  byDomain: Record<string, number>;
  byMethod: Record<string, number>;
  timeline: Array<{ time: Date; url: string; latency: number }>;
}

export interface SecurityContext {
  tabId: string;
  sandbox: boolean;
  permissions: string[];
  createdAt: Date;
}

export interface AuditLog {
  type: string;
  tabId?: string;
  timestamp?: Date;
  details?: Record<string, unknown>;
}

// ── API Result Wrapper ─────────────────────────────────────────

export interface APIResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Namespace Interfaces ───────────────────────────────────────

export interface BrowserAPI {
  newTab(): Promise<Tab>;
  closeTab(tabId: string): Promise<void>;
  navigate(tabId: string, url: string): Promise<void>;
  getTabs(): Promise<Tab[]>;
}

export interface AIAPI {
  execute(request: AIRequest): Promise<APIResult<AIResponse>>;
  getProviders(): Promise<AIProvider[]>;
  getMetrics(): Promise<AIMetrics>;
}

export interface NetworkAPI {
  getReport(tabId: string): Promise<NetworkReport>;
  getStats(): Promise<{ total: number; byDomain: Record<string, number>; byMethod: Record<string, number> }>;
  getConnections(filter?: { domain?: string; method?: string }): Promise<Array<{ url: string; method: string; status: number; timestamp: number }>>;
  setProxy(proxyUrl: string, type?: 'http' | 'socks5'): Promise<void>;
  clearProxy(): Promise<void>;
  getConfig(): Promise<{ proxy: { enabled: boolean; url?: string; type?: string } }>;
}

export interface TabsAPI {
  sendMessage(fromTabId: string, toTabId: string | undefined, type: string, payload: unknown): Promise<void>;
  getMessages(opts?: { fromTabId?: string; toTabId?: string; limit?: number }): Promise<unknown[]>;
  register(tabId: string): Promise<void>;
  shareSession(fromTabId: string, toTabId: string, keys: string[]): Promise<void>;
  shareAuth(fromTabId: string, toTabId?: string): Promise<void>;
}

export interface UmamiAPI {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: (...args: any[]) => Promise<any>;
}

export interface McpAPI {
  listTools(): Promise<string[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface WorkflowAPI {
  create(id: string, steps: unknown[]): Promise<void>;
  execute(workflowId: string): Promise<{ executionId: string }>;
  getExecution(executionId: string): Promise<unknown>;
  list(): Promise<Array<{ id: string; steps: unknown[] }>>;
  listExecutions(): Promise<Array<{ id: string; workflowId: string; status: string; error?: string }>>;
}

export interface CrawlerAPI {
  start(config: { startUrls: string[]; maxPages?: number; followLinks?: boolean; delay?: number }): Promise<{ id: string; status: string }>;
  cancel(crawlId: string): Promise<void>;
  get(crawlId: string): Promise<{ id: string; status: string; pages?: unknown[]; pagesVisited?: number }>;
  list(): Promise<Array<{ id: string; status: string; pagesVisited?: number; pages?: unknown[] }>>;
  export(crawlId: string, format?: 'json' | 'csv'): Promise<string>;
}

export interface SecurityAPI {
  createContext(tabId: string): Promise<SecurityContext>;
  getAuditLogs(tabId?: string): Promise<AuditLog[]>;
  onAuditLog(callback: (log: AuditLog) => void): void;
  offAuditLog(callback: (log: AuditLog) => void): void;
}

export interface WindowAPI {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
}

export interface ThemeAPI {
  toggle(): Promise<void>;
}

export interface TunnelAPI {
  status(): Promise<TunnelStatus[]>;
  metrics(): Promise<TunnelMetrics>;
  reconnect(): Promise<void>;
}

export interface TerminalExecuteResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  cwd?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  chromeVersion: string;
  uptime: number;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  homeDir: string;
  hostname: string;
}

export interface PtyAPI {
  create(cols: number, rows: number, cwd?: string): Promise<{ success: boolean; id?: string; error?: string }>;
  write(id: string, data: string): Promise<{ success: boolean; error?: string }>;
  resize(id: string, cols: number, rows: number): Promise<{ success: boolean; error?: string }>;
  kill(id: string): Promise<{ success: boolean; error?: string }>;
  onData(callback: (id: string, data: string) => void): () => void;
  onExit(callback: (id: string, exitCode: number) => void): () => void;
}

export interface TerminalAPI {
  execute(command: string, cwd?: string): Promise<TerminalExecuteResult>;
  getCwd(): Promise<string>;
  setCwd(dir: string): Promise<{ success: boolean; cwd?: string; error?: string }>;
  getSystemInfo(): Promise<SystemInfo>;
  getEnv(name?: string): Promise<string | Record<string, string>>;
  killProcess(pid: number): Promise<{ success: boolean; error?: string }>;
  pty?: PtyAPI;
}

export interface UpdaterAPI {
  checkForUpdates(): Promise<{ isUpdateAvailable: boolean; version?: string }>;
  installUpdate(): Promise<void>;
}

export interface FsEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: number;
  extension: string;
}

export interface FileAPI {
  list(dirPath: string): Promise<{ success: boolean; entries: FsEntry[]; error?: string }>;
  read(filePath: string): Promise<{ success: boolean; content?: string; size?: number; modified?: number; error?: string }>;
  write(filePath: string, content: string): Promise<{ success: boolean; error?: string }>;
  delete(targetPath: string): Promise<{ success: boolean; error?: string }>;
  stat(targetPath: string): Promise<{ success: boolean; size?: number; modified?: number; created?: number; isDirectory?: boolean; isFile?: boolean; error?: string }>;
  openFolder(defaultPath?: string): Promise<string | null>;
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  repository?: string;
  downloads: number;
  rating: number;
  reviews: number;
  tags: string[];
  latest: string;
  releaseDate: Date;
}

export interface PluginAPI {
  install(pluginId: string): Promise<void>;
  getInstalled(): Promise<InstalledPlugin[]>;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string): Promise<void>;
  searchMarketplace(query: string): Promise<MarketplacePlugin[]>;
  getFeatured(): Promise<MarketplacePlugin[]>;
  getTrending(): Promise<MarketplacePlugin[]>;
  onInstallProgress(callback: (data: { pluginId: string; progress: number }) => void): void;
  offInstallProgress(callback: (data: { pluginId: string; progress: number }) => void): void;
}

// ── Search & Catalog Types ─────────────────────────────────────

export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  engine: string;
  score?: number;
  category?: string;
  publishedDate?: string;
}

export interface DeepSearchReport {
  query: string;
  summary: string;
  sources: Array<{ url: string; title: string; relevance: string }>;
  keyFindings: string[];
  model: string;
  provider: string;
  latency: number;
  cost?: number;
}

export interface LocalSearchResult {
  filePath: string;
  fileName: string;
  snippet: string;
  rank: number;
}

// ── MeiliSearch Types ──────────────────────────────────────────

export interface MeiliHistoryEntry {
  url: string;
  title?: string;
  snippet?: string;
}

export interface MeiliAutocompleteResult {
  title: string;
  url: string;
  type: 'history' | 'bookmark';
}

export interface MeiliSearchResult<T> {
  hits: T[];
  query: string;
  processingTimeMs: number;
  estimatedTotalHits: number;
}

// ── Websurfx Types ──────────────────────────────────────────

export interface WebsurfxResult {
  url: string;
  title: string;
  description: string;
  engine: string[];
}

export interface WebsurfxResponse {
  results: WebsurfxResult[];
  page_query: string;
  style: string;
  engine: string[];
}

// ── sist2 Types ──────────────────────────────────────────────

export interface Sist2SearchHit {
  _id: string;
  _source: {
    name: string;
    path: string;
    extension: string;
    size: number;
    mtime: number;
    content?: string;
    mime?: string;
    thumbnail?: string;
    tag?: string[];
    parent?: string;
  };
  _score?: number;
  highlight?: Record<string, string[]>;
}

export interface Sist2SearchResponse {
  hits: Sist2SearchHit[];
  total: number;
  took: number;
}

export interface Sist2IndexInfo {
  id: string;
  name: string;
  root: string;
  version: string;
  timestamp: number;
  numDocs: number;
}

export interface Sist2JobStatus {
  id: string;
  type: 'scan' | 'index';
  status: 'running' | 'done' | 'error';
  progress?: number;
}

export interface CatalogLibrary {
  id: string;
  name: string;
  rootPath: string;
  extensions: string[];
  enabled: boolean;
}

export interface CatalogTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: CatalogTreeNode[];
}

export interface ComparisonResult {
  query: string;
  webResults: WebSearchResult[];
  localResults: LocalSearchResult[];
  comparison: string;
  model: string;
}

export interface SearchConfig {
  searxngUrl: string;
  defaultLanguage: string;
  safesearch: 0 | 1 | 2;
  maxWebResults: number;
  maxLocalResults: number;
}

// ── Search & Catalog API Interfaces ───────────────────────────

export interface SearchAPI {
  webSearch(query: string, filters?: Record<string, unknown>): Promise<APIResult<WebSearchResult[]>>;
  deepSearch(query: string, filters?: Record<string, unknown>): Promise<APIResult<DeepSearchReport>>;
  localSearch(query: string, libraryId?: string): Promise<APIResult<LocalSearchResult[]>>;
  compare(query: string, libraryId?: string): Promise<APIResult<ComparisonResult>>;
  isReady(): Promise<boolean>;
  getConfig(): Promise<SearchConfig>;
  setConfig(config: Partial<SearchConfig>): Promise<void>;
}

export interface CatalogAPI {
  addLibrary(name: string, rootPath: string, extensions?: string[]): Promise<APIResult<CatalogLibrary>>;
  removeLibrary(libraryId: string): Promise<void>;
  getLibraries(): Promise<CatalogLibrary[]>;
  indexLibrary(libraryId: string): Promise<APIResult<{ indexed: number; skipped: number; errors: number }>>;
  indexAll(): Promise<APIResult<{ total: number; errors: number }>>;
  getFileTree(libraryId: string): Promise<CatalogTreeNode | null>;
  readFile(filePath: string): Promise<APIResult<{ content: string; size: number; modifiedAt: string }>>;
  getStats(): Promise<{ libraries: number; files: number; totalSize: number }>;
}

// ── Knowledge Hub Types ────────────────────────────────────────

export interface KnowledgeTopic {
  id: string;
  name: string;
  category: string;
  path: string;
  fileCount: number;
  description: string;
  icon: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  knowledgeTopics: string[];
  systemPrompt?: string;
  model?: string;
  createdAt: string;
}

export interface CloudResource {
  type: 'd1' | 'r2';
  id: string;
  name: string;
  description: string;
  project: string;
  category?: string;
}

export interface HubStats {
  localLibraries: number;
  knowledgeTopics: number;
  agents: number;
  indexedFiles: number;
  totalSizeMB: number;
  cloudDatabases: number;
  cloudBuckets: number;
}

export interface KnowledgeHubAPI {
  autoRegister(): Promise<APIResult<{ registered: number; skipped: number }>>;
  getStats(): Promise<HubStats>;
  getTopics(): Promise<KnowledgeTopic[]>;
  getTopicFiles(topicId: string, limit?: number): Promise<Array<{ name: string; path: string; snippet: string; size: number }>>;
  getAgents(): Promise<AgentDefinition[]>;
  createAgent(agent: Omit<AgentDefinition, 'createdAt'>): Promise<APIResult<AgentDefinition>>;
  getCloudResources(): Promise<CloudResource[]>;
  searchKnowledge(query: string, topicId?: string): Promise<APIResult<Array<{ filePath: string; fileName: string; snippet: string; rank: number }>>>;
}

// ── Agents Creator Types ───────────────────────────────────────

export interface AgentWorkspace {
  id: string;
  name: string;
  domain: string;
  model: string;
  description: string;
  systemPrompt: string;
  knowledgeFiles: number;
  ragIndexed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentKBFile {
  name: string;
  path: string;
  size: number;
  type: 'local' | 'imported' | 'web';
  source?: string;
  addedAt: string;
}

export interface DomainTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedTopics: string[];
  systemPromptTemplate: string;
  promptSnippets: Array<{ name: string; prompt: string }>;
}

export interface PromptSnippet {
  name: string;
  prompt: string;
}

export interface AgentsCreatorAPI {
  listWorkspaces(): Promise<AgentWorkspace[]>;
  createWorkspace(config: { name: string; domain: string; model: string; description: string; systemPrompt?: string }): Promise<APIResult<AgentWorkspace>>;
  deleteWorkspace(agentId: string): Promise<APIResult<void>>;
  getWorkspace(agentId: string): Promise<AgentWorkspace | null>;
  updateWorkspace(agentId: string, updates: Partial<Pick<AgentWorkspace, 'name' | 'domain' | 'model' | 'description' | 'systemPrompt'>>): Promise<APIResult<AgentWorkspace>>;
  getKBFiles(agentId: string): Promise<AgentKBFile[]>;
  addKBFile(agentId: string, sourcePath: string): Promise<APIResult<AgentKBFile>>;
  importFromTopic(agentId: string, topicId: string): Promise<APIResult<{ imported: number; errors: number }>>;
  importFromUrl(agentId: string, url: string): Promise<APIResult<AgentKBFile>>;
  removeKBFile(agentId: string, fileName: string): Promise<APIResult<void>>;
  readKBFile(agentId: string, fileName: string): Promise<string | null>;
  getPromptSnippets(agentId: string): Promise<PromptSnippet[]>;
  addPromptSnippet(agentId: string, snippet: PromptSnippet): Promise<APIResult<void>>;
  indexRag(agentId: string): Promise<APIResult<{ indexed: number; errors: number }>>;
  searchRag(agentId: string, query: string, limit?: number): Promise<Array<{ filePath: string; fileName: string; snippet: string; rank: number }>>;
  getDomainTemplates(): Promise<DomainTemplate[]>;
  generateContext(agentId: string): Promise<string>;
}

export interface MeilisearchAPI {
  addHistory(entry: MeiliHistoryEntry): Promise<APIResult<void>>;
  searchHistory(query: string, limit?: number): Promise<APIResult<MeiliSearchResult<unknown>>>;
  autocomplete(query: string, limit?: number): Promise<APIResult<MeiliAutocompleteResult[]>>;
  recentHistory(limit?: number): Promise<APIResult<unknown[]>>;
  clearHistory(): Promise<APIResult<void>>;
  isHealthy(): Promise<boolean>;
}

export interface WebsurfxAPI {
  search(query: string, filters?: Record<string, unknown>): Promise<APIResult<WebsurfxResponse>>;
  isHealthy(): Promise<boolean>;
}

export interface Sist2API {
  search(query: string, size?: number, from?: number): Promise<APIResult<Sist2SearchResponse>>;
  getIndices(): Promise<APIResult<Sist2IndexInfo[]>>;
  scanDirectory(dirPath: string): Promise<APIResult<Sist2JobStatus>>;
  getJobs(): Promise<APIResult<Sist2JobStatus[]>>;
  isHealthy(): Promise<boolean>;
}

// ── Main ElectronAPI Interface ─────────────────────────────────

export interface ElectronAPI {
  browser: BrowserAPI;
  ai: AIAPI;
  network: NetworkAPI;
  security: SecurityAPI;
  window: WindowAPI;
  theme: ThemeAPI;
  terminal: TerminalAPI;
  tunnel?: TunnelAPI;
  updater?: UpdaterAPI;
  plugin?: PluginAPI;
  search: SearchAPI;
  catalog: CatalogAPI;
  knowledgeHub: KnowledgeHubAPI;
  agentsCreator: AgentsCreatorAPI;
  meilisearch: MeilisearchAPI;
  websurfx: WebsurfxAPI;
  sist2: Sist2API;
  workflow?: WorkflowAPI;
  crawler?: CrawlerAPI;
  umami?: UmamiAPI;
  mcp?: McpAPI;
  file?: FileAPI;

  /** Subscribe to IPC events from main process. Returns unsubscribe function. */
  on(channel: string, callback: (...args: unknown[]) => void): () => void;
}

// ── Global Window Augmentation ─────────────────────────────────

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
