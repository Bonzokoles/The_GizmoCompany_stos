/**
 * SearXNG Service — Meta search engine API client
 * Communicates with self-hosted SearXNG container (port 8888)
 */

import axios, { AxiosInstance } from 'axios';

export interface SearXNGResult {
  url: string;
  title: string;
  content: string;
  engine: string;
  score?: number;
  category?: string;
  publishedDate?: string;
  thumbnail?: string;
}

export interface SearXNGResponse {
  query: string;
  results: SearXNGResult[];
  suggestions: string[];
  infoboxes: Array<{ infobox: string; content: string; urls?: Array<{ title: string; url: string }> }>;
  number_of_results: number;
}

export interface SearchFilters {
  categories?: string[];       // general, images, videos, news, science, files, it, social media
  engines?: string[];          // google, bing, duckduckgo, wikipedia, etc.
  language?: string;           // pl, en, de, etc.
  timeRange?: 'day' | 'week' | 'month' | 'year' | '';
  safesearch?: 0 | 1 | 2;     // 0=off, 1=moderate, 2=strict
  pageno?: number;
}

export class SearXNGService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });
  }

  async search(query: string, filters?: SearchFilters): Promise<SearXNGResponse> {
    const params: Record<string, string | number> = {
      q: query,
      format: 'json',
    };

    if (filters?.categories?.length) params.categories = filters.categories.join(',');
    if (filters?.engines?.length) params.engines = filters.engines.join(',');
    if (filters?.language) params.language = filters.language;
    if (filters?.timeRange) params.time_range = filters.timeRange;
    if (filters?.safesearch !== undefined) params.safesearch = filters.safesearch;
    if (filters?.pageno) params.pageno = filters.pageno;

    const response = await this.client.get('/search', { params });
    return response.data as SearXNGResponse;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/healthz', { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.client.defaults.baseURL = url;
  }
}
