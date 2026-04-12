import { app, type BrowserWindow } from "electron";
import { loadEnv } from "./app/load-env";
import { createWindow } from "./app/create-window";
import { ServiceContainer } from "./app/service-container";
import { startJimboHub, stopJimboHub } from "./app/start-jimbo-hub";
import { registerAllIpc } from "./ipc";

let mainWindow: BrowserWindow | null = null;
let container: ServiceContainer | null = null;

// GPU crash fix (must be before ready lifecycle)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("--disable-gpu-sandbox");
app.commandLine.appendSwitch("--no-sandbox");
app.commandLine.appendSwitch("--disable-dev-shm-usage");

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
  if (mainWindow === null) {
    mainWindow = createWindow();
    if (container) {
      container.attachWindow(mainWindow);
      registerAllIpc(mainWindow, container);
    }
  }
});
