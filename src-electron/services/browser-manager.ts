/**
 * Browser Manager - Tab and window management
 */

import { v4 as uuidv4 } from 'uuid';
import type { BrowserWindow } from 'electron';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
}

export class BrowserManager {
  private tabs: Map<string, BrowserTab> = new Map();
  private activeTabId: string | null = null;
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  createTab(url = 'about:blank', title = 'New Tab'): BrowserTab {
    const tab: BrowserTab = {
      id: uuidv4(),
      url,
      title,
      isActive: this.tabs.size === 0, // First tab is active
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };

    this.tabs.set(tab.id, tab);

    if (tab.isActive) {
      this.activeTabId = tab.id;
    }

    console.log(`✅ Tab created: ${tab.id}`);
    return tab;
  }

  closeTab(tabId: string): boolean {
    if (!this.tabs.has(tabId)) {
      return false;
    }

    this.tabs.delete(tabId);

    // Switch to previous or next tab
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.values());
      if (remainingTabs.length > 0) {
        this.activeTabId = remainingTabs[remainingTabs.length - 1].id;
      } else {
        this.activeTabId = null;
      }
    }

    console.log(`✅ Tab closed: ${tabId}`);
    return true;
  }

  navigate(tabId: string, url: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }

    // CR-001: URL validation — whitelist safe protocols
    const SAFE_PROTOCOLS = ['http:', 'https:', 'about:'];
    try {
      const parsedUrl = new URL(url);
      if (!SAFE_PROTOCOLS.includes(parsedUrl.protocol)) {
        console.error(`❌ Blocked unsafe protocol: ${parsedUrl.protocol}`);
        return false;
      }
    } catch (e) {
      // Invalid URL format
      console.error(`❌ Invalid URL format: ${url}`);
      return false;
    }

    tab.url = url;
    tab.lastAccessedAt = new Date();

    console.log(`🔗 Navigated to: ${url}`);
    return true;
  }

  setActiveTab(tabId: string): boolean {
    if (!this.tabs.has(tabId)) {
      return false;
    }

    // Deactivate current active tab
    if (this.activeTabId) {
      const activeTab = this.tabs.get(this.activeTabId);
      if (activeTab) {
        activeTab.isActive = false;
      }
    }

    // Activate new tab
    const newActiveTab = this.tabs.get(tabId);
    if (newActiveTab) {
      newActiveTab.isActive = true;
      newActiveTab.lastAccessedAt = new Date();
      this.activeTabId = tabId;
    }

    return true;
  }

  getTabs(): BrowserTab[] {
    return Array.from(this.tabs.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  getTab(tabId: string): BrowserTab | undefined {
    return this.tabs.get(tabId);
  }

  getActiveTab(): BrowserTab | null {
    if (!this.activeTabId) {
      return null;
    }
    return this.tabs.get(this.activeTabId) || null;
  }

  updateTabTitle(tabId: string, title: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }

    tab.title = title;
    return true;
  }

  updateTabFavicon(tabId: string, favicon: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }

    tab.favicon = favicon;
    return true;
  }

  goBack(tabId: string): boolean {
    if (!this.tabs.has(tabId)) return false;
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('browser:navigate-back', tabId);
    }
    return true;
  }

  goForward(tabId: string): boolean {
    if (!this.tabs.has(tabId)) return false;
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('browser:navigate-forward', tabId);
    }
    return true;
  }

  getTabCount(): number {
    return this.tabs.size;
  }

  clearAll(): void {
    this.tabs.clear();
    this.activeTabId = null;
    console.log('🗑️ All tabs cleared');
  }
}