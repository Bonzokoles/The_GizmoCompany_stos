import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.FILE;

export const fileAPI = {
  list: (dirPath: string) => ipcRenderer.invoke(CH.LIST, dirPath),
  read: (filePath: string) => ipcRenderer.invoke(CH.READ, filePath),
  write: (filePath: string, content: string) =>
    ipcRenderer.invoke(CH.WRITE, filePath, content),
  delete: (targetPath: string) => ipcRenderer.invoke(CH.DELETE, targetPath),
  stat: (targetPath: string) => ipcRenderer.invoke(CH.STAT, targetPath),
  openFolder: (defaultPath?: string) =>
    ipcRenderer.invoke(CH.OPEN_FOLDER, defaultPath),
} as const;
