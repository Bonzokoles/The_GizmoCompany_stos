import { contextBridge, ipcRenderer } from "electron";
import { browserAPI } from "./preload/browser-api";
import { aiAPI } from "./preload/ai-api";
import { agentHubAPI } from "./preload/agent-hub-api";
import { networkAPI } from "./preload/network-api";
import { searchAPI } from "./preload/search-api";
import { catalogAPI } from "./preload/catalog-api";
import { systemAPI } from "./preload/system-api";
import { pluginAPI } from "./preload/plugin-api";
import { terminalAPI } from "./preload/terminal-api";
import { fileAPI } from "./preload/file-api";
import { knowledgeHubAPI } from "./preload/knowledge-hub-api";
import { windowAPI } from "./preload/window-api";
import { dialogAPI } from "./preload/dialog-api";
import { crawlerAPI } from "./preload/crawler-api";
import { mcpAPI } from "./preload/mcp-api";
import { clipboardAPI } from "./preload/clipboard-api";

// Suppress noisy dev-only console messages before React loads
const _origLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("Download the React DevTools")) return;
  _origLog(...args);
};

const electronAPI = {
  browser: browserAPI,
  ai: aiAPI,
  agentHub: agentHubAPI,
  network: networkAPI,
  search: searchAPI,
  catalog: catalogAPI,
  system: systemAPI,
  plugin: pluginAPI,
  terminal: terminalAPI,
  file: fileAPI,
  knowledgeHub: knowledgeHubAPI,
  window: windowAPI,
  dialog: dialogAPI,
  crawler: crawlerAPI,
  mcp: mcpAPI,
  clipboard: clipboardAPI,
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    return () => ipcRenderer.removeAllListeners(channel);
  },
  once: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => listener(...args));
  },
  removeListener: (channel: string, listener: (...args: unknown[]) => void) =>
    ipcRenderer.removeListener(channel, listener as never),
} as const;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
