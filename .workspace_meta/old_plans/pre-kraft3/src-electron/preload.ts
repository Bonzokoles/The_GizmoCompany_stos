/**
 * Preload Script - Bridge between Renderer and Main Process
 * Provides secure IPC communication
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposed API for renderer process
 */
const api = {
  // Browser operations
  browser: {
    newTab: () => ipcRenderer.invoke('browser:new-tab'),
    closeTab: (tabId: string) => ipcRenderer.invoke('browser:close-tab', tabId),
    navigate: (tabId: string, url: string) =>
      ipcRenderer.invoke('browser:navigate', tabId, url),
    getTabs: () => ipcRenderer.invoke('browser:get-tabs'),
  },

  // AI Gateway
  ai: {
    execute: (request: any) => ipcRenderer.invoke('ai:execute', request),
    getProviders: () => ipcRenderer.invoke('ai:get-providers'),
    getMetrics: () => ipcRenderer.invoke('ai:get-metrics'),
  },

  // Network monitoring
  network: {
    getReport: (tabId: string) => ipcRenderer.invoke('network:get-report', tabId),
  },

  // Security
  security: {
    createContext: (tabId: string) => ipcRenderer.invoke('security:create-context', tabId),
    getAuditLogs: (tabId?: string) => ipcRenderer.invoke('security:get-audit-logs', tabId),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // Theme
  theme: {
    toggle: () => ipcRenderer.invoke('theme:toggle'),
  },

  // Terminal Panel / Agent Generic Access
  invoke: (channel: string, ...args: any[]) => {
    const validChannels = [
      'crawler:search', 'crawler:extract', 
      'library:index-file', 'library:search', 'library:save-web',
      'mcp:connect', 'mcp:list-tools', 'mcp:execute-tool',
      'tunnel:start', 'tunnel:stop', 'tunnel:metrics', 'tunnel:status'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  },

  // System info
  system: {
    platform: process.platform,
    nodeVersion: process.version,
    arch: process.arch,
  },
};

/**
 * Expose API to renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', api);

/**
 * Type definitions for renderer
 */
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}

export type ElectronAPI = typeof api;