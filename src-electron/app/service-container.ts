import { app, BrowserWindow } from "electron";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { BrowserManager } from "../services/browser-manager";
import { AIGatewayService } from "../services/ai-gateway-service";
import { NetworkMonitor } from "../services/network-monitor";
import { NetworkManager } from "../services/network-manager";
import { TabCommunicationManager } from "../services/tab-communication";
import { WorkflowEngine } from "../services/workflow-engine";
import { CrawlerService } from "../services/crawler-service";
import { SearXNGService } from "../services/searxng-service";
import { CatalogService } from "../services/catalog-service";
import { SearchService } from "../services/search-service";
import { MeilisearchService } from "../services/meilisearch-service";
import { WebsurfxService } from "../services/websurfx-service";
import { Sist2Service } from "../services/sist2-service";
import { KnowledgeHubService } from "../services/knowledge-hub-service";
import { AgentsCreatorService } from "../services/agents-creator-service";
import { CopilotSdkService } from "../services/copilot-sdk-service";
import { SecuritySandbox } from "../services/security-sandbox";
import { UmamiService } from "../services/umami-service";
import { SyncService } from "../services/sync-service";
import { createMCPServer, type MCPServer } from "../mcp-server";

type ServicesMap = {
  browserManager: BrowserManager;
  aiGatewayService: AIGatewayService;
  networkMonitor: NetworkMonitor;
  networkManager: NetworkManager;
  tabComm: TabCommunicationManager;
  workflowEngine: WorkflowEngine;
  crawlerService: CrawlerService;
  searxngService: SearXNGService;
  catalogService: CatalogService;
  searchService: SearchService;
  meilisearchService: MeilisearchService;
  websurfxService: WebsurfxService;
  sist2Service: Sist2Service;
  knowledgeHubService: KnowledgeHubService;
  agentsCreatorService: AgentsCreatorService;
  copilotSdkService: CopilotSdkService;
  securitySandbox: SecuritySandbox;
  umamiService: UmamiService;
  syncService: SyncService;
  mcpServer: MCPServer;
  terminalState: { cwd: string };
};

export class ServiceContainer {
  private services = new Map<keyof ServicesMap | string, unknown>();

  register<T>(name: keyof ServicesMap | string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: keyof ServicesMap | string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${String(name)}`);
    }
    return service as T;
  }

  async init(): Promise<void> {
    const browserManager = new BrowserManager();
    const aiGatewayService = new AIGatewayService();
    await aiGatewayService.initialize();
    const networkMonitor = new NetworkMonitor();
    const networkManager = new NetworkManager();
    const tabComm = new TabCommunicationManager();
    const workflowEngine = new WorkflowEngine(browserManager);
    const crawlerService = new CrawlerService();
    const searxngService = new SearXNGService();
    const catalogService = new CatalogService();
    const searchService = new SearchService(
      searxngService,
      catalogService,
      aiGatewayService,
    );
    const meilisearchService = new MeilisearchService();
    meilisearchService
      .ensureIndexes()
      .catch((err) =>
        console.warn("[ServiceContainer] Meilisearch init skipped:", err),
      );
    const websurfxService = new WebsurfxService();
    const sist2Service = new Sist2Service();
    const knowledgeHubService = new KnowledgeHubService(catalogService);
    void knowledgeHubService.autoRegisterHubLibraries();
    const agentsCreatorService = new AgentsCreatorService(catalogService);
    const copilotSdkService = new CopilotSdkService();
    const securitySandbox = new SecuritySandbox();
    const umamiService = new UmamiService();
    umamiService.registerIPC();
    const syncService = new SyncService();
    syncService.registerIPC();
    const mcpServer = createMCPServer({ browserManager, mainWindow: null });

    this.register("browserManager", browserManager);
    this.register("aiGatewayService", aiGatewayService);
    this.register("networkMonitor", networkMonitor);
    this.register("networkManager", networkManager);
    this.register("tabComm", tabComm);
    this.register("workflowEngine", workflowEngine);
    this.register("crawlerService", crawlerService);
    this.register("searxngService", searxngService);
    this.register("catalogService", catalogService);
    this.register("searchService", searchService);
    this.register("meilisearchService", meilisearchService);
    this.register("websurfxService", websurfxService);
    this.register("sist2Service", sist2Service);
    this.register("knowledgeHubService", knowledgeHubService);
    this.register("agentsCreatorService", agentsCreatorService);
    this.register("copilotSdkService", copilotSdkService);
    this.register("securitySandbox", securitySandbox);
    this.register("umamiService", umamiService);
    this.register("syncService", syncService);
    this.register("mcpServer", mcpServer);
    this.register("terminalState", { cwd: app.getPath("home") });
  }

  async startAll(): Promise<void> {
    const mcpServer = this.get<MCPServer>("mcpServer");
    await mcpServer.startHTTP(3847);
  }

  stopAll(): void {
    // reserved for future cleanup hooks
  }

  attachWindow(win: BrowserWindow): void {
    this.get<BrowserManager>("browserManager").setMainWindow(win);
    this.get<MCPServer>("mcpServer").updateContext({ mainWindow: win });
    this.get<NetworkManager>("networkManager").attach();
  }

  execCommand(
    command: string,
    cwd?: string,
  ): {
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    cwd?: string;
  } {
    const workDir = cwd ?? this.get<{ cwd: string }>("terminalState").cwd;
    try {
      const stdout = execSync(command, {
        encoding: "utf8",
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        cwd: workDir,
        windowsHide: true,
      });
      return { success: true, stdout, stderr: "", cwd: workDir };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg, cwd: workDir };
    }
  }

  setTerminalCwd(dir: string): {
    success: boolean;
    cwd?: string;
    error?: string;
  } {
    const terminalState = this.get<{ cwd: string }>("terminalState");
    const resolved = path.resolve(terminalState.cwd, dir);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return { success: false, error: `Katalog nie istnieje: ${resolved}` };
    }
    terminalState.cwd = resolved;
    return { success: true, cwd: resolved };
  }

  getSystemInfo(): Record<string, unknown> {
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
  }
}
