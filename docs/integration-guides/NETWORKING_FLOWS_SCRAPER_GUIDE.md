# 🌐 ZENO Browser - Advanced Networking, Flows & Scraper System

## 📋 Overview

ZENO Browser musi obsługiwać:
1. **Advanced Network Control** - Custom proxy, localhost, LAN, tunele
2. **Tab & Flow Dependencies** - Komunikacja między zakładkami
3. **Workflow Chains** - Multi-step automatyzacja
4. **Crawler & Scraper API** - Wbudowane + external tools
5. **Network Monitoring** - Pełny audit i kontrola

---

## 🌐 Part 1: Advanced Network Manager

### Architecture

```
ZENO Network Layer
│
├─ Direct Access
│  ├─ HTTPS / HTTP / WSS / WS
│  └─ Localhost: 127.0.0.1:*, localhost:*, 0.0.0.0:*
│
├─ Custom Proxy
│  ├─ HTTP/HTTPS Proxy
│  ├─ SOCKS5 Proxy
│  ├─ Cloudflare WebTunnel
│  └─ Custom Tunnel
│
├─ LAN/Local Network
│  ├─ 192.168.*.* / 10.0.0.*
│  ├─ mDNS (.local domains)
│  └─ Service Discovery
│
├─ Connection Pool
│  ├─ Connection reuse
│  ├─ Keep-alive
│  └─ Timeout management
│
└─ Monitoring & Audit
   ├─ All requests logged
   ├─ Network visualization
   └─ Performance metrics
```

### Implementation

```typescript
// File: src-electron/services/network-manager.ts

import { net, session } from 'electron';
import { EventEmitter } from 'events';

export interface NetworkConfig {
  proxyUrl?: string;
  proxyType?: 'http' | 'socks5' | 'custom';
  allowLocalhost?: boolean;
  allowLAN?: boolean;
  dnsOverrides?: Record<string, string>;
  tunnels?: TunnelConfig[];
}

export interface ConnectionInfo {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: Date;
  headers?: Record<string, string>;
  proxy?: string;
}

export class NetworkManager extends EventEmitter {
  private config: NetworkConfig;
  private connections: Map<string, ConnectionInfo> = new Map();
  private connectionPool: Map<string, any> = new Map();
  private currentProxy: string | null = null;

  constructor(config: NetworkConfig = {}) {
    super();
    this.config = {
      allowLocalhost: true,
      allowLAN: true,
      ...config,
    };
    this.setupNetworkInterception();
    this.setupProxyHandling();
  }

  /**
   * Setup network request interception
   */
  private setupNetworkInterception() {
    const filter = { urls: ['<all_urls>'] };

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
      const connectionId = `${Date.now()}-${Math.random()}`;
      
      this.logConnection({
        id: connectionId,
        url: details.url,
        method: details.method,
        status: 0,
        duration: 0,
        timestamp: new Date(),
        headers: details.requestHeaders,
      });

      // Emit event for monitoring
      this.emit('request', { url: details.url, method: details.method });

      callback({ cancel: false });
    });

    session.defaultSession.webRequest.onCompleted(filter, (details) => {
      this.emit('response', {
        url: details.url,
        status: details.statusCode,
        duration: details.responseStartTime,
      });
    });

    session.defaultSession.webRequest.onErrorOccurred(filter, (details) => {
      this.emit('error', { url: details.url, error: details.error });
    });
  }

  /**
   * Setup proxy handling
   */
  private setupProxyHandling() {
    if (this.config.proxyUrl) {
      this.setProxy(this.config.proxyUrl);
    }
  }

  /**
   * Set global proxy
   */
  async setProxy(proxyUrl: string, type: 'http' | 'socks5' = 'http') {
    try {
      const rules = this.config.proxyUrl
        ? `${type}://${proxyUrl}`
        : null;

      if (rules) {
        await session.defaultSession.setProxy({
          proxyRules: rules,
          proxyBypassRules: 'localhost,127.0.0.1,.local',
        });
        this.currentProxy = proxyUrl;
        this.emit('proxy-changed', { proxy: proxyUrl, type });
      }
    } catch (error) {
      console.error('Proxy setup failed:', error);
      this.emit('error', { type: 'proxy', error });
    }
  }

  /**
   * Clear proxy
   */
  async clearProxy() {
    await session.defaultSession.setProxy({ proxyRules: 'direct://' });
    this.currentProxy = null;
    this.emit('proxy-changed', { proxy: null });
  }

  /**
   * Allow localhost connections
   */
  allowLocalhost(enabled: boolean = true) {
    this.config.allowLocalhost = enabled;
    this.emit('config-changed', { allowLocalhost: enabled });
  }

  /**
   * Allow LAN connections
   */
  allowLAN(enabled: boolean = true) {
    this.config.allowLAN = enabled;
    this.emit('config-changed', { allowLAN: enabled });
  }

  /**
   * Add DNS override
   */
  addDNSOverride(domain: string, ip: string) {
    this.config.dnsOverrides = this.config.dnsOverrides || {};
    this.config.dnsOverrides[domain] = ip;
    this.emit('dns-override-added', { domain, ip });
  }

  /**
   * Log connection
   */
  private logConnection(conn: ConnectionInfo) {
    this.connections.set(conn.id, conn);

    // Keep last 1000 connections
    if (this.connections.size > 1000) {
      const firstKey = this.connections.keys().next().value;
      this.connections.delete(firstKey);
    }
  }

  /**
   * Get connection history
   */
  getConnections(filter?: { domain?: string; method?: string }): ConnectionInfo[] {
    let connections = Array.from(this.connections.values());

    if (filter?.domain) {
      connections = connections.filter(c => c.url.includes(filter.domain!));
    }

    if (filter?.method) {
      connections = connections.filter(c => c.method === filter.method);
    }

    return connections.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get network stats
   */
  getStats() {
    const connections = Array.from(this.connections.values());
    const byDomain = new Map<string, number>();
    const byStatus = new Map<number, number>();

    connections.forEach(conn => {
      const domain = new URL(conn.url).hostname;
      byDomain.set(domain, (byDomain.get(domain) || 0) + 1);
      byStatus.set(conn.status, (byStatus.get(conn.status) || 0) + 1);
    });

    return {
      total: connections.length,
      byDomain: Object.fromEntries(byDomain),
      byStatus: Object.fromEntries(byStatus),
      averageDuration: connections.length > 0
        ? connections.reduce((sum, c) => sum + c.duration, 0) / connections.length
        : 0,
    };
  }
}

