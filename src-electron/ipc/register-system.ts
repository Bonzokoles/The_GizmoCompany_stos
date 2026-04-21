import { app, ipcMain, shell, type BrowserWindow } from "electron";
import path from "path";
import type { ServiceContainer } from "../app/service-container";
import { IPC } from "../../src/shared/ipc/channels";
import { getErrorMessage } from "../utils/errors";

const CH = IPC.SYSTEM;

export function registerSystem(
  _win: BrowserWindow,
  _container: ServiceContainer,
): void {
  // Zwraca ścieżkę katalogu głównego aplikacji (app.getAppPath())
  ipcMain.handle(CH.APP_GET_PATH, async () => {
    return path.normalize(app.getAppPath());
  });

  // Otwiera URL w domyślnej przeglądarce / zewnętrznej aplikacji
  ipcMain.handle(CH.OPEN_EXTERNAL, async (_, url: unknown) => {
    if (typeof url !== "string") return { success: false, error: "Invalid URL" };
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });

  // Placeholder — pełna obsługa dialogu plikowego przez register-dialog.ts
  ipcMain.handle(CH.FILE_DIALOG_OPEN, async (_e, payload?: unknown) => {
    return payload ?? null;
  });

  // Placeholder — terminal send (np. otwieranie terminala systemowego)
  ipcMain.handle(CH.TERMINAL_SEND, async (_e, payload?: unknown) => {
    return payload ?? null;
  });
}
