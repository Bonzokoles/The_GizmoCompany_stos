/**
 * Crawler Service — configurable web crawler running in the Electron main process.
 *
 * Uses Electron's `net` module for HTTP requests.
 * Supports configurable depth, delay, UA, data extraction, and export.
 */

import { net } from 'electron';
import { EventEmitter } from 'events';

/* ─── Types ─── */

export interface CrawlConfig {
  startUrls: string[];
  maxPages?: number;
  followLinks?: boolean;
  linkSelector?: string;
  dataSelector?: string;
  userAgent?: string;
  /** ms between requests (rate limiting) */
  delay?: number;
  /** per-page timeout in ms */
  timeout?: number;
}

export interface CrawlResult {
  id: string;
  config: CrawlConfig;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  pagesVisited: number;
  itemsExtracted: number;
  data: Array<{ url: string; content: string; timestamp: string }>;
  errors: Array<{ url: string; error: string }>;
  startTime: string;
  endTime?: string;
}

/* ─── Class ─── */

export class CrawlerService extends EventEmitter {
  private crawls: Map<string, CrawlResult> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  /* ─── Start / Stop ─── */

  startCrawl(config: CrawlConfig): string {
    const crawlId = `crawl-${Date.now()}`;
    const result: CrawlResult = {
      id: crawlId,
      config,
      status: 'running',
      pagesVisited: 0,
      itemsExtracted: 0,
      data: [],
      errors: [],
      startTime: new Date().toISOString(),
    };
    this.crawls.set(crawlId, result);

    const ac = new AbortController();
    this.abortControllers.set(crawlId, ac);

    this.emit('crawl-started', { crawlId });
    this.processCrawl(crawlId, config, ac.signal);
    return crawlId;
  }

  cancelCrawl(crawlId: string): boolean {
    const ac = this.abortControllers.get(crawlId);
    if (!ac) return false;
    ac.abort();
    const r = this.crawls.get(crawlId);
    if (r) {
      r.status = 'cancelled';
      r.endTime = new Date().toISOString();
    }
    return true;
  }

  getCrawl(crawlId: string): CrawlResult | undefined {
    return this.crawls.get(crawlId);
  }

  listCrawls(): CrawlResult[] {
    return Array.from(this.crawls.values());
  }

  /* ─── Export ─── */

  exportCrawlData(crawlId: string, format: 'json' | 'csv' = 'json'): string {
    const crawl = this.crawls.get(crawlId);
    if (!crawl) throw new Error('Crawl not found');

    if (format === 'json') {
      return JSON.stringify(crawl.data, null, 2);
    }

    // CSV
    if (crawl.data.length === 0) return '';
    const header = 'url,content,timestamp';
    const rows = crawl.data.map(
      (d) => `${csvEscape(d.url)},${csvEscape(d.content)},${csvEscape(d.timestamp)}`,
    );
    return [header, ...rows].join('\n');
  }

  /* ─── Internal ─── */

  private async processCrawl(crawlId: string, config: CrawlConfig, signal: AbortSignal): Promise<void> {
    const result = this.crawls.get(crawlId)!;
    const visited = new Set<string>();
    const queue = [...config.startUrls];
    const maxPages = config.maxPages ?? 100;
    const delay = config.delay ?? 500;

    while (queue.length > 0 && result.pagesVisited < maxPages) {
      if (signal.aborted) break;

      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        if (delay > 0 && result.pagesVisited > 0) {
          await sleep(delay);
        }

        const html = await this.fetchPage(url, config, signal);
        result.pagesVisited++;

        // Very simple HTML parsing via regex (no DOM in main process)
        if (config.dataSelector) {
          // Extract text inside matching tags (simplified)
          const text = stripHtml(html).slice(0, 5000);
          result.data.push({ url, content: text, timestamp: new Date().toISOString() });
          result.itemsExtracted++;
        }

        if (config.followLinks) {
          const links = extractLinks(html, url);
          for (const link of links) {
            if (!visited.has(link) && queue.length < maxPages * 2) {
              queue.push(link);
            }
          }
        }

        this.emit('page-crawled', { crawlId, url, pagesVisited: result.pagesVisited });
      } catch (err: unknown) {
        if (signal.aborted) break;
        result.errors.push({ url, error: err instanceof Error ? err.message : String(err) });
        this.emit('crawl-error', { crawlId, url, error: String(err) });
      }
    }

    if (!signal.aborted) {
      result.status = 'completed';
    }
    result.endTime = new Date().toISOString();
    this.abortControllers.delete(crawlId);
    this.emit('crawl-completed', { crawlId });
  }

  private fetchPage(url: string, config: CrawlConfig, signal: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Error('cancelled'));

      const request = net.request({ url, method: 'GET' });

      if (config.userAgent) {
        request.setHeader('User-Agent', config.userAgent);
      } else {
        request.setHeader('User-Agent', 'ZENO-Crawler/1.0');
      }

      const timeout = config.timeout ?? 15_000;
      const timer = setTimeout(() => {
        request.abort();
        reject(new Error(`Timeout after ${timeout}ms`));
      }, timeout);

      const onAbort = () => { request.abort(); reject(new Error('cancelled')); };
      signal.addEventListener('abort', onAbort, { once: true });

      let body = '';
      request.on('response', (response) => {
        response.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        response.on('end', () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', onAbort);
          resolve(body);
        });
      });
      request.on('error', (err) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(err);
      });
      request.end();
    });
  }
}

/* ─── Helpers ─── */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      if (resolved.startsWith('http')) links.push(resolved);
    } catch { /* invalid URL, skip */ }
  }
  return [...new Set(links)];
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
