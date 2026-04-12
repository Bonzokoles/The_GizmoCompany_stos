import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { NetworkManager } from "../services/network-manager";
import { NetworkMonitor } from "../services/network-monitor";
import { isValidString } from "../utils/validate-url";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.NETWORK;

export function registerNetwork(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const networkMonitor = container.get<NetworkMonitor>("networkMonitor");
  const networkManager = container.get<NetworkManager>("networkManager");

  ipcMain.handle(CH.GET_REPORT, async (_, tabId: string) => {
    if (!isValidString(tabId)) return null;
    return networkMonitor.getReport(tabId);
  });
  ipcMain.handle(CH.GET_STATS, async () => networkManager.getStats());
  ipcMain.handle(
    CH.GET_CONNECTIONS,
    async (_, filter?: { domain?: string; method?: string }) =>
      networkManager.getConnections(filter),
  );
  ipcMain.handle(
    CH.SET_PROXY,
    async (_, proxyUrl: string, type?: "http" | "socks5") => {
      if (!isValidString(proxyUrl)) return false;
      await networkManager.setProxy(proxyUrl, type);
      return true;
    },
  );
  ipcMain.handle(CH.CLEAR_PROXY, async () => {
    await networkManager.clearProxy();
    return true;
  });
  ipcMain.handle(CH.GET_CONFIG, async () => networkManager.getConfig());
}
