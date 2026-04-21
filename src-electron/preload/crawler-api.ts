import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.CRAWLER;

export const crawlerAPI = {
  start: (config: { startUrls: string[]; maxPages?: number; followLinks?: boolean; delay?: number }) =>
    ipcRenderer.invoke(CH.START, config) as Promise<{ id: string; status: string } | null>,
  cancel: (crawlId: string) =>
    ipcRenderer.invoke(CH.CANCEL, crawlId) as Promise<boolean>,
  get: (crawlId: string) =>
    ipcRenderer.invoke(CH.GET, crawlId) as Promise<{ id: string; status: string; pages?: unknown[]; pagesVisited?: number } | null>,
  list: () =>
    ipcRenderer.invoke(CH.LIST) as Promise<Array<{ id: string; status: string; pagesVisited?: number; pages?: unknown[] }>>,
  export: (crawlId: string, format?: "json" | "csv") =>
    ipcRenderer.invoke(CH.EXPORT, crawlId, format) as Promise<string | null>,
} as const;
