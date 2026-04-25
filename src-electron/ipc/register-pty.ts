/**
 * PTY IPC handler â€” node-pty + xterm.js bridge
 * Spawns PowerShell PTY sessions, streams data to renderer via webContents.send
 */
import { ipcMain, type BrowserWindow } from "electron";
import * as os from "os";
import { execFileSync } from "child_process";
import * as path from "path";
import { IPC } from "../../src/shared/ipc/channels";
import type { ServiceContainer } from "../app/service-container";
import type { MCPServer } from "../mcp-server";

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
 * On Windows, uses `where <cmd>` â€” fixes "File not found" from node-pty
 * when Electron's PATH doesn't include the user's Node.js installation.
 */
function resolveExecutable(command: string): string {
  // Already absolute path â€” use as-is
  if (command.includes("/") || command.includes("\\")) return command;

  try {
    if (process.platform === "win32") {
      const out = execFileSync("where", [command], { encoding: "utf-8", timeout: 4_000 });
      const first = out.trim().split(/\r?\n/)[0]?.trim();
      if (first) {
        console.log(`[PTY] Resolved '${command}' â†’ ${first}`);
        return first;
      }
    } else {
      const out = execFileSync("which", [command], { encoding: "utf-8", timeout: 4_000 });
      const resolved = out.trim();
      if (resolved) return resolved;
    }
  } catch {
    // not found via where/which â€” fall back to original name
    console.warn(`[PTY] Could not resolve '${command}' via where/which â€” using as-is`);
  }
  return command;
}

export function registerPty(win: BrowserWindow, container: ServiceContainer): void {
  const mcpServer = container.get<MCPServer>("mcpServer");
  // â”€â”€ pty:create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // opts.command â€” np. "ollama" dla Pi, domyĹ›lnie PowerShell
  // opts.args    â€” argumenty komendy
  // opts.env     â€” dodatkowe env vars (API keys itp.)
  ipcMain.handle(CH.CREATE, async (_, cols = 80, rows = 24, cwd?: string, opts?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    windowsHide?: boolean; // Added windowsHide option
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
        // @ts-ignore
        windowsHide: opts?.windowsHide, // Pass windowsHide option
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

  // â”€â”€ pty:write â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ pty:resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ pty:kill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  // This will be the core for Pi orchestration and structured command execution.
  // It sends a command, waits for a specific output marker or timeout, and returns the collected output.
  ipcMain.handle(IPC.PI_AGENT.SEND_COMMAND_AND_WAIT, async (_, id: string, command: string, waitFor?: string, timeoutMs: number = 5000) => {
    const session = sessions.get(id);
    if (!session) {
      return { success: false, error: "Session not found", output: "" };
    }

    return new Promise(async (resolve) => {
      let accumulatedOutput = "";
      let timeout: NodeJS.Timeout;

      // Listener for data from PTY
      const disposable = session.pty.onData((data: string) => {
        accumulatedOutput += data;

        // Check for specific waitFor string
        if (waitFor && accumulatedOutput.includes(waitFor)) {
          clearTimeout(timeout);
          disposable.dispose();
          // Remove the waitFor string from output if it's just a marker
          const finalOutput = accumulatedOutput.split(waitFor).slice(0, -1).join(waitFor);
          resolve({ success: true, output: finalOutput.trim() });
        }
      });

      // Send the command to PTY
      session.pty.write(command + '\r'); // Add carriage return to execute

      // Set a timeout for waiting
      timeout = setTimeout(() => {
        disposable.dispose();
        resolve({ success: false, error: `Timeout after ${timeoutMs}ms`, output: accumulatedOutput.trim() });
      }, timeoutMs);
    });
  });
}

export function cleanupAllPtySessions(): void {
  for (const [id, session] of sessions) {
    try { session.pty.kill(); } catch { /* ignore */ }
    sessions.delete(id);
  }
}




