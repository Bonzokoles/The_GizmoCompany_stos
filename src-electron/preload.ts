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
