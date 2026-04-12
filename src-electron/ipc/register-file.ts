/**
 * register-file.ts — File system IPC handlers for File Agent
 * Provides list/read/write/delete/stat operations on the local filesystem.
 */

import { dialog, ipcMain, type BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.FILE;

export interface FsEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number; // Unix ms
  extension: string;
}

export function registerFile(win: BrowserWindow): void {
  // ── List directory entries (non-recursive) ───────────────────────────────
  ipcMain.handle(CH.LIST, async (_, dirPath: string) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const result: FsEntry[] = entries
        .map((e) => {
          const fullPath = path.join(dirPath, e.name);
          try {
            const stat = fs.statSync(fullPath);
            return {
              name: e.name,
              path: fullPath,
              type: e.isDirectory() ? ("directory" as const) : ("file" as const),
              size: stat.size,
              modified: stat.mtimeMs,
              extension: e.isDirectory() ? "" : path.extname(e.name).toLowerCase(),
            };
          } catch {
            return null;
          }
        })
        .filter((e): e is FsEntry => e !== null)
        .sort((a, b) => {
          // directories first, then files, both alphabetical
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      return { success: true, entries };
    } catch (err: unknown) {
      return { success: false, entries: [], error: String(err) };
    }
  });

  // ── Read single file ─────────────────────────────────────────────────────
  ipcMain.handle(CH.READ, async (_, filePath: string) => {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 5 * 1024 * 1024) {
        return { success: false, error: "Plik za duży (max 5 MB)" };
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return { success: true, content, size: stat.size, modified: stat.mtimeMs };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // ── Write / save file ────────────────────────────────────────────────────
  ipcMain.handle(CH.WRITE, async (_, filePath: string, content: string) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // ── Delete file or empty directory ──────────────────────────────────────
  ipcMain.handle(CH.DELETE, async (_, targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmdirSync(targetPath); // only empty dirs
      } else {
        fs.unlinkSync(targetPath);
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // ── Stat (metadata only) ─────────────────────────────────────────────────
  ipcMain.handle(CH.STAT, async (_, targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath);
      return {
        success: true,
        size: stat.size,
        modified: stat.mtimeMs,
        created: stat.birthtimeMs,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
      };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // ── Open folder picker ───────────────────────────────────────────────────
  ipcMain.handle(CH.OPEN_FOLDER, async (_, defaultPath?: string) => {
    const result = await dialog.showOpenDialog(win, {
      title: "Wybierz folder",
      defaultPath,
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });
}
