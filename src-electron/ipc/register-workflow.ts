import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { WorkflowEngine, type WorkflowStep } from "../services/ai";
import { isValidString } from "../utils/validate-url";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.WORKFLOW;

export function registerWorkflow(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const workflowEngine = container.get<WorkflowEngine>("workflowEngine");

  ipcMain.handle(CH.CREATE, async (_, id: string, steps: WorkflowStep[]) => {
    if (!isValidString(id) || !Array.isArray(steps)) return null;
    return workflowEngine.createWorkflow(id, steps);
  });
  ipcMain.handle(CH.EXECUTE, async (_, workflowId: string) => {
    if (!isValidString(workflowId)) return null;
    return workflowEngine.executeWorkflow(workflowId);
  });
  ipcMain.handle(CH.GET_EXECUTION, async (_, executionId: string) => {
    if (!isValidString(executionId)) return null;
    return workflowEngine.getExecution(executionId);
  });
  ipcMain.handle(CH.LIST, async () => workflowEngine.listWorkflows());
  ipcMain.handle(CH.LIST_EXECUTIONS, async () =>
    workflowEngine.listExecutions(),
  );
}
