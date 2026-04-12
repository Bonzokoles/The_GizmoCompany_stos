import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.BROWSER;

export const browserAPI = {
  navigate: (payload: { tabId?: string; url: string }) =>
    ipcRenderer.invoke(CH.NAVIGATE, payload),
  openTab: (payload?: { url?: string }) =>
    ipcRenderer.invoke(CH.OPEN_TAB, payload),
  closeTab: (payload: { tabId: string }) =>
    ipcRenderer.invoke(CH.CLOSE_TAB, payload),
  goBack: (payload?: { tabId?: string }) =>
    ipcRenderer.invoke(CH.GO_BACK, payload),
  goForward: (payload?: { tabId?: string }) =>
    ipcRenderer.invoke(CH.GO_FORWARD, payload),
} as const;
