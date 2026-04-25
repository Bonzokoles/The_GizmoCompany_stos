/**
 * GooseBridge — zarządza procesem Goose CLI jako subprocess
 *
 * Goose: E:\Programs\goose\goose.exe (v1.28.0 CLI) | Desktop: U:\Goose-1.29.1 (goose-server 1.29.1)
 * Config: C:\Users\Bonzo2\AppData\Roaming\Block\goose\config\config.yaml
 * Provider: openrouter / anthropic/claude-3-5-haiku
 *
 * Session persistence:
 *   Każdy task używa --name <sessionName> --resume (od 2. taska)
 *   dzięki czemu Goose pamięta kontekst między restartami huba.
 */

import { spawn, type ChildProcess } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import os from "os";
import { EventEmitter } from "events";

// Katalog sesji Goose: %APPDATA%\Block\goose\sessions\ (Windows)
const GOOSE_SESSIONS_DIR = join(
  process.env.APPDATA ?? join(os.homedir(), "AppData", "Roaming"),
  "Block",
  "goose",
  "sessions",
);

/**
 * Sprawdza czy sesja Goose istnieje na dysku.
 * Goose zapisuje sesje jako <name>.jsonl w GOOSE_SESSIONS_DIR.
 */
function sessionExists(name: string): boolean {
  if (!existsSync(GOOSE_SESSIONS_DIR)) return false;
  try {
    const files = readdirSync(GOOSE_SESSIONS_DIR);
    return files.some((f) => f === `${name}.jsonl` || f.startsWith(`${name}_`));
  } catch {
    return false;
  }
}

export interface GooseTask {
  id: string;
  instructions: string;
  workdir?: string;
  sessionName?: string; // jeśli podane — używa tej sesji zamiast domyślnej
  maxTurns?: number; // limit iteracji (default: 20)
}

export interface GooseResult {
  taskId: string;
  output: string;
  exitCode: number;
  durationMs: number;
}

export class GooseBridge extends EventEmitter {
  private goosePath: string;
  private activeProcesses = new Map<string, ChildProcess>();

  /** Nazwa bieżącej sesji persistentnej (np. 'jimbo-hub') */
  private persistentSession: string | null = null;
  /** Ile tasków zostało uruchomionych w tej sesji */
  private sessionTaskCount = 0;

  constructor(goosePath: string) {
    super();
    this.goosePath = goosePath;

    if (!existsSync(goosePath)) {
      console.warn(
        `[GooseBridge] UWAGA: Goose nie znaleziony pod: ${goosePath}`,
      );
      console.warn(`[GooseBridge] Sprawdź GOOSE_PATH w .env`);
    } else {
      console.log(`[GooseBridge] Goose znaleziony: ${goosePath}`);
    }
  }

  /**
   * Inicjalizuje sesję persistentną.
   * Wywołaj raz przy starcie huba z zapamiętaną nazwą sesji.
   * Jeśli sessionName to null — nowa sesja zostanie utworzona przy pierwszym tasku.
   */
  initSession(sessionName: string | null, taskCount = 0) {
    if (sessionName && taskCount > 0) {
      // Waliduj czy plik sesji Goose faktycznie istnieje na dysku
      if (sessionExists(sessionName)) {
        this.persistentSession = sessionName;
        this.sessionTaskCount = taskCount;
        console.log(
          `[GooseBridge] Resuming session: ${sessionName} (${taskCount} poprzednich tasków)`,
        );
      } else {
        // Sesja w hub-state.json ale brak pliku — zacznij od nowa
        console.warn(
          `[GooseBridge] Sesja "${sessionName}" nie istnieje na dysku — nowa sesja przy następnym tasku`,
        );
        this.persistentSession = null;
        this.sessionTaskCount = 0;
      }
    } else {
      this.persistentSession = sessionName;
      this.sessionTaskCount = taskCount;
      if (sessionName) {
        console.log(
          `[GooseBridge] Resuming session: ${sessionName} (${taskCount} poprzednich tasków)`,
        );
      }
    }
  }

  /** Zwraca aktualną nazwę sesji */
  getSessionName(): string | null {
    return this.persistentSession;
  }

  /** Zwraca liczbę tasków w sesji */
  getSessionTaskCount(): number {
    return this.sessionTaskCount;
  }

  /**
   * Uruchamia task przez `goose run --text "<instructions>"`
   * Z session persistence: --name <session> [--resume jeśli nie pierwsza]
   */
  async runTask(task: GooseTask): Promise<GooseResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = "";

      // Session name: task override → persistent session → nowa sesja
      const sessionName =
        task.sessionName ?? this.persistentSession ?? `jimbo-${Date.now()}`;
      const isResume = this.sessionTaskCount > 0 && task.sessionName == null;

      // Przy pierwszym tasku w sesji — inicjalizuj session name
      if (this.persistentSession == null && task.sessionName == null) {
        this.persistentSession = sessionName;
        this.emit("session:created", { sessionName });
        console.log(`[GooseBridge] Nowa sesja: ${sessionName}`);
      }

      const args = [
        "run",
        "--name",
        sessionName,
        "--text",
        task.instructions,
        "--quiet", // usuwa ANSI/UI dekoracje ze stdout
        "--output-format",
        "text", // czysty tekst (nie JSON)
        "--max-turns",
        String(task.maxTurns ?? 20), // zabezpieczenie przed pętlą
      ];
      if (isResume) args.push("--resume");

      console.log(
        `[GooseBridge] task=${task.id} session=${sessionName} resume=${isResume}`,
      );

      const proc = spawn(this.goosePath, args, {
        cwd: task.workdir ?? process.cwd(),
        env: { ...process.env },
        shell: false,
      });

      this.activeProcesses.set(task.id, proc);

      proc.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        this.emit("chunk", { taskId: task.id, text });
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        // Goose pisze postęp na stderr — traktujemy jako info
        this.emit("chunk", { taskId: task.id, text, isStderr: true });
      });

      proc.on("close", (code) => {
        this.activeProcesses.delete(task.id);
        if (task.sessionName == null) this.sessionTaskCount++;
        const result: GooseResult = {
          taskId: task.id,
          output,
          exitCode: code ?? 0,
          durationMs: Date.now() - startTime,
        };
        this.emit("done", result);
        resolve(result);
      });

      proc.on("error", (err) => {
        this.activeProcesses.delete(task.id);
        this.emit("error", { taskId: task.id, error: err.message });
        reject(err);
      });
    });
  }

  /** Zatrzymuje aktywny task */
  killTask(taskId: string): boolean {
    const proc = this.activeProcesses.get(taskId);
    if (proc) {
      proc.kill("SIGTERM");
      this.activeProcesses.delete(taskId);
      return true;
    }
    return false;
  }

  /** Zwraca listę aktywnych tasków */
  getActiveTasks(): string[] {
    return Array.from(this.activeProcesses.keys());
  }

  /** Sprawdza czy Goose jest dostępny */
  isAvailable(): boolean {
    return existsSync(this.goosePath);
  }

  /** Reset sesji — następny task zacznie nową sesję */
  resetSession(): string | null {
    const old = this.persistentSession;
    this.persistentSession = null;
    this.sessionTaskCount = 0;
    console.log(`[GooseBridge] Sesja zresetowana (poprzednia: ${old})`);
    return old;
  }
}
