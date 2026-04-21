import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.SYSTEM;

export const systemAPI = {
  fileDialogOpen: (payload?: unknown) =>
    ipcRenderer.invoke(CH.FILE_DIALOG_OPEN, payload),
  openExternal: (payload: unknown) =>
    ipcRenderer.invoke(CH.OPEN_EXTERNAL, payload),
  terminalSend: (payload: unknown) =>
    ipcRenderer.invoke(CH.TERMINAL_SEND, payload),
  /** Zwraca app.getAppPath() z procesu głównego */
  appGetPath: (): Promise<string> =>
    ipcRenderer.invoke(CH.APP_GET_PATH),
} as const;
