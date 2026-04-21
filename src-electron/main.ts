import { app, type BrowserWindow } from "electron";
import { loadEnv } from "./app/load-env";
import { createWindow } from "./app/create-window";
import { ServiceContainer } from "./app/service-container";
import { startJimboHub, stopJimboHub } from "./app/start-jimbo-hub";
import { registerAllIpc } from "./ipc";

let mainWindow: BrowserWindow | null = null;
let container: ServiceContainer | null = null;

// ── Memory / GPU flags — must be set BEFORE app ready ──────────────────────
// VirtualAlloc fix: system virtual memory gets exhausted by Podman containers
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-dev-shm-usage");

// Reduce Electron process count → less virtual address space consumed
app.commandLine.appendSwitch("no-zygote");                       // skip zygote helper process
app.commandLine.appendSwitch("disable-background-networking");   // no background fetches
app.commandLine.appendSwitch("disable-renderer-backgrounding");  // don't suspend bg renderers
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("renderer-process-limit", "2");     // max 2 renderer processes

// Limit V8 heap — prevents OOM inside renderer
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=512");

app.on("ready", async () => {
  try {
    loadEnv();
    container = new ServiceContainer();
    await container.init();

    mainWindow = createWindow();
    container.attachWindow(mainWindow);
    registerAllIpc(mainWindow, container);

    await container.startAll();
    await startJimboHub();
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopJimboHub();
  container?.stopAll();
});

app.on("activate", () => {
  // IPC handlers are global (ipcMain) — no need to re-register on new window.
  // Only re-create the BrowserWindow if it was closed.
  if (mainWindow === null) {
    mainWindow = createWindow();
    if (container) {
      container.attachWindow(mainWindow);
    }
  }
});
