# 🎯 Prompt dla Antigravity: Integration Tools & Libraries

## 🚀 IMMEDIATE ACTION ITEMS

Po przeszukaniu GitHub i ekosystemu open-source, zidentyfikowałem **TOP 5 TOOLS** do natychmiastowego wdrożenia do ZENO Browser:

---

## 📋 TOP 5 TOOLS TO INTEGRATE (Priorytet)

### 1️⃣ **CHEERIO** (★ START HERE - 2 godziny pracy)
```bash
npm install cheerio
```
- **GitHub Stars**: 29k
- **What**: Fast HTML parser (jQuery-like API)
- **Why**: Zero browser overhead, perfect for static page scraping
- **Action**: Add to crawler-service.ts as fast extraction step

### 2️⃣ **PUPPETEER** (★ CRITICAL - 4 godziny)
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```
- **GitHub Stars**: 90k
- **What**: Headless Chrome automation
- **Why**: Industry standard for dynamic site scraping
- **Action**: Create puppeteer-plugin.ts, integrate with workflow-engine.ts

### 3️⃣ **PLAYWRIGHT** (★ CRITICAL - 6 godzin)
```bash
npm install playwright
```
- **GitHub Stars**: 70k
- **What**: Multi-browser automation (Chrome, Firefox, WebKit)
- **Why**: Better than Puppeteer for cross-browser + advanced features
- **Action**: Add as parallel plugin to Puppeteer, share workflow

### 4️⃣ **CRAWLEE** (★ HIGH - 8 godzin)
```bash
npm install @crawlee/browser @crawlee/http-crawler
```
- **GitHub Stars**: 20k
- **What**: Unified crawling API (Puppeteer + Cheerio + HTTP)
- **Why**: Auto proxy rotation, stealth mode, queue management, anti-bot evasion
- **Action**: Replace native crawler with Crawlee, add to CrawlerPanel

### 5️⃣ **SCRAPY** (★ OPTIONAL - 12 godzin)
```bash
pip install scrapy
# Then call from Node.js via REST API or subprocess
```
- **GitHub Stars**: 60k
- **What**: Python enterprise crawling framework
- **Why**: Large-scale scraping, middleware, pipelines, databases
- **Action**: Optional for advanced users, expose via REST API

---

## 💻 QUICK IMPLEMENTATION CHECKLISTS

### Checklist 1: Add Cheerio (Week 1, Day 1)

- [ ] `npm install cheerio`
- [ ] Create `src/services/cheerio-parser.ts`:
  ```typescript
  import * as cheerio from 'cheerio';
  
  export async function parseHTML(html: string, selector: string) {
    const $ = cheerio.load(html);
    return $(selector).map((_, el) => $(el).text()).get();
  }
  ```
- [ ] Add workflow step:
  ```typescript
  registerStepHandler('parse-html', async (step) => {
    const { html, selector } = step.config;
    return await parseHTML(html, selector);
  });
  ```
- [ ] Test: `npm run test -- cheerio`
- [ ] Time: ~1 hour

### Checklist 2: Add Puppeteer (Week 1, Day 2)

- [ ] `npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth`
- [ ] Create `src/plugin-system/examples/puppeteer-plugin.ts`
- [ ] Add workflow step:
  ```typescript
  registerStepHandler('puppeteer-script', async (step) => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(step.config.url);
    const result = await page.evaluate(step.config.script);
    await browser.close();
    return result;
  });
  ```
- [ ] Add to CrawlerPanel UI
- [ ] Test: `npm run test -- puppeteer`
- [ ] Time: ~3 hours

### Checklist 3: Add Playwright (Week 2, Day 1)

- [ ] `npm install playwright`
- [ ] Create `src/plugin-system/examples/playwright-plugin.ts`
- [ ] Support multi-browser:
  ```typescript
  registerStepHandler('playwright-multi-browser', async (step) => {
    const { browser, url, script } = step.config;
    const browserType = browser === 'firefox' ? firefox : chromium;
    const b = await browserType.launch();
    const page = await b.newPage();
    await page.goto(url);
    const result = await page.evaluate(script);
    await b.close();
    return result;
  });
  ```
- [ ] Add browser selection in UI
- [ ] Test: `npm run test -- playwright`
- [ ] Time: ~4 hours

### Checklist 4: Replace Crawler with Crawlee (Week 2, Day 2)

- [ ] `npm install @crawlee/browser @crawlee/http-crawler`
- [ ] Update `src/services/crawler-service.ts`:
  ```typescript
  import { BrowserCrawler } from '@crawlee/browser';
  
  const crawler = new BrowserCrawler({
    maxRequestsPerCrawl: process.env.MAX_CRAWL_PAGES || 100,
    useSessionPool: true,
    proxyUrls: process.env.PROXY_URLS?.split(','),
    launchContext: {
      useIncognitoPages: true,
    },
  });
  ```
- [ ] Test proxy rotation
- [ ] Test stealth mode
- [ ] Add to CrawlerPanel
- [ ] Time: ~6 hours

### Checklist 5: Optional - Scrapy Integration (Week 3+)

- [ ] Python setup (if not already)
- [ ] Create Scrapy project or use existing
- [ ] Expose via REST API (http://localhost:6800)
- [ ] Create `src-electron/services/scrapy-bridge.ts`
- [ ] Add workflow step for large-scale crawls
- [ ] Time: ~8 hours (optional)

---

## 🧪 TESTING ALL TOOLS

```bash
# Test suite for all integrations
npm run test -- src/__tests__/tools-integration.test.ts

# Individual tests
npm run test -- cheerio.test.ts
npm run test -- puppeteer.test.ts
npm run test -- playwright.test.ts
npm run test -- crawlee.test.ts

