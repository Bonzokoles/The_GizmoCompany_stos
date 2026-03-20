# 🛠️ ZENO Browser - Recommended Tools & Libraries for Integration

## 📊 Executive Summary

Po przeszukaniu GitHub i ekosystemu open-source, zidentyfikowałem **TOP NARZĘDZIA**, które natychmiast poprawią możliwości ZENO Browser. Wszystkie są **aktywnie utrzymywane, mają duże społeczności i gwiazdy na GitHub**.

---

## 🏆 TOP PRIORITY TOOLS TO INTEGRATE (Q2 2026)

### 1. **Crawlee** ⭐ HIGHEST PRIORITY
- **GitHub**: [apify/crawlee](https://github.com/apify/crawlee)
- **Stars**: ~20,000
- **Language**: TypeScript/JavaScript
- **Why**: Unified API for browser-based AND HTTP crawling, queue management, proxy rotation, stealth evasion
- **Perfect for**: ZENO's crawler panel, workflow automation, anti-bot evasion

**Integration Plan:**
```typescript
// Replace native crawler with Crawlee
npm install @crawlee/browser @crawlee/http-crawler

// Use in workflow engine:
import { BrowserCrawler, HttpCrawler } from '@crawlee/browser';

export const crawleeCrawler = new BrowserCrawler({
  maxRequestsPerCrawl: 100,
  useSessionPool: true,
  launchContext: {
    useIncognitoPages: true,
    proxyUrl: process.env.PROXY_URL, // Support ZENO's proxy
  },
});

// Integrate with ZENO's WorkflowEngine as step:
registerStepHandler('crawl-advanced', async (step) => {
  const result = await crawleeCrawler.run(step.config.urls);
  return result;
});
```

**What it enables:**
- ✅ Automatic proxy rotation
- ✅ Stealth mode (avoid detection)
- ✅ Session management
- ✅ Rate limiting & delays
- ✅ Both browser & HTTP crawling

---

### 2. **Puppeteer** ⭐ CRITICAL
- **GitHub**: [puppeteer/puppeteer](https://github.com/puppeteer/puppeteer)
- **Stars**: ~90,000
- **Language**: JavaScript
- **Why**: Core browser automation, headless Chrome/Chromium + Firefox, industry standard
- **Perfect for**: Advanced scripting, dynamic site scraping, automation workflows

**Integration Plan:**
```typescript
// Already compatible with ZENO's Electron
import puppeteer from 'puppeteer';

// Create plugin for Puppeteer automation
export const puppeteerPlugin = {
  id: 'puppeteer-automation',
  name: 'Puppeteer Automation',
  capabilities: ['scripting', 'scraping', 'automation'],
  
  async execute(workflow: PuppeteerWorkflow) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.goto(workflow.url);
    
    // Execute custom script
    const result = await page.evaluate(workflow.script);
    await browser.close();
    
    return result;
  }
};

// Expose as workflow step:
registerStepHandler('puppeteer-script', async (step) => {
  return await puppeteerPlugin.execute(step.config);
});
```

**What it enables:**
- ✅ Full browser automation
- ✅ Screenshot & PDF generation
- ✅ Performance monitoring
- ✅ Cookie/session management
- ✅ Form filling & clicking

---

### 3. **Playwright** ⭐ CRITICAL
- **GitHub**: [microsoft/playwright](https://github.com/microsoft/playwright)
- **Stars**: ~70,000
- **Language**: JavaScript/TypeScript
- **Why**: Multi-browser (Chromium, Firefox, WebKit), superior to Puppeteer for cross-browser testing
- **Perfect for**: Complex workflows, testing, multi-browser coverage

**Integration Plan:**
```typescript
// Parallel integration with Puppeteer
import { chromium, firefox, webkit } from 'playwright';

export const playwrightPlugin = {
  id: 'playwright-automation',
  name: 'Playwright Multi-Browser',
  
  async execute(config: PlaywrightConfig) {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      proxy: {
        server: process.env.PROXY_URL || 'http://localhost:8080',
      },
    });
    
    const page = await context.newPage();
    await page.goto(config.url);
    
    // Execute with tracing for debugging
    await page.context().tracing.start({ screenshots: true, snapshots: true });
    const result = await page.evaluate(config.script);
    await page.context().tracing.stop({ path: 'trace.zip' });
    
    await browser.close();
    return result;
  }
};
```

**What it enables:**
- ✅ Multi-browser automation
- ✅ Tracing & debugging
- ✅ Advanced network interception
- ✅ Video recording
- ✅ Better error handling

---

### 4. **Cheerio** ⭐ HIGH PRIORITY
- **GitHub**: [cheeriojs/cheerio](https://github.com/cheeriojs/cheerio)
- **Stars**: ~29,000
- **Language**: JavaScript
- **Why**: Fast server-side HTML parsing, jQuery-like API, ZERO browser overhead
- **Perfect for**: Static page scraping, lightweight crawling, data extraction

**Integration Plan:**
```typescript
// Fast data extraction step
import * as cheerio from 'cheerio';

registerStepHandler('extract-html', async (step, ctx) => {
  const { html, selector, transform } = step.config;
  
  const $ = cheerio.load(html);
  const results = [];
  
  $(selector).each((i, elem) => {
    const data = transform ? transform($(elem)) : $(elem).text();
    results.push(data);
  });
  
  return results;
});

// Use in workflow:
// Step 1: Fetch HTML (via fetch/axios)
// Step 2: Parse with Cheerio
// Step 3: Transform & export
```

**What it enables:**
- ✅ Lightning-fast parsing
- ✅ CSS selector queries
- ✅ jQuery API compatibility
- ✅ Zero overhead extraction

---

### 5. **Scrapy** (Python Plugin) ⭐ ADVANCED
- **GitHub**: [scrapy/scrapy](https://github.com/scrapy/scrapy)
- **Stars**: ~60,000
- **Language**: Python
- **Why**: Enterprise-grade crawling, middleware, pipelines, scalability
- **Perfect for**: Large-scale scraping, data pipelines, advanced processing

**Integration Plan:**
```typescript
// Scrapy as external plugin via REST API or spawn
export const scrapyPlugin = {
  id: 'scrapy-crawler',
  name: 'Scrapy Enterprise Crawler',
  capabilities: ['large-scale-crawling', 'data-pipeline', 'advanced-middleware'],
  
  async execute(config: ScrapyConfig) {
    // Option 1: Call external Scrapy API
    const response = await fetch('http://localhost:6800/schedule.json', {
      method: 'POST',
      body: new URLSearchParams({
        project: config.project,
        spider: config.spider,
        setting: `ZENO_MODE=true`,
      }),
    });
    
    const { jobid } = await response.json();
    
    // Poll for results
    return await pollScrapyJob(jobid);
  }
};

// Or: Spawn Scrapy as subprocess for smaller crawls
import { spawn } from 'child_process';

async function runScrapyCrawl(spiderName: string) {
  return new Promise((resolve, reject) => {
    const scrapy = spawn('scrapy', ['crawl', spiderName, '-o', 'results.json']);
    scrapy.on('close', () => resolve(JSON.parse(fs.readFileSync('results.json'))));
  });
}
```

**What it enables:**
- ✅ Enterprise-scale crawling
- ✅ Custom middleware & pipelines
- ✅ Advanced data processing
- ✅ Distributed crawling
- ✅ Integration with databases

---

## 🔌 SECONDARY BUT VALUABLE TOOLS

### 6. **Selenium** (Optional)
- **Use case**: Legacy test automation, multi-browser support
- **Integration**: As plugin for compatibility with existing test suites
- **Why not priority**: Puppeteer/Playwright are superior

```typescript
// Optional Selenium plugin for legacy support
import { Builder, By } from 'selenium-webdriver';

export const seleniumPlugin = {
  async execute(config) {
    let driver = await new Builder().forBrowser('chrome').build();
    await driver.get(config.url);
    const result = await driver.executeScript(config.script);
    await driver.quit();
    return result;
  }
};
```

---

### 7. **DevTools Protocol (Electron Built-in)**
- **Use case**: Native network monitoring, performance profiling
- **Integration**: Extend SecurityMonitorPanel with CDP
- **Why**: Already available in Electron, no external dependency

```typescript
// Leverage Electron's DevTools Protocol
import { BrowserWindow } from 'electron';

export const cdpNetworkMonitoring = {
  async setupMonitoring(webContents: any) {
    const session = webContents.debugger;
    session.attach('1.3');
    
    // Monitor all network activity
    session.on('Network.requestWillBeSent', (params) => {
      console.log('🌐 Network Request:', params.request.url);
      emit('network-request', params);
    });
    
    session.on('Network.responseReceived', (params) => {
      console.log('✅ Network Response:', params.response.url, params.response.status);
      emit('network-response', params);
    });
  }
};
```

---

### 8. **WebExtensions API Support**
- **Why**: Allow porting Chrome/Firefox extensions to ZENO
- **Integration**: Wrapper around ZENO's plugin system
- **Benefit**: Access to millions of existing extensions

```typescript
// WebExtensions compatibility layer
export const webExtensionsCompat = {
  // Map webext APIs to ZENO plugin API
  chrome: {
    tabs: {
      query: (options) => electronAPI.browser.getTabs(options),
      create: (options) => electronAPI.browser.createTab(options),
      sendMessage: (tabId, message) => electronAPI.browser.sendMessage(tabId, message),
    },
    webRequest: {
      onBeforeRequest: {
        addListener: (callback) => networkManager.on('request', callback),
      },
      onCompleted: {
        addListener: (callback) => networkManager.on('response', callback),
      },
    },
    storage: {
      local: {
        get: (keys) => storageManager.get(keys),
        set: (items) => storageManager.set(items),
      },
    },
    runtime: {
      onMessage: {
        addListener: (callback) => ipcMain.on('chrome.runtime.onMessage', callback),
      },
    },
  },
};
```

---

## 📦 INTEGRATION ROADMAP

### Phase 1 (Week 1-2): Foundation
- [ ] Integrate Cheerio for fast parsing
- [ ] Add Puppeteer as first automation tool
- [ ] Setup plugin infrastructure

### Phase 2 (Week 3-4): Advanced
- [ ] Add Playwright for multi-browser support
- [ ] Integrate Crawlee for unified crawling API
- [ ] DevTools Protocol monitoring

### Phase 3 (Week 5-6): Enterprise
- [ ] Scrapy integration (optional, advanced users)
- [ ] WebExtensions compatibility layer
- [ ] Selenium plugin (legacy support)

### Phase 4 (Ongoing): Optimization
- [ ] Performance tuning
- [ ] Community feedback integration
- [ ] Plugin marketplace for scrapers/crawlers

---

## 🎯 Implementation Priority Matrix

| Tool | Priority | Effort | Impact | Timeline |
|------|----------|--------|--------|----------|
| Cheerio | HIGH | 2h | HIGH | Week 1 |
| Puppeteer | CRITICAL | 4h | CRITICAL | Week 1 |
| Playwright | CRITICAL | 6h | CRITICAL | Week 2 |
| Crawlee | HIGH | 8h | HIGH | Week 2 |
| DevTools Protocol | MEDIUM | 4h | MEDIUM | Week 2 |
| WebExtensions | MEDIUM | 10h | MEDIUM | Week 4 |
| Scrapy | LOW | 12h | HIGH | Week 6+ |
| Selenium | LOW | 6h | LOW | Optional |

---

## ✅ Quick Start Integration Guide

### 1. Add Cheerio
```bash
npm install cheerio
```

```typescript
// In workflow-engine.ts
registerStepHandler('parse-html', async (step) => {
  const { html, selector } = step.config;
  const $ = cheerio.load(html);
  return $(selector).map((_, el) => $(el).text()).get();
});
```

### 2. Add Puppeteer
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

```typescript
// In crawler-service.ts or new puppeteer-plugin.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export const puppeteerCrawler = {
  async execute(url: string, script: string) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(url);
    const result = await page.evaluate(script);
    await browser.close();
    return result;
  }
};
```

### 3. Add Playwright
```bash
npm install playwright
```

```typescript
// Parallel Puppeteer in crawler-service.ts
import { chromium } from 'playwright';

export const playwrightCrawler = {
  async execute(url: string, script: string, browser: 'chrome' | 'firefox' = 'chrome') {
    const browserInstance = await chromium.launch();
    const page = await browserInstance.newPage();
    await page.goto(url);
    const result = await page.evaluate(script);
    await browserInstance.close();
    return result;
  }
};
```

### 4. Add Crawlee
```bash
npm install @crawlee/browser
```

```typescript
// In crawler-service.ts
import { BrowserCrawler } from '@crawlee/browser';

export const crawleeCrawler = new BrowserCrawler({
  maxRequestsPerCrawl: 100,
  proxyUrls: [process.env.PROXY_URL],
  useSessionPool: true,
  launchContext: {
    useIncognitoPages: true,
  },
  async requestHandler({ page, enqueueLinks }) {
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    // Enqueue all links
    await enqueueLinks();
  },
});
```

---

## 🧪 Testing These Tools

```bash
# Test Cheerio
npm run test -- src/__tests__/cheerio-integration.test.ts

# Test Puppeteer
npm run test -- src/__tests__/puppeteer-integration.test.ts

# Test Playwright
npm run test -- src/__tests__/playwright-integration.test.ts

# Test Crawlee
npm run test -- src/__tests__/crawlee-integration.test.ts
```

---

## 🔐 Security Considerations

### Each tool with ZENO's Sandbox:

1. **Puppeteer/Playwright**
   - Run in separate process
   - Limit resource usage
   - Validate scripts before execution
   - Log all actions

2. **Cheerio**
   - No browser execution, inherently safe
   - Validate selectors
   - Sanitize output

3. **Crawlee**
   - Built-in rate limiting
   - Proxy rotation for anonymity
   - Stealth mode to avoid bans

4. **Scrapy**
   - External process isolation
   - Resource limiting (memory, CPU)
   - Network monitoring

---

## 📝 Plugin Template for Each Tool

```typescript
// Template: src/plugin-system/examples/scraper-template.ts

export const scraperPluginTemplate = {
  id: 'scraper-template',
  name: 'Scraper Plugin Template',
  version: '1.0.0',
  author: 'Your Name',
  
  capabilities: ['scraping', 'data-extraction'],
  
  permissions: [
    { name: 'network', level: 'read' },
    { name: 'storage', level: 'write' },
  ],
  
  async onLoad(context: PluginContext) {
    // Register custom steps
    context.api.registerCommand({
      id: 'scraper:extract',
      title: 'Extract Data',
      execute: async () => {
        // Your logic
      },
    });
  },
  
  async onEnable() {
    console.log('Scraper plugin enabled');
  },
  
  async onDisable() {
    console.log('Scraper plugin disabled');
  },
};
```

---

## 📊 Comparison: What Each Tool Does Best

| Task | Best Tool | Why |
|------|-----------|-----|
| Parse static HTML | **Cheerio** | Fast, zero overhead |
| Scrape JS-heavy sites | **Puppeteer/Playwright** | Full browser control |
| Multi-browser testing | **Playwright** | Chromium, Firefox, WebKit |
| Large-scale crawling | **Crawlee/Scrapy** | Queue, middleware, scaling |
| Anti-bot evasion | **Crawlee/Puppeteer+Stealth** | Built-in stealth mode |
| Cross-browser ext support | **WebExtensions API** | Access 1M+ extensions |

---

## 🚀 Next Steps for Antigravity Team

1. **Start with Cheerio** - Easiest, immediate benefit
2. **Add Puppeteer** - Foundation for automation
3. **Add Playwright** - Multi-browser coverage
4. **Integrate Crawlee** - Unified crawling API
5. **Optional: Scrapy** - Enterprise features

All tools are **production-ready**, actively maintained, and have large communities!

---

**Ready to supercharge ZENO Browser! 💪✨**