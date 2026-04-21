/**
 * Workflow Engine — multi-step browser automation (main process)
 *
 * Supports sequential step execution with typed handlers,
 * retry logic, per-step timeouts, and event-based progress reporting.
 */

import { EventEmitter } from 'events';

/* ─── Types ─── */

export type StepType =
  | 'open-tab'
  | 'navigate'
  | 'scrape'
  | 'extract'
  | 'wait'
  | 'click'
  | 'fill-form'
  | 'export'
  | 'custom';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, unknown>;
  /** IDs of steps that must complete before this step runs */
  dependsOn?: string[];
  retryCount?: number;
  /** Per-step timeout in ms */
  timeout?: number;
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  steps: StepExecution[];
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: string;
  endTime?: string;
  results: Record<string, unknown>;
}

export type StepHandler = (step: WorkflowStep, ctx: WorkflowRunContext) => Promise<unknown>;

export interface WorkflowRunContext {
  previousResults: Record<string, unknown>;
  browserManager?: unknown;
}

/* ─── Class ─── */

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowStep[]> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private handlers: Map<StepType, StepHandler> = new Map();
  private browserManager: unknown;

  constructor(browserManager?: unknown) {
    super();
    this.browserManager = browserManager;
    this.registerDefaults();
  }

  /* ─── Default handlers ─── */

  private registerDefaults(): void {
    this.registerStepHandler('wait', async (step) => {
      const ms = Math.min(Math.max(Number(step.config.duration) || 1000, 0), 60_000);
      await new Promise((r) => setTimeout(r, ms));
      return { waited: ms };
    });

    this.registerStepHandler('open-tab', async (step, ctx) => {
      const bm = ctx.browserManager as any;
      if (!bm?.createTab) return { error: 'no browserManager' };
      const tab = bm.createTab(step.config.url as string | undefined);
      return { tab };
    });

    this.registerStepHandler('navigate', async (step, ctx) => {
      const bm = ctx.browserManager as any;
      if (!bm?.navigate) return { error: 'no browserManager' };
      const ok = bm.navigate(step.config.tabId as string, step.config.url as string);
      return { navigated: ok };
    });
  }

  /* ─── Public API ─── */

  registerStepHandler(type: StepType, handler: StepHandler): void {
    this.handlers.set(type, handler);
  }

  createWorkflow(id: string, steps: WorkflowStep[]): string {
    this.workflows.set(id, steps);
    this.emit('workflow-created', { id, stepCount: steps.length });
    return id;
  }

  getWorkflow(id: string): WorkflowStep[] | undefined {
    return this.workflows.get(id);
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }

  async executeWorkflow(workflowId: string): Promise<WorkflowExecution> {
    const steps = this.workflows.get(workflowId);
    if (!steps) throw new Error(`Workflow not found: ${workflowId}`);

    const execId = `exec-${Date.now()}`;
    const exec: WorkflowExecution = {
      id: execId,
      workflowId,
      steps: steps.map((s) => ({ stepId: s.id, status: 'pending' })),
      status: 'running',
      startTime: new Date().toISOString(),
      results: {},
    };
    this.executions.set(execId, exec);
    this.emit('workflow-started', { executionId: execId, workflowId });

    try {
      for (const step of steps) {
        const se = exec.steps.find((s) => s.stepId === step.id)!;

        // Check dependencies
        if (step.dependsOn?.length) {
          const allDone = step.dependsOn.every((dep) => {
            const depExec = exec.steps.find((s) => s.stepId === dep);
            return depExec?.status === 'completed';
          });
          if (!allDone) {
            se.status = 'skipped';
            continue;
          }
        }

        se.status = 'running';
        const handler = this.handlers.get(step.type);

        if (!handler) {
          se.status = 'failed';
          se.error = `No handler for step type: ${step.type}`;
          exec.status = 'failed';
          break;
        }

        const start = Date.now();
        let attempts = 0;
        const maxAttempts = (step.retryCount ?? 0) + 1;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const result = await this.withTimeout(
              handler(step, { previousResults: exec.results, browserManager: this.browserManager }),
              step.timeout ?? 30_000,
            );
            se.result = result;
            se.status = 'completed';
            se.duration = Date.now() - start;
            exec.results[step.id] = result;
            this.emit('step-completed', { executionId: execId, stepId: step.id, result });
            break;
          } catch (err: unknown) {
            if (attempts >= maxAttempts) {
              se.status = 'failed';
              se.error = err instanceof Error ? err.message : String(err);
              se.duration = Date.now() - start;
              exec.status = 'failed';
              this.emit('step-failed', { executionId: execId, stepId: step.id, error: se.error });
            }
          }
        }

        if (exec.status === 'failed') break;
      }

      if (exec.status === 'running') {
        exec.status = 'completed';
      }
    } catch (err: unknown) {
      exec.status = 'failed';
    }

    exec.endTime = new Date().toISOString();
    this.emit(exec.status === 'completed' ? 'workflow-completed' : 'workflow-failed', {
      executionId: execId,
      workflowId,
    });
    return exec;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /* ─── Helpers ─── */

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Step timed out after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }
}
