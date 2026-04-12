import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.PLUGIN;

export const pluginAPI = {
  load: (payload: unknown) => ipcRenderer.invoke(CH.LOAD, payload),
  unload: (payload: unknown) => ipcRenderer.invoke(CH.UNLOAD, payload),
  capabilities: (payload?: unknown) =>
    ipcRenderer.invoke(CH.CAPABILITIES, payload),
} as const;