export const networkManager = new NetworkManager({
  allowLocalhost: true,
  allowLAN: true,
});
```

---

## 🔗 Part 2: Tab & Flow Dependencies

### Tab Communication System

```typescript
// File: src/services/tab-communication.ts

import { EventEmitter } from 'events';

export interface TabMessage {
  id: string;
  fromTabId: string;
  toTabId?: string; // undefined = broadcast
  type: string;
  payload: any;
  timestamp: Date;
}

export interface TabContext {
  tabId: string;
  sessionData: Map<string, any>;
  cookies: Map<string, string>;
  authToken?: string;
  sharedClipboard?: string;
}

export class TabCommunicationManager extends EventEmitter {
  private tabs: Map<string, TabContext> = new Map();
  private messageQueue: TabMessage[] = [];

  /**
   * Register tab
   */
  registerTab(tabId: string): TabContext {
    const context: TabContext = {
      tabId,
      sessionData: new Map(),
      cookies: new Map(),
    };

    this.tabs.set(tabId, context);
    this.emit('tab-registered', { tabId });
    return context;
  }

  /**
   * Unregister tab
   */
  unregisterTab(tabId: string) {
    this.tabs.delete(tabId);
    this.emit('tab-unregistered', { tabId });
  }

  /**
   * Send message between tabs
   */
  sendMessage(
    fromTabId: string,
    toTabId: string | undefined,
    type: string,
    payload: any
  ): string {
    const message: TabMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      fromTabId,
      toTabId,
      type,
      payload,
      timestamp: new Date(),
    };

    this.messageQueue.push(message);

    if (toTabId) {
      // Direct message
      this.emit(`message:${toTabId}`, message);
    } else {
      // Broadcast to all tabs
      this.tabs.forEach((_, tabId) => {
        if (tabId !== fromTabId) {
          this.emit(`message:${tabId}`, message);
        }
      });
    }

