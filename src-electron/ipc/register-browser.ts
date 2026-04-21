import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { isSafeUrl, isValidString } from "../utils/validate-url";
import { BrowserManager } from "../services/browser";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.BROWSER;

export function registerBrowser(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const browserManager = container.get<BrowserManager>("browserManager");

  ipcMain.handle(CH.NEW_TAB, async () => browserManager.createTab());

  ipcMain.handle(CH.CLOSE_TAB, async (_, tabId: string) => {
    if (!isValidString(tabId)) return false;
    return browserManager.closeTab(tabId);
  });

  ipcMain.handle(CH.NAVIGATE, async (_, tabId: string, url: string) => {
    if (!isValidString(tabId) || !isValidString(url) || !isSafeUrl(url)) {
      return false;
    }
    return browserManager.navigate(tabId, url);
  });

  ipcMain.handle(CH.GET_TABS, async () => browserManager.getTabs());

  ipcMain.handle(CH.GO_BACK, async (_, tabId: string) => {
    if (!isValidString(tabId)) return false;
    return browserManager.goBack(tabId);
  });

  ipcMain.handle(CH.GO_FORWARD, async (_, tabId: string) => {
    if (!isValidString(tabId)) return false;
    return browserManager.goForward(tabId);
  });
}
