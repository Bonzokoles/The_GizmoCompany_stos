import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.WINDOW;

export function registerWindow(
  win: BrowserWindow,
  _container: ServiceContainer,
): void {
  ipcMain.handle(CH.MINIMIZE, async () => {
    win.minimize();
  });
  ipcMain.handle(CH.MAXIMIZE, async () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle(CH.CLOSE, async () => {
    win.close();
  });
}
