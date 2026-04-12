import { app } from "electron";
import fs from "fs";
import net from "net";
import path from "path";
import { spawn, type ChildProcess } from "child_process";

let jimboHubProcess: ChildProcess | null = null;
let jimboHubShuttingDown = false;
let restartDelayMs = 1000;

function isPortBusy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", (err: NodeJS.ErrnoException) => {
      resolve(err.code === "EADDRINUSE");
    });
    tester.once("listening", () => {
      tester.close(() => resolve(false));
    });
    tester.listen(port, "127.0.0.1");
  });
}

function spawnHub(hubDir: string): ChildProcess {
  const nvmPath = "C:\\nvm4w\\nodejs;C:\\ProgramData\\nvm";
  const env = {
    ...process.env,
    PATH: `${nvmPath};${process.env.PATH ?? ""}`,
  };

  const child = spawn("npx", ["tsx", "hub-server.ts"], {
    cwd: hubDir,
    stdio: "pipe",
    shell: true,
    env,
    detached: false,
  });

  child.stdout?.on("data", (d: Buffer) =>
    console.log("[JIMBO HUB]", d.toString().trimEnd()),
  );
  child.stderr?.on("data", (d: Buffer) =>
    console.warn("[JIMBO HUB ERR]", d.toString().trimEnd()),
  );

  child.on("exit", () => {
    if (jimboHubShuttingDown) return;
    const nextDelay = restartDelayMs;
    restartDelayMs = Math.min(restartDelayMs * 2, 30000);
    setTimeout(() => {
      void startJimboHub();
    }, nextDelay);
  });

  return child;
}

export async function startJimboHub(): Promise<ChildProcess | null> {
  if (jimboHubShuttingDown) return null;
  const hubDir = path.join(app.getAppPath(), "JIMBO_agent_HUB");
  const envPath = path.join(hubDir, ".env");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠️ JIMBO Hub: missing .env — skip autostart");
    return null;
  }

  const alreadyRunning = await isPortBusy(4224);
  if (alreadyRunning) {
    console.log("✅ JIMBO Hub already running on :4224");
    return null;
  }

  jimboHubProcess = spawnHub(hubDir);
  restartDelayMs = 1000;
  return jimboHubProcess;
}

export function stopJimboHub(): void {
  jimboHubShuttingDown = true;
  if (!jimboHubProcess) return;
  jimboHubProcess.removeAllListeners("exit");
  jimboHubProcess.kill();
  jimboHubProcess = null;
}
