/**
 * PTY IPC handler — node-pty + xterm.js bridge
 * Spawns PowerShell PTY sessions, streams data to renderer via webContents.send
 */
import { ipcMain, type BrowserWindow } from "electron";
import * as os from "os";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.PTY;

interface PtySession {
  pty: import("node-pty").IPty;
  id: string;
}

const sessions = new Map<string, PtySession>();
let sessionCounter = 0;

function getShell(): { shell: string; args: string[] } {
  if (process.platform === "win32") {
    return { shell: "powershell.exe", args: ["-NoLogo"] };
  }
  return { shell: process.env.SHELL ?? "/bin/bash", args: [] };
}

export function registerPty(win: BrowserWindow): void {
  // ── pty:create ─────────────────────────────────────────────
  ipcMain.handle(CH.CREATE, async (_, cols = 80, rows = 24, cwd?: string) => {
    try {
      const nodePty = await import("node-pty");
      const { shell, args } = getShell();
      const id = `pty-${++sessionCounter}`;

      const ptyProcess = nodePty.spawn(shell, args, {
        name: "xterm-256color",
        cols: Math.max(1, cols),
        rows: Math.max(1, rows),
        cwd: cwd ?? os.homedir(),
        env: process.env as Record<string, string>,
      });

      ptyProcess.onData((data: string) => {
        if (!win.isDestroyed()) {
          win.webContents.send(CH.DATA, id, data);
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        sessions.delete(id);
        if (!win.isDestroyed()) {
          win.webContents.send(CH.EXIT, id, exitCode);
        }
      });

      sessions.set(id, { pty: ptyProcess, id });
      return { success: true, id };
    } catch (err) {
      console.error("[PTY] Failed to create:", err);
      return { success: false, error: String(err) };
    }
  });

  // ── pty:write ──────────────────────────────────────────────
  ipcMain.handle(CH.WRITE, (_, id: string, data: string) => {
    const session = sessions.get(id);
    if (!session) return { success: false, error: "Session not found" };
    try {
      session.pty.write(data);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ── pty:resize ─────────────────────────────────────────────
  ipcMain.handle(CH.RESIZE, (_, id: string, cols: number, rows: number) => {
    const session = sessions.get(id);
    if (!session) return { success: false, error: "Session not found" };
    try {
      session.pty.resize(Math.max(1, cols), Math.max(1, rows));
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ── pty:kill ───────────────────────────────────────────────
  ipcMain.handle(CH.KILL, (_, id: string) => {
    const session = sessions.get(id);
    if (!session) return { success: false, error: "Session not found" };
    try {
      session.pty.kill();
      sessions.delete(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
}

export function cleanupAllPtySessions(): void {
  for (const [id, session] of sessions) {
    try { session.pty.kill(); } catch { /* ignore */ }
    sessions.delete(id);
  }
}
