import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.NETWORK;

export const networkAPI = {
  fetch: (payload: unknown) => ipcRenderer.invoke(CH.FETCH, payload),
  dnsLookup: (payload: unknown) => ipcRenderer.invoke(CH.DNS_LOOKUP, payload),
  proxyToggle: (payload: unknown) =>
    ipcRenderer.invoke(CH.PROXY_TOGGLE, payload),
} as const;
