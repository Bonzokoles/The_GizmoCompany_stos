import { EventEmitter } from "node:events";
import { watch, type FSWatcher, promises as fs } from "node:fs";
import path from "node:path";

import type { PiTask, TaskResult } from "./pi-bridge.js";

const JIMBOKIT_COMMS_PATH = "U:\\WWW_Zen_BRo_wser_org3\\JIMBOKIT_COMMS";

type AuthorizedCaller = "pi-bridge" | "jimbo-kit";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function extractJsonBlock(content: string): string | null {
  const match = content.match(/```json\r?\n([\s\S]+?)\r?\n```/);
  return match?.[1] ?? null;
}

function formatTaskMarkdown(task: PiTask, caller: AuthorizedCaller): string {
  return `# Task ${task.id}

**Type**: ${task.type}
**Priority**: ${task.priority}
**Timestamp**: ${new Date(task.timestamp).toISOString()}

## Payload

\`\`\`json
${JSON.stringify(task, null, 2)}
\`\`\`

---
*Created by ${caller}*
`;
}

export class JIMBOKitCommsManager extends EventEmitter<{
  resultReady: [TaskResult];
}> {
  private readonly authorizedCallers = new Set<AuthorizedCaller>([
    "pi-bridge",
    "jimbo-kit",
  ]);
  private watcher?: FSWatcher;
  private readonly observedMtimes = new Map<string, number>();

  constructor() {
    super();
    void this.ensureDirectory().then(() => this.startWatcher());
  }

  async writeTask(task: PiTask, caller: AuthorizedCaller): Promise<string> {
    this.assertCaller(caller);
    await this.ensureDirectory();

    const filename = `${task.id}_task_${Date.now()}.md`;
    const filePath = path.join(JIMBOKIT_COMMS_PATH, filename);

    await fs.writeFile(filePath, formatTaskMarkdown(task, caller), "utf-8");
    console.log(`[JIMBOKitComms] Task written: ${filename}`);
    return filename;
  }

  async readResult(filename: string, caller: AuthorizedCaller): Promise<TaskResult> {
    this.assertCaller(caller);

    const filePath = path.isAbsolute(filename)
      ? filename
      : path.join(JIMBOKIT_COMMS_PATH, filename);
    const content = await fs.readFile(filePath, "utf-8");
    const jsonBlock = extractJsonBlock(content);

    if (!jsonBlock) {
      throw new Error(`No JSON payload found in result file: ${path.basename(filePath)}`);
    }

    const parsed = JSON.parse(jsonBlock) as Partial<TaskResult>;
    if (!parsed.taskId || !parsed.status) {
      throw new Error(`Malformed result payload in ${path.basename(filePath)}`);
    }

    return {
      taskId: parsed.taskId,
      status: parsed.status,
      result: parsed.result,
      error: parsed.error,
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
    };
  }

  async close(): Promise<void> {
    await this.watcher?.close();
  }

  private assertCaller(caller: AuthorizedCaller): void {
    if (!this.authorizedCallers.has(caller)) {
      throw new Error(`Access denied: ${caller} cannot access JIMBOKIT_COMMS`);
    }
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(JIMBOKIT_COMMS_PATH, { recursive: true });
  }

  private startWatcher(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = watch(JIMBOKIT_COMMS_PATH, (_eventType, filename) => {
      if (!filename || !filename.startsWith("result_") || !filename.endsWith(".md")) {
        return;
      }

      void this.handleResultFile(filename);
    });
  }

  private async handleResultFile(filename: string): Promise<void> {
    const filePath = path.join(JIMBOKIT_COMMS_PATH, filename);

    try {
      const stats = await fs.stat(filePath);
      const knownMtime = this.observedMtimes.get(filePath);
      if (knownMtime === stats.mtimeMs) {
        return;
      }
      this.observedMtimes.set(filePath, stats.mtimeMs);

      const result = await this.readResult(filePath, "jimbo-kit");
      console.log(`[JIMBOKitComms] Result detected: ${filename}`);
      this.emit("resultReady", result);
    } catch (error) {
      console.warn(
        `[JIMBOKitComms] Failed to read result ${filename}: ${toErrorMessage(error)}`,
      );
    }
  }
}
