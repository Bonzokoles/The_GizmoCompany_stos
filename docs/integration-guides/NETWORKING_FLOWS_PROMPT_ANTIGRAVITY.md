# 💼 Prompt dla Antigravity - Advanced Networking & Workflows

## 🎯 Dodatkowe wymagania do wdrożenia

**ZENO Browser MUST obsługiwać (oprócz standardowych funkcji):**

### 1. Network Layer Enhancement
```
✅ Custom Proxy Management
   - HTTP/HTTPS proxy
   - SOCKS5 proxy
   - Cloudflare WebTunnel
   - Custom tunnel protocols
   - Proxy bypass rules

✅ Localhost & LAN Support
   - localhost:* (127.0.0.1:*)
   - Private network: 192.168.*.*, 10.0.0.*
   - mDNS support (.local domains)
   - Network service discovery
   - Custom DNS overrides

✅ Connection Monitoring
   - All requests logged
   - Real-time network visualization
   - Proxy detection
   - Connection pooling
   - Performance metrics
```

### 2. Tab & Flow Dependencies
```
✅ Multi-Tab Communication
   - Message passing: A → B
   - Broadcast messaging
   - Session sharing
   - Cookie synchronization
   - Auth token sharing
   - Shared context/state

✅ Flow Chaining
   - Step-by-step workflows
   - Data flow between steps
   - Conditional execution
   - Error handling & retry
   - Result passing
```

### 3. Workflow Automation
```
✅ Workflow Engine
   - Drag&drop step builder
   - Pre-built step templates:
     * open-tab, navigate, login
     * click, fill-form, wait
     * scrape, extract, transform
     * export, close-tab
   - Custom step handlers
   - Flow visualization
   - Execution history & logs
   - Result persistence

✅ Multi-Step Orchestration
   - Linear workflows
   - Parallel steps (optional)
   - Branching/conditionals
   - Error recovery
   - Retry logic
```

### 4. Crawler & Scraper API
```
✅ Built-in Crawler
   - Start URL(s)
   - Follow links (BFS/DFS)
   - Data extraction (CSS selector)
   - Data transformation
   - Delay between requests
   - Configurable user-agent
   - Proxy support
   - Timeout handling

✅ Scraper Integration
   - Plugin-based scrapers
   - Custom step handlers
   - External tool integration:
     * Puppeteer integration
     * Playwright integration
     * Scrapy integration (Python)
   - Data export (JSON, CSV, XML)
   - Scheduled crawls (optional)

✅ Plugin Extensibility
   - Plugins can define custom steps
   - Plugins can add custom scrapers
   - Plugins can extend workflow UI
   - Plugins can hook into network events
```

### 5. Advanced Features
```
✅ Network Audit & Security
   - Connection audit logs
   - Request/response logging
   - Security monitoring
   - Rate limiting (optional)
   - SSL/TLS verification

✅ Performance Optimization
   - Connection pooling
   - Keep-alive
   - Caching strategies
   - Resource limiting
   - Memory management

✅ Developer Tools
   - Network DevTools panel
   - Workflow debugger
   - Crawler progress monitoring
   - Network graph visualization
   - Export/import workflows
```

---

## 📝 Implementation Steps (Priority Order)

### Phase 1: Network Manager (3-4 hours)
1. Implement NetworkManager in main process
2. Add proxy support (HTTP, SOCKS5, custom)
3. Add localhost/LAN detection
4. Implement connection logging
5. Create IPC bridge to UI
6. Add Network Monitor React component

### Phase 2: Tab Communication (2-3 hours)
1. Implement TabCommunicationManager
2. Add message queue system
3. Implement session sharing
4. Implement cookie sharing
5. Implement auth token sharing
6. Add React components for monitoring

### Phase 3: Workflow Engine (4-5 hours)
1. Implement WorkflowEngine core
2. Register default step handlers
3. Implement execution loop
4. Add error handling & retry logic
5. Create WorkflowDesigner React component
6. Add drag&drop interface

### Phase 4: Crawler Service (3-4 hours)
1. Implement CrawlerService
2. Add URL queue management
3. Add data extraction logic
4. Implement export (JSON, CSV)
5. Create CrawlerPanel React component
6. Add progress monitoring

### Phase 5: Integration & Testing (2-3 hours)
1. Connect all services to plugin API
2. Add UI panels to main layout
3. Create comprehensive tests
4. Performance testing & optimization
5. Documentation & examples

