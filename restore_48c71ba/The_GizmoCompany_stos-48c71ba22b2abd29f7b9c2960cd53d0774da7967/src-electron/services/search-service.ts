/**
 * Search Service — Unified search orchestrator
 * Combines SearXNG (web), AIGateway (deep analysis), CatalogService (local)
 * Provides merged results and comparison mode
 */

import { SearXNGService, SearXNGResult, SearchFilters } from './searxng-service';
import { CatalogService, CatalogSearchResult } from './catalog-service';
import { AIGatewayService, AIResponse } from './ai-gateway-service';

// ── Result Types ───────────────────────────────────────────────

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

export interface ComparisonResult {
  query: string;
  webResults: WebSearchResult[];
  localResults: LocalSearchResult[];
  comparison: string;  // AI-generated comparison analysis
  model: string;
}

export interface SearchConfig {
  searxngUrl: string;
  defaultLanguage: string;
  safesearch: 0 | 1 | 2;
  maxWebResults: number;
  maxLocalResults: number;
}

// ── Service ────────────────────────────────────────────────────

export class SearchService {
  private searxng: SearXNGService;
  private catalog: CatalogService;
  private aiGateway: AIGatewayService;
  private config: SearchConfig;

  constructor(
    searxng: SearXNGService,
    catalog: CatalogService,
    aiGateway: AIGatewayService,
  ) {
    this.searxng = searxng;
    this.catalog = catalog;
    this.aiGateway = aiGateway;
    this.config = {
      searxngUrl: 'http://localhost:8888',
      defaultLanguage: 'pl',
      safesearch: 1,
      maxWebResults: 20,
      maxLocalResults: 15,
    };
  }

  // ── Web Search (Layer 1: SearXNG) ───────────────────────────

  async webSearch(query: string, filters?: SearchFilters): Promise<WebSearchResult[]> {
    const mergedFilters: SearchFilters = {
      language: this.config.defaultLanguage,
      safesearch: this.config.safesearch,
      ...filters,
    };

    const response = await this.searxng.search(query, mergedFilters);

    return response.results.slice(0, this.config.maxWebResults).map(r => ({
      url: r.url,
      title: r.title,
      snippet: r.content,
      engine: r.engine,
      score: r.score,
      category: r.category,
      publishedDate: r.publishedDate,
    }));
  }

  // ── Deep Search (Layer 2: SearXNG + AI analysis) ────────────

  async deepSearch(query: string, filters?: SearchFilters): Promise<DeepSearchReport> {
    // Step 1: Get web results from SearXNG
    const webResults = await this.webSearch(query, filters);

    // Step 2: Build context from top results
    const contextBlock = webResults.slice(0, 10).map((r, i) =>
      `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
    ).join('\n\n');

    // Step 3: Send to AI for deep analysis
    const prompt = `Jesteś asystentem badawczym przeglądarki ZENO. Na podstawie poniższych wyników wyszukiwania przygotuj szczegółowy raport na temat zapytania użytkownika.

ZAPYTANIE: ${query}

WYNIKI WYSZUKIWANIA:
${contextBlock}

Odpowiedz w formacie JSON:
{
  "summary": "Zwięzłe podsumowanie tematu (2-4 zdania po polsku)",
  "keyFindings": ["Kluczowe ustalenie 1", "Kluczowe ustalenie 2", ...],
  "sources": [{"url": "...", "title": "...", "relevance": "krótki opis dlaczego źródło jest istotne"}]
}

Odpowiedz TYLKO poprawnym JSON, bez dodatkowego tekstu.`;

    const aiResponse: AIResponse = await this.aiGateway.execute({
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Step 4: Parse AI response
    let parsed: { summary: string; keyFindings: string[]; sources: Array<{ url: string; title: string; relevance: string }> };
    try {
      parsed = JSON.parse(aiResponse.content);
    } catch {
      parsed = {
        summary: aiResponse.content,
        keyFindings: [],
        sources: webResults.slice(0, 5).map(r => ({
          url: r.url,
          title: r.title,
          relevance: r.snippet.substring(0, 100),
        })),
      };
    }

    return {
      query,
      summary: parsed.summary,
      sources: parsed.sources,
      keyFindings: parsed.keyFindings,
      model: aiResponse.model,
      provider: aiResponse.provider,
      latency: aiResponse.latency,
      cost: aiResponse.cost,
    };
  }

  // ── Local Search (Layer 3: CatalogBrowser) ──────────────────

  localSearch(query: string, libraryId?: string): LocalSearchResult[] {
    return this.catalog.search(query, libraryId, this.config.maxLocalResults).map(r => ({
      filePath: r.filePath,
      fileName: r.fileName,
      snippet: r.snippet,
      rank: r.rank,
    }));
  }

  // ── Comparison Mode ─────────────────────────────────────────

  async compare(query: string, libraryId?: string): Promise<ComparisonResult> {
    // Run web + local search in parallel
    const [webResults, localResults] = await Promise.all([
      this.webSearch(query).catch(() => [] as WebSearchResult[]),
      Promise.resolve(this.localSearch(query, libraryId)),
    ]);

    // Build comparison prompt
    const webBlock = webResults.slice(0, 5).map((r, i) =>
      `[Web ${i + 1}] ${r.title}: ${r.snippet}`
    ).join('\n');

    const localBlock = localResults.slice(0, 5).map((r, i) =>
      `[Lokal ${i + 1}] ${r.fileName}: ${r.snippet}`
    ).join('\n');

    const prompt = `Porównaj wyniki wyszukiwania online z lokalnymi danymi użytkownika na temat: "${query}"

WYNIKI ONLINE:
${webBlock || '(brak wyników)'}

DANE LOKALNE:
${localBlock || '(brak wyników)'}

Przygotuj krótką analizę porównawczą (2-3 zdania po polsku): co lokalne dane mają wspólnego z wynikami online, czego brakuje, co jest unikalne w lokalnych danych.`;

    let comparison: string;
    let model = '';

    try {
      const aiResponse = await this.aiGateway.execute({
        prompt,
        temperature: 0.3,
        maxTokens: 500,
      });
      comparison = aiResponse.content;
      model = aiResponse.model;
    } catch {
      comparison = 'Porównanie niedostępne — brak połączenia z AI.';
    }

    return { query, webResults, localResults, comparison, model };
  }

  // ── Config ──────────────────────────────────────────────────

  getConfig(): SearchConfig {
    return { ...this.config };
  }

  setConfig(partial: Partial<SearchConfig>): void {
    Object.assign(this.config, partial);
    if (partial.searxngUrl) {
      this.searxng.setBaseUrl(partial.searxngUrl);
    }
  }

  async isReady(): Promise<boolean> {
    return this.searxng.isHealthy();
  }
}
