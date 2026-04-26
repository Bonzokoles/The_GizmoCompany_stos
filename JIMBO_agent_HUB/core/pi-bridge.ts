import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JIMBOKIT_COMMS_PATH = path.resolve(__dirname, "..", "..", "JIMBOKIT_COMMS");
const JIMBOKIT_COMMS_TASKS = path.join(JIMBOKIT_COMMS_PATH, "tasks");
const JIMBOKIT_COMMS_RESULTS = path.join(JIMBOKIT_COMMS_PATH, "results");

export interface PiTask {
  id: string;
  type: string;
  payload: unknown;
  priority: "low" | "medium" | "high";
  timestamp: number;
}

export interface TaskResult {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed" | "dispatched";
  result?: unknown;
  error?: string;
  timestamp: number;
}

function isPiTask(value: unknown): value is PiTask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const task = value as Partial<PiTask>;
  return (
    typeof task.id === "string" &&
    typeof task.type === "string" &&
    (task.priority === "low" ||
      task.priority === "medium" ||
      task.priority === "high") &&
    typeof task.timestamp === "number"
  );
}

export class PiBridge {
  private readonly taskResults = new Map<string, TaskResult>();

  constructor() {}

  async receiveTask(task: PiTask): Promise<string> {
    if (!isPiTask(task)) {
      throw new Error("Invalid Pi task payload");
    }

    console.log(`[PiBridge] Received task from Pi: ${task.id}`);

    this.taskResults.set(task.id, {
      taskId: task.id,
      status: "pending",
      timestamp: Date.now(),
    });

    // Nowa lokalizacja: tasks/
    const taskPath = path.join(JIMBOKIT_COMMS_TASKS, `${task.id}.task.json`);
    await fs.writeFile(taskPath, JSON.stringify(task, null, 2), "utf-8");
    console.log(`[PiBridge] Task written to: ${taskPath}`);

    return task.id;
  }

  async getResultForPi(taskId: string): Promise<TaskResult> {
    const cached = this.taskResults.get(taskId);
    if (cached?.status === "completed" || cached?.status === "failed") {
      return cached;
    }

    // Nowa lokalizacja: results/
    let resultPath = path.join(JIMBOKIT_COMMS_RESULTS, `${taskId}.result.json`);
    
    try {
      const content = await fs.readFile(resultPath, "utf-8");
      const result: TaskResult = JSON.parse(content);
      const fullResult = {
         ...cached,
         ...result,
         taskId
      } as TaskResult;
      this.taskResults.set(taskId, fullResult);
      return fullResult;
    } catch (err) {
      // Fallback do starej lokalizacji (root) dla kompatybilności wstecznej
      const oldResultPath = path.join(JIMBOKIT_COMMS_PATH, `${taskId}.result.json`);
      try {
        const content = await fs.readFile(oldResultPath, "utf-8");
        const result: TaskResult = JSON.parse(content);
        const fullResult = {
           ...cached,
           ...result,
           taskId
        } as TaskResult;
        this.taskResults.set(taskId, fullResult);
        console.log(`[PiBridge] Found result in old location: ${oldResultPath}`);
        return fullResult;
      } catch (oldErr) {
        if (cached) return cached;
        throw new Error(`Task ${taskId} not found in new or old location`);
      }
    }
  }

  async getTaskStatus(taskId: string): Promise<TaskResult["status"] | "not_found"> {
    try {
      const res = await this.getResultForPi(taskId);
      return res.status;
    } catch (e) {
      return "not_found";
    }
  }
}
