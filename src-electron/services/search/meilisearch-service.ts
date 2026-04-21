/**
 * MeiliSearch Service — Local search engine for browser history & autocomplete
 * Communicates with self-hosted MeiliSearch container (port 7700)
 */

import axios, { AxiosInstance } from "axios";

// ── Index document types ───────────────────────────────────────

export interface HistoryDocument {
  id: string;
  url: string;
  title: string;
  visitedAt: string; // ISO timestamp
  visitCount: number;
  snippet?: string; // page text snippet for full-text search
}

export interface BookmarkDocument {
  id: string;
  url: string;
  title: string;
  tags?: string[];
  createdAt: string;
}

export interface MeiliSearchResult<T> {
  hits: T[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}

// ── Service ────────────────────────────────────────────────────

export class MeilisearchService {
  private client: AxiosInstance;
  private baseUrl: string;
  private masterKey: string;

  constructor(
    baseUrl = "http://localhost:7700",
    masterKey = "zeno-meili-master-2026",
  ) {
    this.baseUrl = baseUrl;
    this.masterKey = masterKey;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterKey}`,
      },
    });
  }

  // ── Health ──────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.client.get("/health", { timeout: 3000 });
      return res.data?.status === "available";
    } catch {
      return false;
    }
  }

  // ── Index management ────────────────────────────────────────

  async ensureIndexes(): Promise<void> {
    const healthy = await this.isHealthy();
    if (!healthy) {
      console.warn(
        "[MeilisearchService] Not available on :7700 — skipping index init",
      );
      return;
    }
    await this.createIndexIfNeeded("history", "id");
    await this.createIndexIfNeeded("bookmarks", "id");

    // Configure searchable/filterable attributes
    await this.client
      .put("/indexes/history/settings", {
        searchableAttributes: ["title", "url", "snippet"],
        sortableAttributes: ["visitedAt", "visitCount"],
        filterableAttributes: ["visitedAt"],
      })
      .catch(() => {
        /* index may not be ready yet */
      });

    await this.client
      .put("/indexes/bookmarks/settings", {
        searchableAttributes: ["title", "url", "tags"],
        sortableAttributes: ["createdAt"],
        filterableAttributes: ["tags"],
      })
      .catch(() => {
        /* index may not be ready yet */
      });
  }

  private async createIndexIfNeeded(
    uid: string,
    primaryKey: string,
  ): Promise<void> {
    try {
      await this.client.get(`/indexes/${uid}`);
    } catch {
      try {
        await this.client.post("/indexes", { uid, primaryKey });
      } catch (err) {
        console.warn(
          `[MeilisearchService] Could not create index '${uid}':`,
          err,
        );
      }
    }
  }

  // ── History operations ──────────────────────────────────────

  async addHistoryEntry(entry: HistoryDocument): Promise<void> {
    await this.client.post("/indexes/history/documents", [entry]);
  }

  async addHistoryBatch(entries: HistoryDocument[]): Promise<void> {
    if (!entries.length) return;
    await this.client.post("/indexes/history/documents", entries);
  }

  async searchHistory(
    query: string,
    limit = 10,
  ): Promise<MeiliSearchResult<HistoryDocument>> {
    const res = await this.client.post("/indexes/history/search", {
      q: query,
      limit,
      sort: ["visitedAt:desc"],
    });
    return res.data;
  }

  async getRecentHistory(limit = 20): Promise<HistoryDocument[]> {
    const res = await this.client.post("/indexes/history/search", {
      q: "",
      limit,
      sort: ["visitedAt:desc"],
    });
    return res.data.hits;
  }

  // ── Bookmark operations ─────────────────────────────────────

  async addBookmark(bookmark: BookmarkDocument): Promise<void> {
    await this.client.post("/indexes/bookmarks/documents", [bookmark]);
  }

  async searchBookmarks(
    query: string,
    limit = 10,
  ): Promise<MeiliSearchResult<BookmarkDocument>> {
    const res = await this.client.post("/indexes/bookmarks/search", {
      q: query,
      limit,
    });
    return res.data;
  }

  // ── Autocomplete (combined history + bookmarks) ─────────────

  async autocomplete(
    query: string,
    limit = 8,
  ): Promise<
    Array<{ url: string; title: string; source: "history" | "bookmarks" }>
  > {
    const [historyRes, bookmarkRes] = await Promise.all([
      this.searchHistory(query, limit).catch(() => ({
        hits: [] as HistoryDocument[],
      })),
      this.searchBookmarks(query, limit).catch(() => ({
        hits: [] as BookmarkDocument[],
      })),
    ]);

    const results: Array<{
      url: string;
      title: string;
      source: "history" | "bookmarks";
    }> = [];
    const seen = new Set<string>();

    for (const h of historyRes.hits) {
      if (!seen.has(h.url)) {
        seen.add(h.url);
        results.push({ url: h.url, title: h.title, source: "history" });
      }
    }
    for (const b of bookmarkRes.hits) {
      if (!seen.has(b.url)) {
        seen.add(b.url);
        results.push({ url: b.url, title: b.title, source: "bookmarks" });
      }
    }

    return results.slice(0, limit);
  }

  // ── Cleanup ─────────────────────────────────────────────────

  async clearHistory(): Promise<void> {
    await this.client.delete("/indexes/history/documents");
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    await this.client.delete(
      `/indexes/history/documents/${encodeURIComponent(id)}`,
    );
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