    return message.id;
  }

  /**
   * Share session between tabs
   */
  shareSession(fromTabId: string, toTabId: string, data: Record<string, any>) {
    const fromContext = this.tabs.get(fromTabId);
    const toContext = this.tabs.get(toTabId);

    if (fromContext && toContext) {
      Object.entries(data).forEach(([key, value]) => {
        toContext.sessionData.set(key, value);
      });

      this.emit('session-shared', { fromTabId, toTabId, keys: Object.keys(data) });
    }
  }

  /**
   * Share cookies between tabs
   */
  shareCookies(fromTabId: string, toTabId: string) {
    const fromContext = this.tabs.get(fromTabId);
    const toContext = this.tabs.get(toTabId);

    if (fromContext && toContext) {
      fromContext.cookies.forEach((value, key) => {
        toContext.cookies.set(key, value);
      });

      this.emit('cookies-shared', { fromTabId, toTabId });
    }
  }

  /**
   * Share auth token
   */
  shareAuthToken(fromTabId: string, toTabId: string | undefined) {
    const fromContext = this.tabs.get(fromTabId);

    if (fromContext?.authToken) {
      if (toTabId) {
        const toContext = this.tabs.get(toTabId);
        if (toContext) {
          toContext.authToken = fromContext.authToken;
        }
      } else {
        // Broadcast to all
        this.tabs.forEach((context, tabId) => {
          if (tabId !== fromTabId) {
            context.authToken = fromContext.authToken;
          }
        });
      }

      this.emit('auth-shared', { fromTabId, toTabId });
    }
  }

  /**
   * Get tab context
   */
  getTabContext(tabId: string): TabContext | undefined {
    return this.tabs.get(tabId);
  }

  /**
   * Get all tabs
   */
  getAllTabs(): TabContext[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Message history
   */
  getMessageHistory(fromTabId?: string, toTabId?: string): TabMessage[] {
    return this.messageQueue.filter(msg => {
      if (fromTabId && msg.fromTabId !== fromTabId) return false;
      if (toTabId && msg.toTabId !== toTabId) return false;
      return true;
    });
  }
}

export const tabCommunicationManager = new TabCommunicationManager();
```

---

## ⚙️ Part 3: Workflow Chain System

### Workflow Engine

```typescript
// File: src/services/workflow-engine.ts

