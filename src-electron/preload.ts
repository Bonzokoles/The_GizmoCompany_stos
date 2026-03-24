/**
 * Preload Script - Bridge between Renderer and Main Process
 * Provides secure IPC communication
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposed API for renderer process
 */
const api = {
  // Browser operations
  browser: {
    newTab: () => ipcRenderer.invoke('browser:new-tab'),
    closeTab: (tabId: string) => ipcRenderer.invoke('browser:close-tab', tabId),
    navigate: (tabId: string, url: string) =>
      ipcRenderer.invoke('browser:navigate', tabId, url),
    getTabs: () => ipcRenderer.invoke('browser:get-tabs'),
    goBack: (tabId: string) => ipcRenderer.invoke('browser:go-back', tabId),
    goForward: (tabId: string) => ipcRenderer.invoke('browser:go-forward', tabId),
  },

  // AI Gateway
  ai: {
    execute: (request: any) => ipcRenderer.invoke('ai:execute', request),
    getProviders: () => ipcRenderer.invoke('ai:get-providers'),
    getMetrics: () => ipcRenderer.invoke('ai:get-metrics'),
  },

  // Network monitoring
  network: {
    getReport: (tabId: string) => ipcRenderer.invoke('network:get-report', tabId),
    getStats: () => ipcRenderer.invoke('network:get-stats'),
    getConnections: (filter?: { domain?: string; method?: string }) =>
      ipcRenderer.invoke('network:get-connections', filter),
    setProxy: (proxyUrl: string, type?: 'http' | 'socks5') =>
      ipcRenderer.invoke('network:set-proxy', proxyUrl, type),
    clearProxy: () => ipcRenderer.invoke('network:clear-proxy'),
    getConfig: () => ipcRenderer.invoke('network:get-config'),
  },

  // Security
  security: {
    createContext: (tabId: string) => ipcRenderer.invoke('security:create-context', tabId),
    getAuditLogs: (tabId?: string) => ipcRenderer.invoke('security:get-audit-logs', tabId),
  },

  // Tab Communication
  tabs: {
    sendMessage: (fromTabId: string, toTabId: string | undefined, type: string, payload: unknown) =>
      ipcRenderer.invoke('tabs:send-message', fromTabId, toTabId, type, payload),
    getMessages: (opts?: { fromTabId?: string; toTabId?: string; limit?: number }) =>
      ipcRenderer.invoke('tabs:get-messages', opts),
    register: (tabId: string) => ipcRenderer.invoke('tabs:register', tabId),
    shareSession: (fromTabId: string, toTabId: string, keys: string[]) =>
      ipcRenderer.invoke('tabs:share-session', fromTabId, toTabId, keys),
    shareAuth: (fromTabId: string, toTabId?: string) =>
      ipcRenderer.invoke('tabs:share-auth', fromTabId, toTabId),
  },

  // Workflow Engine
  workflow: {
    create: (id: string, steps: unknown[]) =>
      ipcRenderer.invoke('workflow:create', id, steps),
    execute: (workflowId: string) =>
      ipcRenderer.invoke('workflow:execute', workflowId),
    getExecution: (executionId: string) =>
      ipcRenderer.invoke('workflow:get-execution', executionId),
    list: () => ipcRenderer.invoke('workflow:list'),
    listExecutions: () => ipcRenderer.invoke('workflow:list-executions'),
  },

  // Crawler
  crawler: {
    start: (config: { startUrls: string[]; maxPages?: number; followLinks?: boolean; delay?: number }) =>
      ipcRenderer.invoke('crawler:start', config),
    cancel: (crawlId: string) => ipcRenderer.invoke('crawler:cancel', crawlId),
    get: (crawlId: string) => ipcRenderer.invoke('crawler:get', crawlId),
    list: () => ipcRenderer.invoke('crawler:list'),
    export: (crawlId: string, format?: 'json' | 'csv') =>
      ipcRenderer.invoke('crawler:export', crawlId, format),
  },

  // Terminal (expanded)
  terminal: {
    execute: (command: string, cwd?: string) => ipcRenderer.invoke('terminal:execute', command, cwd),
    getCwd: () => ipcRenderer.invoke('terminal:get-cwd'),
    setCwd: (dir: string) => ipcRenderer.invoke('terminal:set-cwd', dir),
    getSystemInfo: () => ipcRenderer.invoke('terminal:system-info'),
    getEnv: (name?: string) => ipcRenderer.invoke('terminal:get-env', name),
    killProcess: (pid: number) => ipcRenderer.invoke('terminal:kill-process', pid),
  },

  // Plugin system
  plugin: {
    install: (pluginId: string) => ipcRenderer.invoke('plugin:load', pluginId),
    getInstalled: () => ipcRenderer.invoke('plugin:get-installed'),
    enable: (pluginId: string) => ipcRenderer.invoke('plugin:enable', pluginId),
    disable: (pluginId: string) => ipcRenderer.invoke('plugin:disable', pluginId),
    uninstall: (pluginId: string) => ipcRenderer.invoke('plugin:unload', pluginId),
    update: (pluginId: string) => ipcRenderer.invoke('plugin:apply-update', pluginId),
  },

  // Cloudflare Tunnel
  tunnel: {
    status: () => ipcRenderer.invoke('tunnel:status'),
    metrics: () => ipcRenderer.invoke('tunnel:metrics'),
    reconnect: () => ipcRenderer.invoke('tunnel:reconnect'),
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('updater:install-update'),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // MCP — Model Context Protocol
  mcp: {
    listTools: () => ipcRenderer.invoke('mcp:list-tools'),
    executeTool: (toolName: string, args?: Record<string, unknown>) =>
      ipcRenderer.invoke('mcp:execute-tool', toolName, args ?? {}),
    getToolSchema: (toolName: string) => ipcRenderer.invoke('mcp:get-tool-schema', toolName),
    serverStatus: () => ipcRenderer.invoke('mcp:server-status'),
  },

  // Umami Analytics
  umami: {
    status: () => ipcRenderer.invoke('umami:status'),
    login: () => ipcRenderer.invoke('umami:login'),
    getWebsites: () => ipcRenderer.invoke('umami:get-websites'),
    getStats: (websiteId: string, params?: Record<string, string>) =>
      ipcRenderer.invoke('umami:get-stats', websiteId, params),
    getPageviews: (websiteId: string, params?: Record<string, string>) =>
      ipcRenderer.invoke('umami:get-pageviews', websiteId, params),
    getMetrics: (websiteId: string, params?: Record<string, string>) =>
      ipcRenderer.invoke('umami:get-metrics', websiteId, params),
    getRealtime: (websiteId: string) =>
      ipcRenderer.invoke('umami:get-realtime', websiteId),
    getConfig: () => ipcRenderer.invoke('umami:get-config'),
    setConfig: (cfg: { baseUrl?: string; username?: string; password?: string }) =>
      ipcRenderer.invoke('umami:set-config', cfg),
    createWebsite: (name: string, domain: string) =>
      ipcRenderer.invoke('umami:create-website', name, domain),
  },

  // Theme
  theme: {
    toggle: () => ipcRenderer.invoke('theme:toggle'),
  },

  // Search — unified 3-layer search
  search: {
    webSearch: (query: string, filters?: Record<string, unknown>) =>
      ipcRenderer.invoke('search:web', query, filters),
    deepSearch: (query: string, filters?: Record<string, unknown>) =>
      ipcRenderer.invoke('search:deep', query, filters),
    localSearch: (query: string, libraryId?: string) =>
      ipcRenderer.invoke('search:local', query, libraryId),
    compare: (query: string, libraryId?: string) =>
      ipcRenderer.invoke('search:compare', query, libraryId),
    isReady: () => ipcRenderer.invoke('search:is-ready'),
    getConfig: () => ipcRenderer.invoke('search:get-config'),
    setConfig: (config: Record<string, unknown>) =>
      ipcRenderer.invoke('search:set-config', config),
  },

  // MeiliSearch — history & autocomplete
  meilisearch: {
    addHistory: (entry: { url: string; title?: string; snippet?: string }) =>
      ipcRenderer.invoke('meili:add-history', entry),
    searchHistory: (query: string, limit?: number) =>
      ipcRenderer.invoke('meili:search-history', query, limit),
    autocomplete: (query: string, limit?: number) =>
      ipcRenderer.invoke('meili:autocomplete', query, limit),
    recentHistory: (limit?: number) =>
      ipcRenderer.invoke('meili:recent-history', limit),
    clearHistory: () => ipcRenderer.invoke('meili:clear-history'),
    isHealthy: () => ipcRenderer.invoke('meili:healthy'),
  },

  // Websurfx — meta search engine (SearXNG replacement)
  websurfx: {
    search: (query: string, filters?: Record<string, unknown>) =>
      ipcRenderer.invoke('websurfx:search', query, filters),
    isHealthy: () => ipcRenderer.invoke('websurfx:healthy'),
  },

  // sist2 — Archive/Document indexer
  sist2: {
    search: (query: string, size?: number, from?: number) =>
      ipcRenderer.invoke('sist2:search', query, size, from),
    getIndices: () => ipcRenderer.invoke('sist2:get-indices'),
    scanDirectory: (dirPath: string) =>
      ipcRenderer.invoke('sist2:scan-directory', dirPath),
    getJobs: () => ipcRenderer.invoke('sist2:get-jobs'),
    isHealthy: () => ipcRenderer.invoke('sist2:healthy'),
  },

  // Catalog — local file library browser
  catalog: {
    addLibrary: (name: string, rootPath: string, extensions?: string[]) =>
      ipcRenderer.invoke('catalog:add-library', name, rootPath, extensions),
    removeLibrary: (libraryId: string) =>
      ipcRenderer.invoke('catalog:remove-library', libraryId),
    getLibraries: () => ipcRenderer.invoke('catalog:get-libraries'),
    indexLibrary: (libraryId: string) =>
      ipcRenderer.invoke('catalog:index-library', libraryId),
    indexAll: () => ipcRenderer.invoke('catalog:index-all'),
    getFileTree: (libraryId: string) =>
      ipcRenderer.invoke('catalog:get-file-tree', libraryId),
    readFile: (filePath: string) =>
      ipcRenderer.invoke('catalog:read-file', filePath),
    getStats: () => ipcRenderer.invoke('catalog:get-stats'),
  },

  // Knowledge Hub — local libraries + cloud D1/R2
  knowledgeHub: {
    autoRegister: () => ipcRenderer.invoke('hub:auto-register'),
    getStats: () => ipcRenderer.invoke('hub:get-stats'),
    getTopics: () => ipcRenderer.invoke('hub:get-topics'),
    getTopicFiles: (topicId: string, limit?: number) =>
      ipcRenderer.invoke('hub:get-topic-files', topicId, limit),
    getAgents: () => ipcRenderer.invoke('hub:get-agents'),
    createAgent: (agent: any) => ipcRenderer.invoke('hub:create-agent', agent),
    getCloudResources: () => ipcRenderer.invoke('hub:get-cloud-resources'),
    searchKnowledge: (query: string, topicId?: string) =>
      ipcRenderer.invoke('hub:search-knowledge', query, topicId),
  },

  // Agents Creator — themed agents with personal knowledge bases + mini RAG
  agentsCreator: {
    listWorkspaces: () => ipcRenderer.invoke('ac:list-workspaces'),
    createWorkspace: (config: any) => ipcRenderer.invoke('ac:create-workspace', config),
    deleteWorkspace: (agentId: string) => ipcRenderer.invoke('ac:delete-workspace', agentId),
    getWorkspace: (agentId: string) => ipcRenderer.invoke('ac:get-workspace', agentId),
    updateWorkspace: (agentId: string, updates: any) =>
      ipcRenderer.invoke('ac:update-workspace', agentId, updates),
    getKBFiles: (agentId: string) => ipcRenderer.invoke('ac:get-kb-files', agentId),
    addKBFile: (agentId: string, sourcePath: string) =>
      ipcRenderer.invoke('ac:add-kb-file', agentId, sourcePath),
    importFromTopic: (agentId: string, topicId: string) =>
      ipcRenderer.invoke('ac:import-from-topic', agentId, topicId),
    importFromUrl: (agentId: string, url: string) =>
      ipcRenderer.invoke('ac:import-from-url', agentId, url),
    removeKBFile: (agentId: string, fileName: string) =>
      ipcRenderer.invoke('ac:remove-kb-file', agentId, fileName),
    readKBFile: (agentId: string, fileName: string) =>
      ipcRenderer.invoke('ac:read-kb-file', agentId, fileName),
    getPromptSnippets: (agentId: string) => ipcRenderer.invoke('ac:get-prompt-snippets', agentId),
    addPromptSnippet: (agentId: string, snippet: any) =>
      ipcRenderer.invoke('ac:add-prompt-snippet', agentId, snippet),
    indexRag: (agentId: string) => ipcRenderer.invoke('ac:index-rag', agentId),
    searchRag: (agentId: string, query: string, limit?: number) =>
      ipcRenderer.invoke('ac:search-rag', agentId, query, limit),
    getDomainTemplates: () => ipcRenderer.invoke('ac:get-domain-templates'),
    generateContext: (agentId: string) => ipcRenderer.invoke('ac:generate-context', agentId),
  },

  // CMS — local article management + publish
  cms: {
    createArticle: (data: { title?: string; content?: string; excerpt?: string; category?: string; tags?: string[]; status?: string; language?: string; author?: string; seoTitle?: string; seoDescription?: string }) =>
      ipcRenderer.invoke('cms:create-article', data),
    updateArticle: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('cms:update-article', id, data),
    deleteArticle: (id: string) =>
      ipcRenderer.invoke('cms:delete-article', id),
    getArticle: (id: string) =>
      ipcRenderer.invoke('cms:get-article', id),
    listArticles: (filter?: { status?: string; category?: string }) =>
      ipcRenderer.invoke('cms:list-articles', filter),
    saveImage: (data: { articleId?: string; fileName: string; base64: string; altText?: string }) =>
      ipcRenderer.invoke('cms:save-image', data),
    listImages: (articleId?: string) =>
      ipcRenderer.invoke('cms:list-images', articleId),
    deleteImage: (imageId: string) =>
      ipcRenderer.invoke('cms:delete-image', imageId),
    publishArticle: (articleId: string) =>
      ipcRenderer.invoke('cms:publish-article', articleId),
    unpublishArticle: (articleId: string) =>
      ipcRenderer.invoke('cms:unpublish-article', articleId),
  },

  // Sync — bidirectional CF ↔ Local
  sync: {
    pullArticles: () => ipcRenderer.invoke('sync:pull-articles'),
    pullEvents: (limit?: number) => ipcRenderer.invoke('sync:pull-events', limit),
    pullAnalytics: (siteId?: string) => ipcRenderer.invoke('sync:pull-analytics', siteId),
    status: () => ipcRenderer.invoke('sync:status'),
    getCachedEvents: (pipelineId?: string, limit?: number) =>
      ipcRenderer.invoke('sync:get-cached-events', pipelineId, limit),
  },

  // File — save files to local disk
  file: {
    saveToDisk: (data: { base64: string; fileName: string; directory?: string }) =>
      ipcRenderer.invoke('file:save-to-disk', data),
  },

  // System info
  system: {
    platform: process.platform,
    nodeVersion: process.version,
    arch: process.arch,
  },

  // Event subscription (main → renderer)
  on(channel: string, callback: (...args: unknown[]) => void): () => void {
    const allowed = ['update-progress', 'update-ready', 'tunnel-status-changed', 'browser:navigate-back', 'browser:navigate-forward', 'mcp:navigate', 'mcp:tool-result', 'terminal:output'];
    if (!allowed.includes(channel)) {
      console.warn(`Blocked subscription to unknown channel: ${channel}`);
      return () => {};
    }
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
};

/**
 * Expose API to renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', api);

/**
 * Type definitions for renderer
 */
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}

export type ElectronAPI = typeof api;