import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.CATALOG;

export const catalogAPI = {
  bookmarkAdd: (payload: unknown) =>
    ipcRenderer.invoke(CH.BOOKMARK_ADD, payload),
  historyGet: (payload?: unknown) =>
    ipcRenderer.invoke(CH.HISTORY_GET, payload),
  downloadQueue: (payload?: unknown) =>
    ipcRenderer.invoke(CH.DOWNLOAD_QUEUE, payload),
} as const;