export type StepType = 
  | 'open-tab'
  | 'navigate'
  | 'login'
  | 'scrape'
  | 'extract'
  | 'transform'
  | 'export'
  | 'wait'
  | 'click'
  | 'fill-form'
  | 'custom';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, any>;
  inputs?: string[]; // Step IDs to wait for
  retryCount?: number;
  timeout?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  steps: StepExecution[];
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  endTime?: Date;
  results: Map<string, any>;
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: Error;
  duration?: number;
}

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowStep[]> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepHandlers: Map<StepType, (step: WorkflowStep, ctx: any) => Promise<any>> = new Map();

  constructor(private tabManager: any, private networkManager: any) {
    super();
    this.registerDefaultHandlers();
  }

  /**
   * Register default step handlers
   */
  private registerDefaultHandlers() {
    this.registerStepHandler('open-tab', async (step) => {
      const { url } = step.config;
      const tabId = await this.tabManager.createTab(url);
      return { tabId, url };
    });

    this.registerStepHandler('navigate', async (step, ctx) => {
      const { tabId, url } = step.config;
      await this.tabManager.navigate(tabId, url);
      return { tabId, url };
    });

    this.registerStepHandler('scrape', async (step, ctx) => {
      const { tabId, selector } = step.config;
      const data = await this.tabManager.executeScript(
        tabId,
        `document.querySelectorAll('${selector}').map(el => el.innerText)`
      );
      return { tabId, data };
    });

    this.registerStepHandler('export', async (step, ctx) => {
      const { format, filename, data } = step.config;
      // Export data (JSON, CSV, etc.)
      return { filename, format };
    });

    this.registerStepHandler('wait', async (step) => {
      const { duration } = step.config;
      await new Promise(resolve => setTimeout(resolve, duration));
      return { waited: duration };
    });
  }

  /**
   * Register custom step handler
   */
  registerStepHandler(
    type: StepType,
    handler: (step: WorkflowStep, ctx: any) => Promise<any>
  ) {
    this.stepHandlers.set(type, handler);
  }

  /**
   * Create workflow
   */
  createWorkflow(id: string, steps: WorkflowStep[]): string {
    this.workflows.set(id, steps);
    this.emit('workflow-created', { id, stepCount: steps.length });
    return id;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string): Promise<WorkflowExecution> {
    const steps = this.workflows.get(workflowId);
    if (!steps) throw new Error(`Workflow not found: ${workflowId}`);

    const executionId = `exec-${Date.now()}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      steps: steps.map(s => ({ stepId: s.id, status: 'pending' })),
      status: 'running',
      startTime: new Date(),
      results: new Map(),
    };

    this.executions.set(executionId, execution);
    this.emit('workflow-started', { executionId, workflowId });

    try {
      for (const step of steps) {
        const stepExec = execution.steps.find(s => s.stepId === step.id)!;
        stepExec.status = 'running';

        try {
          const startTime = Date.now();
          const handler = this.stepHandlers.get(step.type);
          
          if (!handler) {
            throw new Error(`No handler for step type: ${step.type}`);
          }

          const result = await handler(step, {
            previousResults: execution.results,
            tabManager: this.tabManager,
            networkManager: this.networkManager,
          });

          stepExec.result = result;
          stepExec.status = 'completed';
          stepExec.duration = Date.now() - startTime;
          execution.results.set(step.id, result);

          this.emit('step-completed', { executionId, stepId: step.id, result });
        } catch (error: any) {
          stepExec.status = 'failed';
          stepExec.error = error;
          execution.status = 'failed';

          this.emit('step-failed', { executionId, stepId: step.id, error });

          if (step.retryCount && step.retryCount > 0) {
            // Retry logic
          } else {
            break;
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      this.emit('workflow-completed', { executionId, workflowId });
    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      this.emit('workflow-failed', { executionId, workflowId, error });
    }

    return execution;
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get workflow
   */
  getWorkflow(workflowId: string): WorkflowStep[] | undefined {
    return this.workflows.get(workflowId);
  }
}
```

---

## 🕷️ Part 4: Crawler & Scraper API

### Crawler System

```typescript
// File: src/services/crawler-service.ts

export interface CrawlConfig {
  startUrls: string[];
  maxPages?: number;
  followLinks?: boolean;
  linkSelector?: string;
  dataSelector?: string;
  transform?: (data: any) => any;
  proxy?: string;
  userAgent?: string;
  delay?: number; // ms between requests
  timeout?: number;
}

export interface CrawlResult {
  id: string;
  config: CrawlConfig;
  status: 'running' | 'completed' | 'failed';
  pagesVisited: number;
  itemsExtracted: number;
  data: any[];
  errors: Array<{ url: string; error: string }>;
  startTime: Date;
  endTime?: Date;
}

export class CrawlerService extends EventEmitter {
  private crawls: Map<string, CrawlResult> = new Map();
  private queue: string[] = [];
  private visited: Set<string> = new Set();

  /**
   * Start crawl
   */
  async startCrawl(config: CrawlConfig): Promise<string> {
    const crawlId = `crawl-${Date.now()}`;
    const result: CrawlResult = {
      id: crawlId,
      config,
      status: 'running',
      pagesVisited: 0,
      itemsExtracted: 0,
      data: [],
      errors: [],
      startTime: new Date(),
    };

    this.crawls.set(crawlId, result);
    this.queue = [...config.startUrls];
    this.visited.clear();

    this.emit('crawl-started', { crawlId });

    // Start crawling async
    this.processCrawlQueue(crawlId, config);

    return crawlId;
  }

  /**
   * Process crawl queue
   */
  private async processCrawlQueue(crawlId: string, config: CrawlConfig) {
    const result = this.crawls.get(crawlId)!;

    while (this.queue.length > 0 && result.pagesVisited < (config.maxPages || 1000)) {
      const url = this.queue.shift()!;

      if (this.visited.has(url)) continue;
      this.visited.add(url);

      try {
        // Delay between requests
        if (config.delay) {
          await new Promise(resolve => setTimeout(resolve, config.delay));
        }

        // Fetch page
        const response = await fetch(url, {
          timeout: config.timeout || 10000,
          headers: {
            'User-Agent': config.userAgent || 'ZENO-Crawler/1.0',
          },
        });

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract data
        if (config.dataSelector) {
          const elements = doc.querySelectorAll(config.dataSelector);
          elements.forEach(el => {
            const data = el.innerText || el.innerHTML;
            let processed = data;

            if (config.transform) {
              processed = config.transform(data);
            }

            result.data.push({
              url,
              data: processed,
              timestamp: new Date(),
            });
          });

          result.itemsExtracted += elements.length;
        }

        // Find more links
        if (config.followLinks) {
          const links = doc.querySelectorAll(config.linkSelector || 'a');
          links.forEach((link: any) => {
            const href = link.href;
            if (href && !this.visited.has(href)) {
              this.queue.push(href);
            }
          });
        }

        result.pagesVisited++;
        this.emit('page-crawled', { crawlId, url, itemsFound: result.itemsExtracted });
      } catch (error: any) {
        result.errors.push({
          url,
          error: error.message,
        });

        this.emit('crawl-error', { crawlId, url, error: error.message });
      }
    }

    result.status = 'completed';
    result.endTime = new Date();
    this.emit('crawl-completed', { crawlId });
  }

  /**
   * Get crawl status
   */
  getCrawlStatus(crawlId: string): CrawlResult | undefined {
    return this.crawls.get(crawlId);
  }

  /**
   * Export crawl data
   */
  exportCrawlData(
    crawlId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): string {
    const crawl = this.crawls.get(crawlId);
    if (!crawl) throw new Error('Crawl not found');

    if (format === 'json') {
      return JSON.stringify(crawl.data, null, 2);
    } else if (format === 'csv') {
      // Simple CSV conversion
      if (crawl.data.length === 0) return '';
      const headers = Object.keys(crawl.data[0]);
      const rows = crawl.data.map(item => 
        headers.map(h => JSON.stringify((item as any)[h])).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }

    throw new Error(`Unsupported format: ${format}`);
  }
}
```

---

## 🎨 Part 5: UI Components for Network, Flows & Crawler

### Network Monitor Panel

```typescript
// File: src/components/NetworkMonitorPanel.tsx

export const NetworkMonitorPanel: React.FC = () => {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [proxy, setProxy] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Listen to network events
    window.electronAPI?.on?.('network-update', (data) => {
      setConnections(data.connections);
      setStats(data.stats);
    });
  }, []);

  return (
    <div className="network-monitor-panel">
      <h2>🌐 Network Monitor</h2>

      {/* Proxy Control */}
      <div className="proxy-control">
        <input
          type="text"
          placeholder="Proxy URL (e.g., http://proxy:8080)"
          value={proxy || ''}
          onChange={(e) => setProxy(e.target.value)}
        />
        <button onClick={() => window.electronAPI?.network?.setProxy?.(proxy)}>
          Set Proxy
        </button>
        <button onClick={() => window.electronAPI?.network?.clearProxy?.()}>
          Clear
        </button>
      </div>

      {/* Stats */}
      <div className="network-stats">
        <div>Total Requests: {stats?.total}</div>
        <div>Avg Duration: {stats?.averageDuration}ms</div>
        <div>By Status: {JSON.stringify(stats?.byStatus)}</div>
      </div>

      {/* Connections Table */}
      <table className="connections-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>URL</th>
            <th>Method</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {connections.map(conn => (
            <tr key={conn.id}>
              <td>{conn.timestamp.toLocaleTimeString()}</td>
              <td className="url-cell">{conn.url}</td>
              <td>{conn.method}</td>
              <td className={`status-${conn.status}`}>{conn.status}</td>
              <td>{conn.duration}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Workflow Designer Panel

```typescript
// File: src/components/WorkflowDesignerPanel.tsx

export const WorkflowDesignerPanel: React.FC = () => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);

  const addStep = (type: StepType) => {
    const step: WorkflowStep = {
      id: `step-${Date.now()}`,
      type,
      name: `${type} #${steps.length + 1}`,
      config: {},
    };
    setSteps([...steps, step]);
  };

  const executeWorkflow = async () => {
    const workflowId = `workflow-${Date.now()}`;
    const execution = await window.electronAPI?.workflow?.execute?.(
      workflowId,
      steps
    );
    setExecutions([...executions, execution]);
  };

  return (
    <div className="workflow-designer-panel">
      <h2>⚙️ Workflow Designer</h2>

      {/* Step Templates */}
      <div className="step-templates">
        <button onClick={() => addStep('open-tab')}>📱 Open Tab</button>
        <button onClick={() => addStep('navigate')}>🔗 Navigate</button>
        <button onClick={() => addStep('scrape')}>🕷️ Scrape</button>
        <button onClick={() => addStep('export')}>📤 Export</button>
        <button onClick={() => addStep('wait')}>⏳ Wait</button>
      </div>

      {/* Workflow Steps (Drag & Drop) */}
      <div className="workflow-steps">
        {steps.map((step, idx) => (
          <div key={step.id} className="workflow-step">
            <span className="step-index">{idx + 1}</span>
            <span className="step-type">{step.type}</span>
            <input
              type="text"
              value={step.name}
              onChange={(e) => {
                const updated = [...steps];
                updated[idx].name = e.target.value;
                setSteps(updated);
              }}
            />
            <button onClick={() => setSteps(steps.filter((_, i) => i !== idx))}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Execute Button */}
      <button className="btn-execute" onClick={executeWorkflow}>
        ▶️ Execute Workflow
      </button>

      {/* Execution History */}
      <div className="execution-history">
        {executions.map(exec => (
          <div key={exec.id} className={`execution ${exec.status}`}>
            <span>{exec.status}</span>
            <span>{exec.steps.length} steps</span>
            <span>
              {exec.endTime
                ? `${((exec.endTime.getTime() - exec.startTime.getTime()) / 1000).toFixed(2)}s`
                : 'Running...'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Crawler Panel

```typescript
// File: src/components/CrawlerPanel.tsx

export const CrawlerPanel: React.FC = () => {
  const [startUrl, setStartUrl] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  const [followLinks, setFollowLinks] = useState(true);
  const [dataSelector, setDataSelector] = useState('');
  const [crawls, setCrawls] = useState<CrawlResult[]>([]);

  const startCrawl = async () => {
    const crawlId = await window.electronAPI?.crawler?.start?.({
      startUrls: [startUrl],
      maxPages,
      followLinks,
      dataSelector,
    });

    // Monitor crawl progress
    window.electronAPI?.on?.(`crawl-${crawlId}:update`, (data) => {
      setCrawls(crawls.map(c => (c.id === crawlId ? { ...c, ...data } : c)));
    });
  };

  const exportCrawlData = async (crawlId: string, format: 'json' | 'csv') => {
    const data = await window.electronAPI?.crawler?.export?.(crawlId, format);
    // Download file
    const link = document.createElement('a');
    link.href = 'data:text/plain,' + encodeURIComponent(data);
    link.download = `crawl-${crawlId}.${format}`;
    link.click();
  };

  return (
    <div className="crawler-panel">
      <h2>🕷️ Crawler</h2>

      {/* Config */}
      <div className="crawler-config">
        <input
          type="text"
          placeholder="Start URL"
          value={startUrl}
          onChange={(e) => setStartUrl(e.target.value)}
        />
        <input
          type="number"
          min="1"
          max="1000"
          value={maxPages}
          onChange={(e) => setMaxPages(parseInt(e.target.value))}
        />
        <label>
          <input
            type="checkbox"
            checked={followLinks}
            onChange={(e) => setFollowLinks(e.target.checked)}
          />
          Follow Links
        </label>
        <input
          type="text"
          placeholder="Data Selector (CSS)"
          value={dataSelector}
          onChange={(e) => setDataSelector(e.target.value)}
        />
        <button onClick={startCrawl}>Start Crawl</button>
      </div>

      {/* Active Crawls */}
      <div className="active-crawls">
        {crawls.map(crawl => (
          <div key={crawl.id} className={`crawl-item ${crawl.status}`}>
            <div>
              <strong>{crawl.config.startUrls[0]}</strong>
              <span>{crawl.pagesVisited}/{crawl.config.maxPages} pages</span>
            </div>
            <div>
              <span>{crawl.itemsExtracted} items</span>
              <button onClick={() => exportCrawlData(crawl.id, 'json')}>
                JSON
              </button>
              <button onClick={() => exportCrawlData(crawl.id, 'csv')}>
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## ✅ Integration Checklist for Antigravity

- [ ] NetworkManager: Setup in main process
- [ ] TabCommunicationManager: Setup between webviews
- [ ] WorkflowEngine: Register handlers
- [ ] CrawlerService: Async crawl processing
- [ ] React Components: NetworkMonitorPanel, WorkflowDesignerPanel, CrawlerPanel
- [ ] IPC Bridges: Connect to UI
- [ ] Plugin API: Add network, workflow, crawler methods
- [ ] Testing: All components tested
- [ ] Documentation: API docs + examples

---

## 🎯 Success Criteria

✅ Network Manager:
- Custom proxy support
- Localhost/LAN access
- Connection monitoring

✅ Tab Communication:
- Message passing between tabs
- Session/cookie sharing
- Auth token sharing

✅ Workflows:
- Step-by-step execution
- Multi-tab chaining
- Result passing between steps

✅ Crawler:
- Multi-page crawling
- Link following
- Data extraction
- Export (JSON, CSV)

✅ UI:
- Real-time monitoring
- Drag&drop workflow design
- Crawler progress tracking
- Export functionality

---

**All systems ready for implementation!** 🚀