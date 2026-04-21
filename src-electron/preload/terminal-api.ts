import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.TERMINAL;
const PTY = IPC.PTY;

export const terminalAPI = {
  // ── Classic execute (one-shot, no PTY) ────────────────────
  execute: (command: string, cwd?: string) =>
    ipcRenderer.invoke(CH.EXECUTE, command, cwd),
  getCwd: () => ipcRenderer.invoke(CH.GET_CWD),
  setCwd: (dir: string) => ipcRenderer.invoke(CH.SET_CWD, dir),
  getSystemInfo: () => ipcRenderer.invoke(CH.SYSTEM_INFO),
  getEnv: (name?: string) => ipcRenderer.invoke(CH.GET_ENV, name),
  killProcess: (pid: number) => ipcRenderer.invoke(CH.KILL_PROCESS, pid),

  // ── PTY (real terminal via node-pty) ──────────────────────
  pty: {
    create: (cols: number, rows: number, cwd?: string, opts?: {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    }) =>
      ipcRenderer.invoke(PTY.CREATE, cols, rows, cwd, opts),
    write: (id: string, data: string) =>
      ipcRenderer.invoke(PTY.WRITE, id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke(PTY.RESIZE, id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke(PTY.KILL, id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, id: string, data: string) =>
        callback(id, data);
      ipcRenderer.on(PTY.DATA, handler);
      return () => ipcRenderer.off(PTY.DATA, handler);
    },
    onExit: (callback: (id: string, exitCode: number) => void) => {
      const handler = (_: Electron.IpcRendererEvent, id: string, code: number) =>
        callback(id, code);
      ipcRenderer.on(PTY.EXIT, handler);
      return () => ipcRenderer.off(PTY.EXIT, handler);
    },
  },
} as const;
