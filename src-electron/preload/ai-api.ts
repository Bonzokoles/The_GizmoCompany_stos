import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.AI;

export const aiAPI = {
  chat: (payload: unknown) => ipcRenderer.invoke(CH.CHAT, payload),
  completions: (payload: unknown) =>
    ipcRenderer.invoke(CH.COMPLETIONS, payload),
  streamStart: (payload: unknown) =>
    ipcRenderer.invoke(CH.STREAM_START, payload),
  streamStop: (payload: unknown) => ipcRenderer.invoke(CH.STREAM_STOP, payload),
} as const;
