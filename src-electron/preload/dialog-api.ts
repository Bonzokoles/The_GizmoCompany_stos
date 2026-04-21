import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.DIALOG;

export const dialogAPI = {
  openFolder: (opts?: { defaultPath?: string; title?: string }) =>
    ipcRenderer.invoke(CH.OPEN_FOLDER, opts) as Promise<string | null>,
  openFiles: (opts?: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean }) =>
    ipcRenderer.invoke(CH.OPEN_FILES, opts) as Promise<string[] | null>,
  readFiles: (paths: string[]) =>
    ipcRenderer.invoke(CH.READ_FILES, paths) as Promise<Array<{ name: string; content: string; path: string }>>,
  readDirFiles: (dirPath: string) =>
    ipcRenderer.invoke(CH.READ_DIR_FILES, dirPath) as Promise<{ success: boolean; files: Array<{ name: string; content: string; path: string }>; error?: string }>,
} as const;
