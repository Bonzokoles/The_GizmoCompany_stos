/**
 * Network Manager — advanced networking: proxy, LAN, DNS, connection logging
 * Builds on top of the simple NetworkMonitor with Electron session-level controls.
 */

import { session } from 'electron';
import { EventEmitter } from 'events';

/* ─── Types ─── */

export interface NetworkConfig {
  proxyUrl?: string;
  proxyType?: 'http' | 'socks5';
  allowLocalhost?: boolean;
  allowLAN?: boolean;
  dnsOverrides?: Record<string, string>;
}

export interface ConnectionInfo {
  id: string;
  url: string;
  method: string;
  status: number;
  timestamp: Date;
}

/* ─── Class ─── */

export class NetworkManager extends EventEmitter {
  private config: NetworkConfig;
  private connections: ConnectionInfo[] = [];
  private currentProxy: string | null = null;
  private static readonly MAX_CONNECTIONS = 1000;

  constructor(config: NetworkConfig = {}) {
    super();
    this.config = {
      allowLocalhost: true,
      allowLAN: true,
      ...config,
    };
  }

  /**
   * Attach to the default session and start intercepting requests.
   * Call this AFTER the app 'ready' event fires.
   */
  attach(): void {
    const filter = { urls: ['<all_urls>'] };

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
      this.logConnection({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: details.url,
        method: details.method,
        status: 0,
        timestamp: new Date(),
      });
      this.emit('request', { url: details.url, method: details.method });
      callback({ cancel: false });
    });

    session.defaultSession.webRequest.onCompleted(filter, (details) => {
      this.emit('response', { url: details.url, status: details.statusCode });
    });

    session.defaultSession.webRequest.onErrorOccurred(filter, (details) => {
      this.emit('network-error', { url: details.url, error: details.error });
    });

    console.log('🌐 NetworkManager attached to session');
  }

  /* ─── Proxy ─── */

  async setProxy(proxyUrl: string, type: 'http' | 'socks5' = 'http'): Promise<void> {
    const proxyRules = `${type === 'socks5' ? 'socks5' : 'http'}=${proxyUrl}`;
    await session.defaultSession.setProxy({
      proxyRules,
      proxyBypassRules: 'localhost,127.0.0.1,.local',
    });
    this.currentProxy = proxyUrl;
    this.emit('proxy-changed', { proxy: proxyUrl, type });
  }

  async clearProxy(): Promise<void> {
    await session.defaultSession.setProxy({ proxyRules: 'direct://' });
    this.currentProxy = null;
    this.emit('proxy-changed', { proxy: null });
  }

  getProxy(): string | null {
    return this.currentProxy;
  }

  /* ─── Config toggles ─── */

  setAllowLocalhost(enabled: boolean): void {
    this.config.allowLocalhost = enabled;
  }

  setAllowLAN(enabled: boolean): void {
    this.config.allowLAN = enabled;
  }

  /* ─── DNS overrides ─── */

  addDNSOverride(domain: string, ip: string): void {
    if (!this.config.dnsOverrides) this.config.dnsOverrides = {};
    this.config.dnsOverrides[domain] = ip;
  }

  removeDNSOverride(domain: string): void {
    if (this.config.dnsOverrides) delete this.config.dnsOverrides[domain];
  }

  getDNSOverrides(): Record<string, string> {
    return { ...this.config.dnsOverrides };
  }

  /* ─── Connection log ─── */

  private logConnection(conn: ConnectionInfo): void {
    this.connections.push(conn);
    if (this.connections.length > NetworkManager.MAX_CONNECTIONS) {
      this.connections.shift();
    }
  }

  getConnections(filter?: { domain?: string; method?: string }): ConnectionInfo[] {
    let list = this.connections;
    if (filter?.domain) {
      list = list.filter((c) => {
        try { return new URL(c.url).hostname.includes(filter.domain!); } catch { return false; }
      });
    }
    if (filter?.method) {
      list = list.filter((c) => c.method === filter.method);
    }
    return [...list].reverse();
  }

  getStats(): {
    total: number;
    byDomain: Record<string, number>;
    byMethod: Record<string, number>;
  } {
    const byDomain: Record<string, number> = {};
    const byMethod: Record<string, number> = {};

    for (const c of this.connections) {
      try {
        const d = new URL(c.url).hostname;
        byDomain[d] = (byDomain[d] ?? 0) + 1;
      } catch { /* skip */ }
      byMethod[c.method] = (byMethod[c.method] ?? 0) + 1;
    }

    return { total: this.connections.length, byDomain, byMethod };
  }

  getConfig(): NetworkConfig {
    return { ...this.config };
  }

  clearConnections(): void {
    this.connections = [];
  }
}