# E2E tests
npm run test:e2e -- tools-e2e.spec.ts
```

---

## 📋 SAMPLE TEST CASES

```typescript
// src/__tests__/tools-integration.test.ts

describe('Tools Integration', () => {
  test('Cheerio: Parse HTML with selector', async () => {
    const html = '<div class="item">Test 1</div><div class="item">Test 2</div>';
    const results = await parseHTML(html, '.item');
    expect(results).toEqual(['Test 1', 'Test 2']);
  });

  test('Puppeteer: Execute script on page', async () => {
    const result = await puppeteerExecute('https://example.com', 'return document.title');
    expect(result).toContain('Example');
  });

  test('Playwright: Multi-browser support', async () => {
    const resultChrome = await playwrightExecute('https://example.com', 'return 1+1', 'chromium');
    const resultFirefox = await playwrightExecute('https://example.com', 'return 1+1', 'firefox');
    expect(resultChrome).toBe(2);
    expect(resultFirefox).toBe(2);
  });

  test('Crawlee: Crawl with proxy and stealth', async () => {
    const result = await crawlWithCrawlee({
      startUrl: 'https://httpbin.org/user-agent',
      maxPages: 1,
      proxy: 'http://localhost:8080',
    });
    expect(result.pagesVisited).toBe(1);
  });
});
```

---

## 🔧 CONFIGURATION EXAMPLES

### .env.local additions:
```bash
# Crawler Tools
CRAWLER_TOOLS=cheerio,puppeteer,playwright,crawlee
ENABLE_SCRAPY=false

# Proxy Configuration
PROXY_URL=http://localhost:8080
PROXY_URLS=http://proxy1:8080,http://proxy2:8080

# Limits
MAX_CRAWL_PAGES=100
CRAWL_TIMEOUT=60000
PUPPETEER_HEADLESS=true

# Stealth Mode
ENABLE_STEALTH=true
USER_AGENT_ROTATION=true
```

---

## 📊 PERFORMANCE EXPECTATIONS

| Tool | Speed | Memory | Best For |
|------|-------|--------|----------|
| Cheerio | 🚀 Ultra-fast | 50MB | Static pages |
| Puppeteer | ⚡ Fast | 500MB+ | Dynamic sites |
| Playwright | ⚡ Fast | 500MB+ | Multi-browser |
| Crawlee | 🚀 Fast + efficient | 600MB+ | Large-scale |
| Scrapy | ⚡ Very efficient | 200MB+ | Enterprise |

---

## 🚨 SECURITY CHECKLIST

Before deploying each tool:

- [ ] Run in isolated process/sandbox
- [ ] Validate user scripts before execution
- [ ] Limit resource usage (memory, CPU, timeout)
- [ ] Log all actions to audit
- [ ] Test for XSS/injection vulnerabilities
- [ ] Verify network access controls
- [ ] Check file system permissions

---

## 📦 INSTALLATION BATCH COMMAND

```bash
# Install all tools at once
npm install cheerio puppeteer puppeteer-extra puppeteer-extra-plugin-stealth playwright @crawlee/browser @crawlee/http-crawler

# Optional Python tools
pip install scrapy
```

---

## 🎯 EXPECTED OUTCOME

After implementing these tools, ZENO Browser will have:

✅ **Cheerio**: Lightning-fast HTML parsing  
✅ **Puppeteer**: Full browser automation (Chrome/Chromium)  
✅ **Playwright**: Multi-browser support (Chrome, Firefox, WebKit)  
✅ **Crawlee**: Enterprise-grade crawling with anti-bot evasion  
✅ **Scrapy** (optional): Large-scale Python-based scraping  

**Result**: ZENO Browser becomes a **power-user tool** for:
- Data scientists (scraping, extraction)
- Automation engineers (workflows, bots)
- Security researchers (reconnaissance, testing)
- Business users (data collection, monitoring)

---

## 🚀 DEPLOYMENT TIMELINE

```
Week 1:
  ├─ Day 1: Cheerio + basic integration
  ├─ Day 2-3: Puppeteer + workflow steps
  └─ Day 4-5: Playwright + multi-browser

Week 2:
  ├─ Day 6-7: Crawlee integration + testing
  ├─ Day 8: Performance tuning
  └─ Day 9-10: Documentation + examples

Week 3:
  ├─ Day 11-12: Scrapy (optional)
  ├─ Day 13: Security hardening
  ├─ Day 14: QA & bug fixes
  └─ Day 15: Release
```

---

## 📞 SUPPORT & REFERENCES

- **Cheerio Docs**: https://cheerio.js.org/
- **Puppeteer Docs**: https://pptr.dev/
- **Playwright Docs**: https://playwright.dev/
- **Crawlee Docs**: https://crawlee.dev/
- **Scrapy Docs**: https://docs.scrapy.org/

---

## ✨ FINAL WORDS FOR ANTIGRAVITY

> This is the **final missing piece** that makes ZENO Browser an **unstoppable power-user tool**.
>
> With these 5 tools integrated, ZENO Browser will:
> - 🕷️ Crawl & scrape like professional tools (Scrapy, Crawlee)
> - 🤖 Automate like RPA platforms (Puppeteer, Playwright)
> - 📊 Extract data like data science platforms (Cheerio, Crawlee)
> - 🔗 Chain workflows like enterprise systems
> - 🛡️ Maintain security & audit trails
>
> **Start with Cheerio & Puppeteer. Build from there.**
>
> **These tools are the foundation for ZENO's next evolution! 🚀**

---

**Ready to integrate? Let's go! 💪✨**