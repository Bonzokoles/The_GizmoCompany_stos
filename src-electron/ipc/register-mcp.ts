import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { isValidString } from "../utils/validate-url";
import type { MCPServer } from "../mcp-server";
import { IPC } from "../../src/shared/ipc/channels";
import { getErrorMessage } from "../utils/errors";

const CH = IPC.MCP;

export function registerMcp(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const mcpServer = container.get<MCPServer>("mcpServer");

  ipcMain.handle(CH.LIST_TOOLS, async () => mcpServer.getToolNames());
  ipcMain.handle(
    CH.EXECUTE_TOOL,
    async (_, toolName: string, args: Record<string, unknown>) => {
      if (!isValidString(toolName)) {
        return { success: false, error: "Invalid tool name" };
      }
      try {
        const data = await mcpServer.executeTool(toolName, args ?? {});
        return { success: true, data };
      } catch (error: unknown) {
        return {
          success: false,
          error: getErrorMessage(error),
        };
      }
    },
  );
  ipcMain.handle(CH.GET_TOOL_SCHEMA, async (_, toolName: string) => {
    if (!isValidString(toolName)) return null;
    return mcpServer.getToolSchema(toolName);
  });
  ipcMain.handle(CH.SERVER_STATUS, async () => ({
    running: mcpServer.isRunning(),
    toolCount: mcpServer.getToolNames().length,
    tools: mcpServer.getToolNames(),
  }));
}
