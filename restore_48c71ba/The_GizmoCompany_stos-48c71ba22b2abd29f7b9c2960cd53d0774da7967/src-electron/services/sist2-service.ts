/**
 * sist2 Service — Archive/Document Indexer API client
 * Communicates with self-hosted sist2 container
 * Admin API on port 4090, Web UI on port 8085
 * Uses SQLite backend (no Elasticsearch required)
 */

import axios, { AxiosInstance } from 'axios';

export interface Sist2SearchHit {
  _id: string;
  _source: {
    name: string;
    path: string;
    extension: string;
    size: number;
    mtime: number;
    content?: string;
    mime?: string;
    thumbnail?: string;
    tag?: string[];
    parent?: string;
  };
  _score?: number;
  highlight?: Record<string, string[]>;
}

export interface Sist2SearchResponse {
  hits: Sist2SearchHit[];
  total: number;
  took: number;
}

export interface Sist2IndexInfo {
  id: string;
  name: string;
  root: string;
  version: string;
  timestamp: number;
  numDocs: number;
}

export interface Sist2JobStatus {
  id: string;
  type: 'scan' | 'index';
  status: 'running' | 'done' | 'error';
  progress?: number;
}

export class Sist2Service {
  private adminClient: AxiosInstance;
  private webClient: AxiosInstance;

  constructor(
    adminUrl = 'http://localhost:4090',
    webUrl = 'http://localhost:8085',
  ) {
    this.adminClient = axios.create({
      baseURL: adminUrl,
      timeout: 30000,
      headers: { Accept: 'application/json' },
    });
    this.webClient = axios.create({
      baseURL: webUrl,
      timeout: 15000,
      headers: { Accept: 'application/json' },
    });
  }

  /** Search indexed documents */
  async search(query: string, size = 20, from = 0): Promise<Sist2SearchResponse> {
    const response = await this.webClient.get('/api/search', {
      params: { q: query, size, from },
    });
    return response.data as Sist2SearchResponse;
  }

  /** Get list of indices */
  async getIndices(): Promise<Sist2IndexInfo[]> {
    const response = await this.adminClient.get('/api/index');
    return response.data as Sist2IndexInfo[];
  }

  /** Trigger a scan job on a directory */
  async scanDirectory(path: string): Promise<Sist2JobStatus> {
    const response = await this.adminClient.post('/api/job/scan', { path });
    return response.data as Sist2JobStatus;
  }

  /** Get running/completed jobs */
  async getJobs(): Promise<Sist2JobStatus[]> {
    const response = await this.adminClient.get('/api/job');
    return response.data as Sist2JobStatus[];
  }

  /** Get file thumbnail by document ID */
  getThumbnailUrl(docId: string): string {
    return `${this.webClient.defaults.baseURL}/api/tn/${docId}`;
  }

  /** Health check — try admin API */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.adminClient.get('/api/status', { timeout: 3000 });
      return response.status === 200;
    } catch {
      // Fallback: try web UI root
      try {
        const response = await this.webClient.get('/', { timeout: 3000 });
        return response.status === 200;
      } catch {
        return false;
      }
    }
  }
}
