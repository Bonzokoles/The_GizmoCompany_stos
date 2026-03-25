/**
 * THE_Zenon_browser - Main Electron Process
 * Window management, IPC handlers, backend services
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ override: true });
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  shell,
} from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { BrowserManager } from './services/browser-manager';
import { AIGatewayService } from './services/ai-gateway-service';
import { NetworkMonitor } from './services/network-monitor';
import { SecuritySandbox } from './services/security-sandbox';
import { PluginIPCBridge } from './services/plugin-ipc-bridge';
import { AutoUpdaterService } from './services/auto-updater';
import { NetworkManager } from './services/network-manager';
import { TabCommunicationManager } from './services/tab-communication';
import { WorkflowEngine } from './services/workflow-engine';
import { CrawlerService } from './services/crawler-service';
import { UmamiService } from './services/umami-service';
import { SearXNGService } from './services/searxng-service';
import { CatalogService } from './services/catalog-service';
import { SearchService } from './services/search-service';
import { MeilisearchService } from './services/meilisearch-service';
import { WebsurfxService } from './services/websurfx-service';
import { Sist2Service } from './services/sist2-service';
import { SyncService } from './services/sync-service';
import { KnowledgeHubService } from './services/knowledge-hub-service';
import { AgentsCreatorService } from './services/agents-creator-service';
import { createMCPServer, MCPServer } from './mcp-server';

let mainWindow: BrowserWindow | null = null;
let browserManager: BrowserManager;
let aiGatewayService: AIGatewayService;
let networkMonitor: NetworkMonitor;
let securitySandbox: SecuritySandbox;
let pluginBridge: PluginIPCBridge;
let autoUpdaterService: AutoUpdaterService;
let mcpServer: MCPServer;
let advancedNetworkManager: NetworkManager;
let tabComm: TabCommunicationManager;
let workflowEngine: WorkflowEngine;
let crawlerService: CrawlerService;
let umamiService: UmamiService;
let searxngService: SearXNGService;
let catalogService: CatalogService;
let searchService: SearchService;
let meilisearchService: MeilisearchService;
let websurfxService: WebsurfxService;
let sist2Service: Sist2Service;
let syncService: SyncService;
let knowledgeHubService: KnowledgeHubService;
let agentsCreatorService: AgentsCreatorService;

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Load UI
  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // CSP only for our own renderer pages (not webview content)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isOurPage = details.url.startsWith('http://localhost:5173') || details.url.startsWith('file://');
    if (!isOurPage) {
      callback({ cancel: false });
      return;
    }

    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws://localhost:* http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.mybonzo.com https://plausible.mybonzo.com; img-src 'self' data: https:; connect-src 'self' ws://localhost:* http://localhost:* https:; frame-src *;"
      : "default-src 'self'; script-src 'self' https://analytics.mybonzo.com https://plausible.mybonzo.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-src *;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  // Block renderer from navigating away from our app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowed = isDev ? 'http://localhost:5173' : 'file://';
    if (!navigationUrl.startsWith(allowed)) {
      event.preventDefault();
    }
  });

  // Secure webview creation — restrict partition, preload, etc.
  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences, _params) => {
    // Strip any preload scripts injected by renderer
    delete webPreferences.preload;
    // Ensure node is off inside webviews
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });

  // Permission request handler — deny camera/mic/geolocation by default
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen'];
    callback(allowed.includes(permission));
  });

  // Prevent renderer from opening new windows — route through default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const lower = url.toLowerCase();
    if (lower.startsWith('https://') || lower.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  setupMenu();
}

/**
 * Setup application menu
 */
function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Initialize services
 */
