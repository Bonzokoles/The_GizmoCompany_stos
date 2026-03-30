/**
 * UmamiService — Web bridge between ZENO Browser and Umami Analytics REST API
 * Handles authentication, website management, and data retrieval
 */

import { ipcMain } from 'electron';

interface UmamiConfig {
  baseUrl: string;
  username: string;
  password: string;
}

interface UmamiToken {
  token: string;
  expiresAt: number;
}

export class UmamiService {
  private config: UmamiConfig;
  private auth: UmamiToken | null = null;

  constructor(config?: Partial<UmamiConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.UMAMI_URL || 'http://localhost:5183',
      username: config?.username || process.env.UMAMI_USER || 'Jimbo77',
      password: config?.password || process.env.UMAMI_PASS || 'Haos1977',
    };
  }

  /** Register all IPC handlers */
  registerIPC(): void {
    ipcMain.handle('umami:status', () => this.getStatus());
    ipcMain.handle('umami:login', () => this.login());
    ipcMain.handle('umami:get-websites', () => this.getWebsites());
    ipcMain.handle('umami:get-stats', (_e, websiteId: string, params?: Record<string, string>) =>
      this.getStats(websiteId, params));
    ipcMain.handle('umami:get-pageviews', (_e, websiteId: string, params?: Record<string, string>) =>
      this.getPageviews(websiteId, params));
    ipcMain.handle('umami:get-metrics', (_e, websiteId: string, params?: Record<string, string>) =>
      this.getMetrics(websiteId, params));
    ipcMain.handle('umami:get-realtime', (_e, websiteId: string) =>
      this.getRealtime(websiteId));
    ipcMain.handle('umami:get-config', () => ({
      baseUrl: this.config.baseUrl,
      connected: !!this.auth,
    }));
    ipcMain.handle('umami:set-config', (_e, cfg: Partial<UmamiConfig>) => {
      if (cfg.baseUrl) this.config.baseUrl = cfg.baseUrl;
      if (cfg.username) this.config.username = cfg.username;
      if (cfg.password) this.config.password = cfg.password;
      this.auth = null;
      return { ok: true };
    });
    ipcMain.handle('umami:create-website', (_e, name: string, domain: string) =>
      this.createWebsite(name, domain));
  }

  /** Check if Umami instance is reachable */
  private async getStatus(): Promise<{ online: boolean; version?: string }> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/heartbeat`);
      if (res.ok) {
        return { online: true };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  }

  /** Get valid auth token, auto-refresh if expired */
  private async getToken(): Promise<string> {
    if (this.auth && this.auth.expiresAt > Date.now()) {
      return this.auth.token;
    }
    await this.login();
    if (!this.auth) throw new Error('Umami authentication failed');
    return this.auth.token;
  }

  /** Authenticate with Umami API */
  private async login(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${text}` };
      }

      const data = await res.json();
      this.auth = {
        token: data.token,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000, // ~23h
      };
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  }

  /** Generic authenticated GET */
  private async apiGet(path: string, params?: Record<string, string>): Promise<unknown> {
    const token = await this.getToken();
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Umami API error: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }

  /** List all tracked websites */
  private async getWebsites(): Promise<unknown> {
    return this.apiGet('/api/websites');
  }

  /** Create a new tracked website */
  private async createWebsite(name: string, domain: string): Promise<unknown> {
    const token = await this.getToken();
    const res = await fetch(`${this.config.baseUrl}/api/websites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, domain }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `HTTP ${res.status}: ${text}` };
    }
    return res.json();
  }

  /** Get aggregated stats for a website */
  private async getStats(websiteId: string, params?: Record<string, string>): Promise<unknown> {
    const defaults = this.defaultDateRange();
    return this.apiGet(`/api/websites/${encodeURIComponent(websiteId)}/stats`, { ...defaults, ...params });
  }

  /** Get pageviews over time */
  private async getPageviews(websiteId: string, params?: Record<string, string>): Promise<unknown> {
    const defaults = { ...this.defaultDateRange(), unit: 'day' };
    return this.apiGet(`/api/websites/${encodeURIComponent(websiteId)}/pageviews`, { ...defaults, ...params });
  }

  /** Get metrics (top pages, referrers, browsers, etc.) */
  private async getMetrics(websiteId: string, params?: Record<string, string>): Promise<unknown> {
    const defaults = { ...this.defaultDateRange(), type: 'url' };
    return this.apiGet(`/api/websites/${encodeURIComponent(websiteId)}/metrics`, { ...defaults, ...params });
  }

  /** Get real-time data */
  private async getRealtime(websiteId: string): Promise<unknown> {
    return this.apiGet(`/api/websites/${encodeURIComponent(websiteId)}/active`);
  }

  /** Default date range: last 30 days */
  private defaultDateRange(): { startAt: string; endAt: string } {
    const now = Date.now();
    return {
      startAt: String(now - 30 * 24 * 60 * 60 * 1000),
      endAt: String(now),
    };
  }
}
