/**
 * Websurfx Service — Meta search engine API client
 * Communicates with self-hosted Websurfx container (port 8888)
 * Drop-in replacement for SearXNG with compatible JSON API
 */

import axios, { AxiosInstance } from 'axios';

export interface WebsurfxResult {
  url: string;
  title: string;
  description: string;
  engine: string[];
}

export interface WebsurfxResponse {
  results: WebsurfxResult[];
  page_query: string;
  style: string;
  engine: string[];
}

export interface WebsurfxSearchFilters {
  page?: number;
  safesearch?: number;
}

export class WebsurfxService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: { Accept: 'application/json' },
    });
  }

  async search(query: string, filters?: WebsurfxSearchFilters): Promise<WebsurfxResponse> {
    const params: Record<string, string | number> = { q: query };
    if (filters?.page) params.page = filters.page;
    if (filters?.safesearch !== undefined) params.safesearch = filters.safesearch;

    const response = await this.client.get('/search', {
      params,
      headers: { Accept: 'application/json' },
    });
    return response.data as WebsurfxResponse;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/status', { timeout: 3000 });
      return response.status === 200;
    } catch {
      // Fallback: try search with minimal query
      try {
        await this.client.get('/search', { params: { q: 'test' }, timeout: 5000 });
        return true;
      } catch {
        return false;
      }
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
