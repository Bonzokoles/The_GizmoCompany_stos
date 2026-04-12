import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.SEARCH;

export const searchAPI = {
  query: (payload: unknown) => ipcRenderer.invoke(CH.QUERY, payload),
  index: (payload: unknown) => ipcRenderer.invoke(CH.INDEX, payload),
  crawl: (payload: unknown) => ipcRenderer.invoke(CH.CRAWL, payload),
} as const;
