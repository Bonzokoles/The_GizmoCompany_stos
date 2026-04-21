import { dialog, ipcMain, type BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import type { ServiceContainer } from "../app/service-container";
import { IPC } from "../../src/shared/ipc/channels";
import { getErrorMessage } from "../utils/errors";

const CH = IPC.DIALOG;

const ALLOWED = [
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".html",
  ".ts",
  ".tsx",
  ".js",
];

export function registerDialog(
  win: BrowserWindow,
  _container: ServiceContainer,
): void {
  ipcMain.handle(
    CH.OPEN_FOLDER,
    async (_, opts?: { defaultPath?: string; title?: string }) => {
      const result = await dialog.showOpenDialog(win, {
        title: opts?.title || "Wybierz folder",
        defaultPath: opts?.defaultPath,
        properties: ["openDirectory"],
      });
      return result.canceled ? null : result.filePaths[0];
    },
  );

  ipcMain.handle(
    CH.OPEN_FILES,
    async (_, opts?: { defaultPath?: string; title?: string }) => {
      const result = await dialog.showOpenDialog(win, {
        title: opts?.title || "Wybierz pliki",
        defaultPath: opts?.defaultPath,
        properties: ["openFile", "multiSelections"],
      });
      return result.canceled ? null : result.filePaths;
    },
  );

  ipcMain.handle(CH.READ_FILES, async (_, paths: string[]) => {
    return (paths || []).flatMap((p) => {
      try {
        const ext = path.extname(p).toLowerCase();
        if (!ALLOWED.includes(ext)) return [];
        return [
          {
            name: path.basename(p),
            content: fs.readFileSync(p, "utf-8"),
            path: p,
          },
        ];
      } catch {
        return [];
      }
    });
  });

  ipcMain.handle(CH.READ_DIR_FILES, async (_, dirPath: string) => {
    const files: Array<{ name: string; content: string; path: string }> = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (ALLOWED.includes(path.extname(entry.name).toLowerCase())) {
          files.push({
            name: entry.name,
            content: fs.readFileSync(full, "utf-8"),
            path: full,
          });
        }
      }
    };
    try {
      walk(dirPath);
      return { success: true, files };
    } catch (error: unknown) {
      return {
        success: false,
        files: [],
        error: getErrorMessage(error),
      };
    }
  });
}
