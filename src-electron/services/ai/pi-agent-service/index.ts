import { ipcMain, type BrowserWindow } from "electron";
import { IPC } from "../../../../src/shared/ipc/channels";
import type { ServiceContainer } from "../../../app/service-container";

const CH = IPC.PI_AGENT;

interface PiAgentSession {
  ptyId: string; // The ID of the PTY session where this Pi agent is running
  // Add any other agent-specific state here
}

// This map would store active Pi agent instances, potentially multiple if supported
const activePiAgents = new Map<string, PiAgentSession>();

export class PiAgentService {
  private container: ServiceContainer;
  private mainWindow!: BrowserWindow;

  constructor(container: ServiceContainer) {
    this.container = container;
  }

  attachWindow(win: BrowserWindow): void {
    this.mainWindow = win;
    // Handlers are registered centrally in ipc/index.ts
  }

  // A method to register all IPC handlers for this service
  registerIpcHandlers(): void {

    // --- pi-agent:get-status ---
    ipcMain.handle(CH.GET_STATUS, (_, ptyId: string) => {
      const session = activePiAgents.get(ptyId);
      // For now, simple check if our internal session exists.
      // A more robust check might involve pinging the actual PTY.
      return { running: !!session };
    });

    // --- pi-agent:list-models ---
    ipcMain.handle(CH.LIST_MODELS, async (_, ptyId: string) => {
      const ptyService = this.container.get<any>("ptyService"); // Access generic PTY service
      if (!ptyService) return { success: false, error: "PTY service not found" };

      const command = "/models"; // Assuming Pi responds to /models command
      const waitFor = "--- END MODELS LIST ---"; // Or some other clear marker

      const result = await ptyService.sendCommandAndWait(ptyId, command, waitFor, 10000);

      if (result.success) {
        // TODO: Implement actual parsing of Pi's output here
        console.log(`[PiAgentService] Raw models output for ${ptyId}:`, result.output);
        const parsedModels = result.output.split(/\r?\n/).filter(line => line.trim().length > 0 && !line.startsWith("/")).map(line => line.trim());
        return { success: true, models: parsedModels };
      } else {
        return { success: false, error: result.error, models: [] };
      }
    });

    // --- pi-agent:list-skills ---
    ipcMain.handle(CH.LIST_SKILLS, async (_, ptyId: string) => {
      const ptyService = this.container.get<any>("ptyService");
      if (!ptyService) return { success: false, error: "PTY service not found" };

      const command = "/skills"; // Assuming Pi responds to /skills command
      const waitFor = "--- END SKILLS LIST ---";

      const result = await ptyService.sendCommandAndWait(ptyId, command, waitFor, 10000);

      if (result.success) {
        // TODO: Implement actual parsing of Pi's output here
        console.log(`[PiAgentService] Raw skills output for ${ptyId}:`, result.output);
        const parsedSkills = result.output.split(/\r?\n/).filter(line => line.trim().length > 0 && !line.startsWith("/")).map(line => line.trim());
        return { success: true, skills: parsedSkills };
      } else {
        return { success: false, error: result.error, skills: [] };
      }
    });

    // --- pi-agent:list-agents ---
    ipcMain.handle(CH.LIST_AGENTS, async (_, ptyId: string) => {
      const ptyService = this.container.get<any>("ptyService");
      if (!ptyService) return { success: false, error: "PTY service not found" };

      const command = "/agents"; // Assuming Pi responds to /agents command
      const waitFor = "--- END AGENTS LIST ---";

      const result = await ptyService.sendCommandAndWait(ptyId, command, waitFor, 10000);

      if (result.success) {
        // TODO: Implement actual parsing of Pi's output here
        console.log(`[PiAgentService] Raw agents output for ${ptyId}:`, result.output);
        const parsedAgents = result.output.split(/\r?\n/).filter(line => line.trim().length > 0 && !line.startsWith("/")).map(line => line.trim());
        return { success: true, agents: parsedAgents };
      } else {
        return { success: false, error: result.error, agents: [] };
      }
    });

    
  }
}

// Helper to access the `pty:send-command-and-wait` from `register-pty.ts`
// This will be registered on `container.get("ptyService")`
export interface IPtyService {
  create: (event: any, cols: number, rows: number, cwd?: string, opts?: { command?: string; args?: string[]; env?: Record<string, string>; windowsHide?: boolean }) => Promise<{ success: boolean; id?: string; error?: string }>;
  kill: (event: any, ptyId: string) => Promise<{ success: boolean; error?: string }>;
  sendCommandAndWait: (ptyId: string, command: string, waitFor?: string, timeoutMs?: number) => Promise<{ success: boolean; output: string; error?: string }>;
}




