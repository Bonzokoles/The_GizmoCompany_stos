import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.MCP;

export const mcpAPI = {
  listTools: () =>
    ipcRenderer.invoke(CH.LIST_TOOLS) as Promise<string[]>,
  executeTool: (toolName: string, args: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.EXECUTE_TOOL, toolName, args) as Promise<{ success: boolean; data?: unknown; error?: string }>,
  getToolSchema: (toolName: string) =>
    ipcRenderer.invoke(CH.GET_TOOL_SCHEMA, toolName) as Promise<unknown>,
  serverStatus: () =>
    ipcRenderer.invoke(CH.SERVER_STATUS) as Promise<{ running: boolean; toolCount: number; tools: string[] }>,
} as const;
