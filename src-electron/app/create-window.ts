import { BrowserWindow, shell } from "electron";
import isDev from "electron-is-dev";
import path from "path";

// Suppress Electron's built-in security warnings (CSP unsafe-eval, etc.) in dev
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    backgroundColor: "#050508",
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
    icon: path.join(__dirname, "../../../build/icon.ico"),
  });

  win.once("ready-to-show", () => {
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: "detach" });
  });

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../../../dist/index.html")}`;
  void win.loadURL(startUrl);

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isOurPage =
      details.url.startsWith("http://localhost:5173") ||
      details.url.startsWith("file://");
    if (!isOurPage) {
      callback({ cancel: false });
      return;
    }
    // analytics.mybonzo.com — Umami script loaded in index.html (web tracking)
    const ANALYTICS = "https://analytics.mybonzo.com";
    const csp = isDev
      ? `default-src 'self' 'unsafe-inline' 'unsafe-eval' ws://localhost:* http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${ANALYTICS}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' ws://localhost:* http://localhost:* https:; frame-src *;`
      : `default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' ${ANALYTICS}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https: ${ANALYTICS}; frame-src *;`;
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  win.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ["clipboard-read", "notifications"];
      callback(allowed.includes(permission));
    },
  );

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  return win;
}
