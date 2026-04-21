/**
 * Tab Communication Manager
 * Inter-tab messaging, session sharing, auth token propagation
 * Runs in the main (Electron) process.
 */

import { EventEmitter } from 'events';

/* ─── Types ─── */

export interface TabMessage {
  id: string;
  fromTabId: string;
  toTabId?: string; // undefined = broadcast
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface TabContext {
  tabId: string;
  sessionData: Map<string, unknown>;
  authToken?: string;
}

/* ─── Class ─── */

export class TabCommunicationManager extends EventEmitter {
  private tabs: Map<string, TabContext> = new Map();
  private messages: TabMessage[] = [];
  private static readonly MAX_MESSAGES = 500;

  /* ─── Tab lifecycle ─── */

  registerTab(tabId: string): TabContext {
    const ctx: TabContext = { tabId, sessionData: new Map() };
    this.tabs.set(tabId, ctx);
    this.emit('tab-registered', { tabId });
    return ctx;
  }

  unregisterTab(tabId: string): void {
    this.tabs.delete(tabId);
    this.emit('tab-unregistered', { tabId });
  }

  getTabContext(tabId: string): TabContext | undefined {
    return this.tabs.get(tabId);
  }

  getAllTabIds(): string[] {
    return Array.from(this.tabs.keys());
  }

  /* ─── Messaging ─── */

  sendMessage(fromTabId: string, toTabId: string | undefined, type: string, payload: unknown): string {
    const msg: TabMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromTabId,
      toTabId,
      type,
      payload,
      timestamp: new Date(),
    };

    this.messages.push(msg);
    if (this.messages.length > TabCommunicationManager.MAX_MESSAGES) {
      this.messages.shift();
    }

    if (toTabId) {
      this.emit(`message:${toTabId}`, msg);
    } else {
      // Broadcast
      for (const tabId of this.tabs.keys()) {
        if (tabId !== fromTabId) {
          this.emit(`message:${tabId}`, msg);
        }
      }
    }

    this.emit('message', msg);
    return msg.id;
  }

  getMessageHistory(opts?: { fromTabId?: string; toTabId?: string; limit?: number }): TabMessage[] {
    let list = this.messages;
    if (opts?.fromTabId) list = list.filter((m) => m.fromTabId === opts.fromTabId);
    if (opts?.toTabId) list = list.filter((m) => m.toTabId === opts.toTabId);
    const limit = opts?.limit ?? 100;
    return list.slice(-limit);
  }

  /* ─── Session sharing ─── */

  shareSession(fromTabId: string, toTabId: string, keys: string[]): boolean {
    const from = this.tabs.get(fromTabId);
    const to = this.tabs.get(toTabId);
    if (!from || !to) return false;

    for (const key of keys) {
      if (from.sessionData.has(key)) {
        to.sessionData.set(key, from.sessionData.get(key));
      }
    }

    this.emit('session-shared', { fromTabId, toTabId, keys });
    return true;
  }

  setSessionData(tabId: string, key: string, value: unknown): void {
    const ctx = this.tabs.get(tabId);
    if (ctx) ctx.sessionData.set(key, value);
  }

  getSessionData(tabId: string, key: string): unknown {
    return this.tabs.get(tabId)?.sessionData.get(key);
  }

  /* ─── Auth token propagation ─── */

  shareAuthToken(fromTabId: string, toTabId?: string): boolean {
    const from = this.tabs.get(fromTabId);
    if (!from?.authToken) return false;

    if (toTabId) {
      const to = this.tabs.get(toTabId);
      if (to) to.authToken = from.authToken;
    } else {
      for (const [id, ctx] of this.tabs) {
        if (id !== fromTabId) ctx.authToken = from.authToken;
      }
    }

    this.emit('auth-shared', { fromTabId, toTabId });
    return true;
  }

  setAuthToken(tabId: string, token: string): void {
    const ctx = this.tabs.get(tabId);
    if (ctx) ctx.authToken = token;
  }
}