async function initializeServices() {
  try {
    // Browser Manager
    browserManager = new BrowserManager();
    console.log('✅ Browser Manager initialized');

    // AI Gateway Service
    aiGatewayService = new AIGatewayService();
    await aiGatewayService.initialize();
    console.log('✅ AI Gateway Service initialized');

    // Network Monitor
    networkMonitor = new NetworkMonitor();
    console.log('✅ Network Monitor initialized');

    // Security Sandbox
    securitySandbox = new SecuritySandbox();
    console.log('✅ Security Sandbox initialized');

    // Plugin IPC Bridge
    pluginBridge = new PluginIPCBridge();
    console.log('✅ Plugin IPC Bridge initialized');

    // Auto-Updater
    if (!isDev) {
      autoUpdaterService = new AutoUpdaterService();
      console.log('✅ Auto-Updater initialized');
    }

    // Advanced Network Manager
    advancedNetworkManager = new NetworkManager();
    console.log('✅ Advanced Network Manager initialized');

    // Tab Communication
    tabComm = new TabCommunicationManager();
    console.log('✅ Tab Communication Manager initialized');

    // Workflow Engine
    workflowEngine = new WorkflowEngine(browserManager);
    console.log('✅ Workflow Engine initialized');

    // Crawler Service
    crawlerService = new CrawlerService();
    console.log('✅ Crawler Service initialized');

    // Umami Analytics
    umamiService = new UmamiService();
    umamiService.registerIPC();
    console.log('✅ Umami Analytics Service initialized');

    // SearXNG — meta search engine
    searxngService = new SearXNGService();
    console.log('✅ SearXNG Service initialized');

    // Catalog — local file library
    catalogService = new CatalogService();
    console.log('✅ Catalog Service initialized');

    // Knowledge Hub — local libraries + cloud D1/R2
    knowledgeHubService = new KnowledgeHubService(catalogService);
    knowledgeHubService.autoRegisterHubLibraries()
      .then(r => console.log(`✅ Knowledge Hub: zarejestrowano ${r.registered} bibl. (pominięto: ${r.skipped})`))
      .catch(() => console.log('⚠️ Knowledge Hub: auto-register failed (The_DEVz_HUB_of_work may not exist)'));

    // Agents Creator — themed agents with personal knowledge bases
    agentsCreatorService = new AgentsCreatorService(catalogService);
    console.log('✅ Agents Creator Service initialized');

    // Search — unified orchestrator (SearXNG + AI + Catalog)
    searchService = new SearchService(searxngService, catalogService, aiGatewayService);
    console.log('✅ Search Service initialized');

    // MeiliSearch — local history + autocomplete
    meilisearchService = new MeilisearchService();
    meilisearchService.ensureIndexes().catch(() => { /* Meili may not be running yet */ });
    console.log('✅ MeiliSearch Service initialized');

    // Websurfx — meta search engine (SearXNG replacement)
    websurfxService = new WebsurfxService();
    console.log('✅ Websurfx Service initialized');

    // sist2 — archive/document indexer (SQLite mode)
    sist2Service = new Sist2Service();
    console.log('✅ sist2 Service initialized');

    // Sync + CMS — bidirectional local ↔ CF sync
    syncService = new SyncService();
    syncService.registerIPC();
    console.log('✅ Sync/CMS Service initialized');

    // MCP Server
    mcpServer = createMCPServer({
      browserManager,
      mainWindow,
    });
    console.log('✅ MCP Server initialized');

    setupIPCHandlers();
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Setup IPC handlers for communication between renderer and main
 */
function setupIPCHandlers() {
  const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];

  function isValidString(val: unknown): val is string {
    return typeof val === 'string' && val.length > 0 && val.length < 8192;
  }

  function isSafeUrl(url: string): boolean {
    const lower = url.trim().toLowerCase();
    return !BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p));
  }

  // Browser operations
  ipcMain.handle('browser:new-tab', async () => {
    return browserManager.createTab();
  });

  ipcMain.handle('browser:close-tab', async (_, tabId: string) => {
    if (!isValidString(tabId)) return false;
    return browserManager.closeTab(tabId);
  });

  ipcMain.handle('browser:navigate', async (_, tabId: string, url: string) => {
    if (!isValidString(tabId) || !isValidString(url)) return false;
    if (!isSafeUrl(url)) return false;
    return browserManager.navigate(tabId, url);
  });

  ipcMain.handle('browser:get-tabs', async () => {
    return browserManager.getTabs();
  });

  ipcMain.handle('browser:go-back', async (_, tabId: string) => {
    if (!isValidString(tabId)) return false;
    return browserManager.goBack?.(tabId) ?? false;
  });

  ipcMain.handle('browser:go-forward', async (_, tabId: string) => {
    if (!isValidString(tabId)) return false;
    return browserManager.goForward?.(tabId) ?? false;
  });

  // AI Gateway
  ipcMain.handle(
    'ai:execute',
    async (_, request: any) => {
      try {
        const response = await aiGatewayService.execute(request);
        return { success: true, data: response };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle('ai:get-providers', async () => {
    return aiGatewayService.getProviderStatus();
  });

  ipcMain.handle('ai:get-metrics', async () => {
    return aiGatewayService.getMetrics();
  });

  // Network monitoring
  ipcMain.handle('network:get-report', async (_, tabId: string) => {
    if (!isValidString(tabId)) return null;
    return networkMonitor.getReport(tabId);
  });

  // Advanced Network Manager
  ipcMain.handle('network:get-stats', async () => {
    return advancedNetworkManager.getStats();
  });

  ipcMain.handle('network:get-connections', async (_, filter?: { domain?: string; method?: string }) => {
    return advancedNetworkManager.getConnections(filter);
  });

  ipcMain.handle('network:set-proxy', async (_, proxyUrl: string, type?: 'http' | 'socks5') => {
    if (!isValidString(proxyUrl)) return false;
    await advancedNetworkManager.setProxy(proxyUrl, type);
    return true;
  });

  ipcMain.handle('network:clear-proxy', async () => {
    await advancedNetworkManager.clearProxy();
    return true;
  });

  ipcMain.handle('network:get-config', async () => {
    return advancedNetworkManager.getConfig();
  });

  // Tab Communication
  ipcMain.handle('tabs:send-message', async (_, fromTabId: string, toTabId: string | undefined, type: string, payload: unknown) => {
    if (!isValidString(fromTabId) || !isValidString(type)) return null;
    if (toTabId !== undefined && !isValidString(toTabId)) return null;
    return tabComm.sendMessage(fromTabId, toTabId, type, payload);
  });

  ipcMain.handle('tabs:get-messages', async (_, opts?: { fromTabId?: string; toTabId?: string; limit?: number }) => {
    return tabComm.getMessageHistory(opts);
  });

  ipcMain.handle('tabs:register', async (_, tabId: string) => {
    if (!isValidString(tabId)) return null;
    tabComm.registerTab(tabId);
    return true;
  });

  ipcMain.handle('tabs:share-session', async (_, fromTabId: string, toTabId: string, keys: string[]) => {
    if (!isValidString(fromTabId) || !isValidString(toTabId)) return false;
    return tabComm.shareSession(fromTabId, toTabId, keys);
  });

  ipcMain.handle('tabs:share-auth', async (_, fromTabId: string, toTabId?: string) => {
    if (!isValidString(fromTabId)) return false;
    return tabComm.shareAuthToken(fromTabId, toTabId);
  });

  // Workflow Engine
  ipcMain.handle('workflow:create', async (_, id: string, steps: any[]) => {
    if (!isValidString(id) || !Array.isArray(steps)) return null;
    return workflowEngine.createWorkflow(id, steps);
  });

  ipcMain.handle('workflow:execute', async (_, workflowId: string) => {
    if (!isValidString(workflowId)) return null;
    return workflowEngine.executeWorkflow(workflowId);
  });

  ipcMain.handle('workflow:get-execution', async (_, executionId: string) => {
    if (!isValidString(executionId)) return null;
    return workflowEngine.getExecution(executionId);
  });

  ipcMain.handle('workflow:list', async () => {
    return workflowEngine.listWorkflows();
  });

  ipcMain.handle('workflow:list-executions', async () => {
    return workflowEngine.listExecutions();
  });

  // Crawler
  ipcMain.handle('crawler:start', async (_, config: any) => {
    if (!config || !Array.isArray(config.startUrls)) return null;
    // Validate URLs
    for (const u of config.startUrls) {
      if (!isValidString(u) || !isSafeUrl(u)) return null;
    }
    return crawlerService.startCrawl(config);
  });

  ipcMain.handle('crawler:cancel', async (_, crawlId: string) => {
    if (!isValidString(crawlId)) return false;
    return crawlerService.cancelCrawl(crawlId);
  });

  ipcMain.handle('crawler:get', async (_, crawlId: string) => {
    if (!isValidString(crawlId)) return null;
    return crawlerService.getCrawl(crawlId);
  });

  ipcMain.handle('crawler:list', async () => {
    return crawlerService.listCrawls();
  });

  ipcMain.handle('crawler:export', async (_, crawlId: string, format?: 'json' | 'csv') => {
    if (!isValidString(crawlId)) return null;
    return crawlerService.exportCrawlData(crawlId, format);
  });

  // Security
  ipcMain.handle('security:create-context', async (_, tabId: string) => {
    if (!isValidString(tabId)) return null;
    return securitySandbox.createIsolatedContext(tabId);
  });

  ipcMain.handle('security:get-audit-logs', async (_, tabId?: string) => {
    if (tabId !== undefined && !isValidString(tabId)) return [];
    return securitySandbox.getAuditLogs(tabId);
  });

  // Tunnel
  ipcMain.handle('tunnel:status', async () => {
    return []; // No tunnel configured yet
  });

  ipcMain.handle('tunnel:metrics', async () => {
    return { totalRequests: 0, avgLatency: 0, errorRate: 0, activeConnections: 0, bytesTransferred: 0 };
  });

  ipcMain.handle('tunnel:reconnect', async () => {
    console.log('Tunnel reconnect requested');
  });

  // ═══════════════════════════════════════════════════════════
  // Terminal execution (sandboxed shell commands, expanded)
  // ═══════════════════════════════════════════════════════════

  // Persistent CWD state per session
  let terminalCwd = app.getPath('home');

  const dangerousPatterns = [
    /rm\s+(-rf?|--recursive)\s+[/\\]/i,
    /format\s+[a-z]:/i,
    /del\s+\/[sfq]/i,
    /:(fork|bomb)/i,
  ];

  function isBlockedCommand(cmd: string): boolean {
    return dangerousPatterns.some(p => p.test(cmd));
  }

  ipcMain.handle('terminal:execute', async (_, command: string, cwd?: string) => {
    if (!isValidString(command)) return { success: false, error: 'Nieprawidłowe polecenie' };
    if (isBlockedCommand(command)) {
      return { success: false, error: 'Polecenie zablokowane ze względów bezpieczeństwa' };
    }
    const workDir = (cwd && typeof cwd === 'string') ? cwd : terminalCwd;
    try {
      const { execSync } = require('child_process');
      const stdout = execSync(command, {
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        cwd: workDir,
        windowsHide: true,
      });
      return { success: true, stdout, stderr: '', cwd: workDir };
    } catch (error: any) {
      return {
        success: true,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? error.message ?? 'Nieznany błąd',
        cwd: workDir,
      };
    }
  });

  ipcMain.handle('terminal:get-cwd', async () => {
    return terminalCwd;
  });

  ipcMain.handle('terminal:set-cwd', async (_, dir: string) => {
    if (!isValidString(dir)) return { success: false, error: 'Nieprawidłowa ścieżka' };
    const path = require('path');
    const fs = require('fs');
    try {
      const resolved = path.resolve(terminalCwd, dir);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        terminalCwd = resolved;
        return { success: true, cwd: terminalCwd };
      }
      return { success: false, error: `Katalog nie istnieje: ${resolved}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('terminal:system-info', async () => {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      uptime: os.uptime(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      cpuCount: os.cpus().length,
      homeDir: os.homedir(),
      hostname: os.hostname(),
    };
  });

  ipcMain.handle('terminal:get-env', async (_, name?: string) => {
    if (name && typeof name === 'string') {
      return process.env[name] ?? '';
    }
    // Return a safe subset — don't expose secrets
    const safe: Record<string, string> = {};
    const env = process.env;
    for (const key of Object.keys(env)) {
      if (!/secret|token|password|key|auth/i.test(key)) {
        safe[key] = String(env[key] ?? '');
      }
    }
    return safe;
  });

  ipcMain.handle('terminal:kill-process', async (_, pid: number) => {
    if (typeof pid !== 'number' || pid <= 0) return { success: false, error: 'Nieprawidłowy PID' };
    try {
      process.kill(pid, 'SIGTERM');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MCP — Model Context Protocol (browser tools via MCP)
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('mcp:list-tools', async () => {
    return mcpServer.getToolNames();
  });

  ipcMain.handle('mcp:execute-tool', async (_, toolName: string, args: Record<string, unknown>) => {
    if (!isValidString(toolName)) return { success: false, error: 'Invalid tool name' };
    try {
      const result = await mcpServer.executeTool(toolName, args ?? {});
      return { success: true, data: result };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('mcp:get-tool-schema', async (_, toolName: string) => {
    if (!isValidString(toolName)) return null;
    return mcpServer.getToolSchema(toolName);
  });

  ipcMain.handle('mcp:server-status', async () => {
    return {
      running: mcpServer.isRunning(),
      toolCount: mcpServer.getToolNames().length,
      tools: mcpServer.getToolNames(),
    };
  });

  // ═══════════════════════════════════════════════════════════
  // Search — Unified 3-layer search
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('search:web', async (_, query: string, filters?: any) => {
    if (!isValidString(query)) return { success: false, error: 'Nieprawidłowe zapytanie' };
    try {
      const results = await searchService.webSearch(query, filters);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('search:deep', async (_, query: string, filters?: any) => {
    if (!isValidString(query)) return { success: false, error: 'Nieprawidłowe zapytanie' };
    try {
      const report = await searchService.deepSearch(query, filters);
      return { success: true, data: report };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('search:local', async (_, query: string, libraryId?: string) => {
    if (!isValidString(query)) return { success: false, error: 'Nieprawidłowe zapytanie' };
    try {
      const results = searchService.localSearch(query, libraryId);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('search:compare', async (_, query: string, libraryId?: string) => {
    if (!isValidString(query)) return { success: false, error: 'Nieprawidłowe zapytanie' };
    try {
      const result = await searchService.compare(query, libraryId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('search:is-ready', async () => {
    return searchService.isReady();
  });

  ipcMain.handle('search:get-config', async () => {
    return searchService.getConfig();
  });

  ipcMain.handle('search:set-config', async (_, config: any) => {
    if (!config || typeof config !== 'object') return;
    searchService.setConfig(config);
  });

  // ═══════════════════════════════════════════════════════════
  // MeiliSearch — History & Autocomplete
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('meili:add-history', async (_, entry: any) => {
    if (!entry || !entry.url) return { success: false, error: 'Brak URL' };
    try {
      await meilisearchService.addHistoryEntry(entry);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('meili:search-history', async (_, query: string, limit?: number) => {
    if (!isValidString(query)) return { success: false, error: 'Nieprawidłowe zapytanie' };
    try {
      const result = await meilisearchService.searchHistory(query, limit);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('meili:autocomplete', async (_, query: string, limit?: number) => {
    if (!isValidString(query)) return { success: false, error: 'Nieprawidłowe zapytanie' };
    try {
      const results = await meilisearchService.autocomplete(query, limit);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('meili:recent-history', async (_, limit?: number) => {
    try {
      const results = await meilisearchService.getRecentHistory(limit);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('meili:clear-history', async () => {
    try {
      await meilisearchService.clearHistory();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('meili:healthy', async () => {
    return meilisearchService.isHealthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Websurfx — Meta search engine (SearXNG replacement)
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('websurfx:search', async (_, query: string, filters?: Record<string, unknown>) => {
    if (!isValidString(query)) return { success: false, error: 'Brak zapytania' };
    try {
      const result = await websurfxService.search(query, filters as any);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('websurfx:healthy', async () => {
    return websurfxService.isHealthy();
  });

  // ═══════════════════════════════════════════════════════════
  // sist2 — Archive/Document Indexer
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('sist2:search', async (_, query: string, size?: number, from?: number) => {
    if (!isValidString(query)) return { success: false, error: 'Brak zapytania' };
    try {
      const result = await sist2Service.search(query, size, from);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sist2:get-indices', async () => {
    try {
      const indices = await sist2Service.getIndices();
      return { success: true, data: indices };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sist2:scan-directory', async (_, dirPath: string) => {
    if (!isValidString(dirPath)) return { success: false, error: 'Nieprawidłowa ścieżka' };
    try {
      const job = await sist2Service.scanDirectory(dirPath);
      return { success: true, data: job };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sist2:get-jobs', async () => {
    try {
      const jobs = await sist2Service.getJobs();
      return { success: true, data: jobs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sist2:healthy', async () => {
    return sist2Service.isHealthy();
  });

  // ═══════════════════════════════════════════════════════════
  // Catalog — Local file library browser
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('catalog:add-library', async (_, name: string, rootPath: string, extensions?: string[]) => {
    if (!isValidString(name) || !isValidString(rootPath)) return { success: false, error: 'Nieprawidłowe parametry' };
    try {
      const lib = catalogService.addLibrary(name, rootPath, extensions);
      return { success: true, data: lib };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('catalog:remove-library', async (_, libraryId: string) => {
    if (!isValidString(libraryId)) return;
    catalogService.removeLibrary(libraryId);
  });

  ipcMain.handle('catalog:get-libraries', async () => {
    return catalogService.getLibraries();
  });

  ipcMain.handle('catalog:index-library', async (_, libraryId: string) => {
    if (!isValidString(libraryId)) return { success: false, error: 'Nieprawidłowe ID' };
    try {
      const result = catalogService.indexLibrary(libraryId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('catalog:index-all', async () => {
    try {
      const result = catalogService.indexAll();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('catalog:get-file-tree', async (_, libraryId: string) => {
    if (!isValidString(libraryId)) return null;
    return catalogService.getFileTree(libraryId);
  });

  ipcMain.handle('catalog:read-file', async (_, filePath: string) => {
    if (!isValidString(filePath)) return { success: false, error: 'Nieprawidłowa ścieżka' };
    try {
      const file = catalogService.readFile(filePath);
      if (!file) return { success: false, error: 'Plik niedostępny lub poza biblioteką' };
      return { success: true, data: file };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('catalog:get-stats', async () => {
    return catalogService.getStats();
  });

  // ═══════════════════════════════════════════════════════════
  // Knowledge Hub — local libraries + D1/R2 cloud
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('hub:auto-register', async () => {
    try {
      const result = await knowledgeHubService.autoRegisterHubLibraries();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hub:get-stats', async () => {
    return knowledgeHubService.getHubStats();
  });

  ipcMain.handle('hub:get-topics', async () => {
    return knowledgeHubService.getKnowledgeTopics();
  });

  ipcMain.handle('hub:get-topic-files', async (_, topicId: string, limit?: number) => {
    if (!isValidString(topicId)) return [];
    return knowledgeHubService.readTopicFiles(topicId, limit);
  });

  ipcMain.handle('hub:get-agents', async () => {
    return knowledgeHubService.getAgentDefinitions();
  });

  ipcMain.handle('hub:create-agent', async (_, agent: any) => {
    if (!agent || !isValidString(agent.id) || !isValidString(agent.name)) {
      return { success: false, error: 'Nieprawidłowe dane agenta' };
    }
    try {
      const created = knowledgeHubService.createAgent(agent);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hub:get-cloud-resources', async () => {
    return knowledgeHubService.getCloudResources();
  });

  ipcMain.handle('hub:search-knowledge', async (_, query: string, topicId?: string) => {
    if (!isValidString(query)) return { success: false, error: 'Puste zapytanie' };
    try {
      const results = knowledgeHubService.searchKnowledge(query, topicId);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Agents Creator ───────────────────────────────────────────

  ipcMain.handle('ac:list-workspaces', async () => {
    return agentsCreatorService.listWorkspaces();
  });

  ipcMain.handle('ac:create-workspace', async (_, config: any) => {
    if (!config || !isValidString(config.name)) return { success: false, error: 'Nieprawidłowa nazwa' };
    try {
      const ws = agentsCreatorService.createWorkspace(config);
      return { success: true, data: ws };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:delete-workspace', async (_, agentId: string) => {
    if (!isValidString(agentId)) return { success: false, error: 'Nieprawidłowe ID' };
    try {
      agentsCreatorService.deleteWorkspace(agentId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:get-workspace', async (_, agentId: string) => {
    if (!isValidString(agentId)) return null;
    return agentsCreatorService.getWorkspace(agentId);
  });

  ipcMain.handle('ac:update-workspace', async (_, agentId: string, updates: any) => {
    if (!isValidString(agentId)) return { success: false, error: 'Nieprawidłowe ID' };
    try {
      const ws = agentsCreatorService.updateWorkspace(agentId, updates);
      return { success: true, data: ws };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:get-kb-files', async (_, agentId: string) => {
    if (!isValidString(agentId)) return [];
    return agentsCreatorService.getKnowledgeFiles(agentId);
  });

  ipcMain.handle('ac:add-kb-file', async (_, agentId: string, sourcePath: string) => {
    if (!isValidString(agentId) || !isValidString(sourcePath)) return { success: false, error: 'Brak danych' };
    try {
      const file = agentsCreatorService.addKnowledgeFile(agentId, sourcePath);
      return { success: true, data: file };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:import-from-topic', async (_, agentId: string, topicId: string) => {
    if (!isValidString(agentId) || !isValidString(topicId)) return { success: false, error: 'Brak danych' };
    try {
      const result = agentsCreatorService.importFromTopic(agentId, topicId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:import-from-url', async (_, agentId: string, url: string) => {
    if (!isValidString(agentId) || !isValidString(url)) return { success: false, error: 'Brak danych' };
    try {
      const file = await agentsCreatorService.importFromUrl(agentId, url);
      return { success: true, data: file };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:remove-kb-file', async (_, agentId: string, fileName: string) => {
    if (!isValidString(agentId) || !isValidString(fileName)) return { success: false, error: 'Brak danych' };
    try {
      agentsCreatorService.removeKnowledgeFile(agentId, fileName);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:read-kb-file', async (_, agentId: string, fileName: string) => {
    if (!isValidString(agentId) || !isValidString(fileName)) return null;
    return agentsCreatorService.readKnowledgeFile(agentId, fileName);
  });

  ipcMain.handle('ac:get-prompt-snippets', async (_, agentId: string) => {
    if (!isValidString(agentId)) return [];
    return agentsCreatorService.getPromptSnippets(agentId);
  });

  ipcMain.handle('ac:add-prompt-snippet', async (_, agentId: string, snippet: any) => {
    if (!isValidString(agentId) || !snippet?.name) return { success: false, error: 'Brak danych' };
    try {
      agentsCreatorService.addPromptSnippet(agentId, snippet);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:index-rag', async (_, agentId: string) => {
    if (!isValidString(agentId)) return { success: false, error: 'Nieprawidłowe ID' };
    try {
      const result = await agentsCreatorService.indexForRag(agentId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ac:search-rag', async (_, agentId: string, query: string, limit?: number) => {
    if (!isValidString(agentId) || !isValidString(query)) return [];
    return agentsCreatorService.searchRag(agentId, query, limit);
  });

  ipcMain.handle('ac:get-domain-templates', async () => {
    return agentsCreatorService.getDomainTemplates();
  });

  ipcMain.handle('ac:generate-context', async (_, agentId: string) => {
    if (!isValidString(agentId)) return '';
    return agentsCreatorService.generatePromptContext(agentId);
  });

  // Theme
  ipcMain.handle('theme:toggle', async () => {
    nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
    return nativeTheme.shouldUseDarkColors;
  });

  // Window
  ipcMain.handle('window:minimize', async () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', async () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', async () => {
    mainWindow?.close();
  });

  // Dialog — native folder/file picker with defaultPath support
  ipcMain.handle('dialog:open-folder', async (_, opts?: { defaultPath?: string; title?: string }) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: opts?.title || 'Wybierz folder',
      defaultPath: opts?.defaultPath || 'U:\\The_DEVz_HUB_of_work',
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:open-files', async (_, opts?: { defaultPath?: string; title?: string }) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: opts?.title || 'Wybierz pliki',
      defaultPath: opts?.defaultPath || 'U:\\The_DEVz_HUB_of_work',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Knowledge files', extensions: ['md', 'txt', 'json', 'yaml', 'yml', 'html', 'ts', 'tsx', 'js'] }],
    });
    return result.canceled ? null : result.filePaths;
  });

  // Read files from a list of paths — returns [{name, content, path}]
  ipcMain.handle('dialog:read-files', async (_, paths: string[]) => {
    const { readFileSync, statSync } = await import('fs');
    const { extname, basename } = await import('path');
    const ALLOWED = ['.md', '.txt', '.json', '.yaml', '.yml', '.html', '.ts', '.tsx', '.js'];
    const MAX_SIZE = 500_000;
    const results: Array<{ name: string; content: string; path: string }> = [];
    for (const p of paths) {
      try {
        if (!ALLOWED.includes(extname(p).toLowerCase())) continue;
        if (statSync(p).size > MAX_SIZE) continue;
        results.push({ name: basename(p), content: readFileSync(p, 'utf-8'), path: p });
      } catch { /* skip unreadable */ }
    }
    return results;
  });

  // Read all eligible files from a directory (recursive)
  ipcMain.handle('dialog:read-dir-files', async (_, dirPath: string) => {
    const { readFileSync, readdirSync, statSync } = await import('fs');
    const nodePath = await import('path');
    const ALLOWED = ['.md', '.txt', '.json', '.yaml', '.yml', '.html', '.ts', '.tsx', '.js'];
    const MAX_SIZE = 500_000;
    const results: Array<{ name: string; content: string; path: string }> = [];
    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = nodePath.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); }
        else if (ALLOWED.includes(nodePath.extname(entry.name).toLowerCase())) {
          try {
            if (statSync(full).size <= MAX_SIZE) {
              results.push({ name: entry.name, content: readFileSync(full, 'utf-8'), path: full });
            }
          } catch { /* skip */ }
        }
      }
    }
    try { walk(dirPath); return { success: true, files: results }; }
    catch (e: any) { return { success: false, files: [], error: e.message }; }
  });
}

/**
 * App event handlers
 */

// Fix GPU process crashes on Windows (STATUS_STACK_BUFFER_OVERRUN, exit_code=-1073740791)
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-dev-shm-usage');

app.on('ready', async () => {
  try {
    await initializeServices();
    createWindow();
    browserManager.setMainWindow(mainWindow!);
    mcpServer.updateContext({ mainWindow });
    advancedNetworkManager.attach();

    // Start MCP HTTP/SSE server for external clients (VS Code, Claude, etc.)
    mcpServer.startHTTP(3847).catch((err: Error) => {
      console.warn('⚠️ MCP HTTP server failed to start (non-fatal):', err.message);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n📡 Shutting down gracefully...');
  app.quit();
});

process.on('SIGTERM', () => {
  console.log('\n📡 Shutting down gracefully...');
  app.quit();
});

export { mainWindow, browserManager, aiGatewayService, mcpServer };