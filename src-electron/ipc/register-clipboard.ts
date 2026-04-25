import { ipcMain, clipboard, nativeImage } from "electron";
import type { BrowserWindow } from "electron";

export function registerClipboardIpc(_mainWindow: BrowserWindow) {
  ipcMain.handle("clipboard:readText", () => {
    return clipboard.readText();
  });

  ipcMain.handle("clipboard:writeText", (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle("clipboard:readImage", () => {
    const image = clipboard.readImage();
    return image.toDataURL(); // Return as Data URL for renderer
  });

  ipcMain.handle("clipboard:writeImage", (_event, dataUrl: string) => {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
  });

  // Note: Electron's clipboard module doesn't have a direct 'cut' operation.
  // 'cut' typically involves copying and then deleting from the source,
  // which is a UI/renderer responsibility. We'll provide copy and leave deletion to the renderer.
  ipcMain.handle("clipboard:copyText", (_event, text: string) => {
    clipboard.writeText(text);
  });
}
