import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.WINDOW;

export const windowAPI = {
  minimize: () => ipcRenderer.invoke(CH.MINIMIZE),
  maximize: () => ipcRenderer.invoke(CH.MAXIMIZE),
  close:    () => ipcRenderer.invoke(CH.CLOSE),
} as const;