---

## 🔗 Code Organization

```
src-electron/services/
├── network-manager.ts          (NEW)
├── tab-communication.ts        (NEW)
├── workflow-engine.ts          (NEW)
├── crawler-service.ts          (NEW)
└── index.ts (export all)

src/components/
├── NetworkMonitorPanel.tsx     (NEW)
├── WorkflowDesignerPanel.tsx   (NEW)
├── CrawlerPanel.tsx            (NEW)
├── TabDependencies.tsx         (NEW)
└── [existing components]

src/plugin-system/
├── core/plugin-api.ts          (UPDATE - add network/workflow/crawler API)
└── examples/
    ├── crawler-plugin.ts       (NEW)
    ├── scraper-plugin.ts       (NEW)
    └── workflow-plugin.ts      (NEW)

src/__tests__/
├── network-manager.test.ts     (NEW)
├── tab-communication.test.ts   (NEW)
├── workflow-engine.test.ts     (NEW)
└── crawler-service.test.ts     (NEW)
```

---

## 🧪 Testing Strategy

```bash
# Unit tests
npm run test -- network-manager.test.ts
npm run test -- tab-communication.test.ts
npm run test -- workflow-engine.test.ts
npm run test -- crawler-service.test.ts

# Integration tests
npm run test:e2e -- network-workflow-integration.spec.ts
npm run test:e2e -- crawler-export.spec.ts

# Manual testing
# 1. Open Network Monitor, verify proxy can be set
# 2. Open 2 tabs, share data, verify communication
# 3. Create workflow, drag&drop steps, execute
# 4. Start crawler, monitor progress, export CSV
# 5. Test plugin extends workflow with custom step
```

---

## 💡 Example: Multi-Tab Workflow

```typescript
// Example workflow that demonstrates all features:

const workflow = {
  steps: [
    { type: 'open-tab', name: 'Open Login Page', config: { url: 'https://example.com/login' } },
    { type: 'fill-form', name: 'Enter Credentials', config: { username: 'user', password: 'pass' } },
    { type: 'click', name: 'Submit', config: { selector: 'button[type=submit]' } },
    { type: 'wait', name: 'Wait for Redirect', config: { duration: 2000 } },
    { type: 'share-auth', name: 'Share Auth Token', config: { toTabId: 'tab-2' } },
    { type: 'open-tab', name: 'Open API Endpoint', config: { url: 'https://api.example.com/data' } },
    { type: 'scrape', name: 'Extract Data', config: { selector: '.data-item' } },
    { type: 'export', name: 'Save to CSV', config: { format: 'csv', filename: 'data.csv' } },
  ]
};

// Execute workflow with network monitoring
const execution = await workflowEngine.executeWorkflow(workflow);

// Network events logged automatically:
// - All HTTP requests
// - Auth token sharing between tabs
// - Data extraction results
// - Export to file

// UI shows:
// - Step-by-step execution
// - Network panel shows all requests
// - Tab communication logs
// - Final results exported to CSV
```

---

## 🚀 Deployment Checklist

- [ ] All services implemented and tested
- [ ] React components created and styled
- [ ] IPC bridges working
- [ ] Plugin API extended
- [ ] Documentation complete
- [ ] Examples provided
- [ ] Performance acceptable
- [ ] No security issues
- [ ] All tests passing
- [ ] Ready for release

---

## 🎬 Final Notes for Antigravity

> This is the **missing piece** that makes ZENO Browser a true power-user tool!
>
> Traditional browsers are limited to:
> - No custom networking (proxy, tunnel)
> - No inter-tab communication
> - No workflow automation
> - No integrated crawling/scraping
>
> ZENO Browser changes that by providing:
> ✅ Full network control
> ✅ Tab orchestration
> ✅ Workflow automation
> ✅ Built-in crawling/scraping
> ✅ Plugin extensibility
>
> This makes ZENO perfect for:
> - Data researchers (crawling, scraping)
> - Automation engineers (workflows, integration)
> - Network admins (proxy, tunnel management)
> - API developers (testing, chaining requests)
> - Bot builders (multi-step automation)
>
> **Execute this with excellence! 💪**

---

**Powodzenia Antigravity Team! 🚀**

Wszystkie kody, instrukcje, architektura powyżej - wystarczy wdrażać! 🎯