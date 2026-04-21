import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import {
  AIGatewayService,
  type AIRequest,
} from "../services/ai";
import { IPC } from "../../src/shared/ipc/channels";
import { getErrorMessage } from "../utils/errors";

const CH = IPC.AI;

export function registerAi(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const aiGatewayService = container.get<AIGatewayService>("aiGatewayService");

  ipcMain.handle(CH.EXECUTE, async (_, request: AIRequest) => {
    try {
      const response = await aiGatewayService.execute(request);
      return { success: true, data: response };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle(CH.GET_PROVIDERS, async () =>
    aiGatewayService.getProviderStatus(),
  );

  ipcMain.handle(CH.GET_METRICS, async () => aiGatewayService.getMetrics());
}
