import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { isValidString } from "../utils/validate-url";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.TERMINAL;

export function registerTerminal(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  ipcMain.handle(CH.EXECUTE, async (_, command: string, cwd?: string) => {
    if (!isValidString(command))
      return { success: false, error: "Invalid command" };
    return container.execCommand(command, cwd);
  });
  ipcMain.handle(
    CH.GET_CWD,
    async () => container.get<{ cwd: string }>("terminalState").cwd,
  );
  ipcMain.handle(CH.SET_CWD, async (_, dir: string) => {
    if (!isValidString(dir)) return { success: false, error: "Invalid path" };
    return container.setTerminalCwd(dir);
  });
  ipcMain.handle(CH.SYSTEM_INFO, async () => container.getSystemInfo());
  ipcMain.handle(CH.GET_ENV, async (_, name?: string) => {
    if (name && isValidString(name)) return process.env[name] ?? "";
    const safe: Record<string, string> = {};
    for (const key of Object.keys(process.env)) {
      if (!/secret|token|password|key|auth/i.test(key)) {
        safe[key] = String(process.env[key] ?? "");
      }
    }
    return safe;
  });
  ipcMain.handle(CH.KILL_PROCESS, async (_, pid: number) => {
    if (typeof pid !== "number" || pid <= 0)
      return { success: false, error: "Invalid pid" };
    try {
      process.kill(pid, "SIGTERM");
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
