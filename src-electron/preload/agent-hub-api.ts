import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.HUB;

export const agentHubAPI = {
  query: (payload: unknown) => ipcRenderer.invoke(CH.QUERY, payload),
  routeTask: (payload: unknown) => ipcRenderer.invoke(CH.ROUTE_TASK, payload),
  agentStatus: (payload?: unknown) =>
    ipcRenderer.invoke(CH.AGENT_STATUS, payload),
} as const;
