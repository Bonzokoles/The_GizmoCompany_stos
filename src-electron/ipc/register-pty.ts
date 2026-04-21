/**
 * PTY IPC handler — node-pty + xterm.js bridge
 * Spawns PowerShell PTY sessions, streams data to renderer via webContents.send
 */
import { ipcMain, type BrowserWindow } from "electron";
import * as os from "os";
import { execFileSync } from "child_process";
import * as path from "path";
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

/**
 * Resolve the full path of an executable by name.
 * On Windows, uses `where <cmd>` — fixes "File not found" from node-pty
 * when Electron's PATH doesn't include the user's Node.js installation.
 */
function resolveExecutable(command: string): string {
  // Already absolute path — use as-is
  if (command.includes("/") || command.includes("\\")) return command;

  try {
    if (process.platform === "win32") {
      const out = execFileSync("where", [command], { encoding: "utf-8", timeout: 4_000 });
      const first = out.trim().split(/\r?\n/)[0]?.trim();
      if (first) {
        console.log(`[PTY] Resolved '${command}' → ${first}`);
        return first;
      }
    } else {
      const out = execFileSync("which", [command], { encoding: "utf-8", timeout: 4_000 });
      const resolved = out.trim();
      if (resolved) return resolved;
    }
  } catch {
    // not found via where/which — fall back to original name
    console.warn(`[PTY] Could not resolve '${command}' via where/which — using as-is`);
  }
  return command;
}

export function registerPty(win: BrowserWindow): void {
  // ── pty:create ─────────────────────────────────────────────
  // opts.command — np. "ollama" dla Pi, domyślnie PowerShell
  // opts.args    — argumenty komendy
  // opts.env     — dodatkowe env vars (API keys itp.)
  ipcMain.handle(CH.CREATE, async (_, cols = 80, rows = 24, cwd?: string, opts?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  }) => {
    try {
      const nodePty = await import("node-pty");
      const id = `pty-${++sessionCounter}`;

      let shell: string;
      let args: string[];

      if (opts?.command) {
        shell = resolveExecutable(opts.command);
        args  = opts.args ?? [];
      } else {
        ({ shell, args } = getShell());
      }

      const mergedEnv: Record<string, string> = {
        ...(process.env as Record<string, string>),
        ...(opts?.env ?? {}),
      };

      // Ensure the directory of the resolved executable is on PATH
      // so that scripts spawned by it (e.g. node running a JS file) can find siblings
      if (opts?.command && (opts.command === "node" || opts.command.endsWith("node.exe"))) {
        const nodeDir = path.dirname(shell);
        const sep = process.platform === "win32" ? ";" : ":";
        if (nodeDir && !mergedEnv.PATH?.includes(nodeDir)) {
          mergedEnv.PATH = nodeDir + sep + (mergedEnv.PATH ?? "");
        }
      }

      const ptyProcess = nodePty.spawn(shell, args, {
        name: "xterm-256color",
        cols: Math.max(1, cols),
        rows: Math.max(1, rows),
        cwd: cwd ?? os.homedir(),
        env: mergedEnv,
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
