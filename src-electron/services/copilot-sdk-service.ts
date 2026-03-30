/**
 * Copilot SDK Service
 * Project-scoped adapter for GitHub Copilot SDK in Electron main process
 */

import { approveAll, CopilotClient } from '@github/copilot-sdk';

export interface CopilotSdkStatus {
  configured: boolean;
  connected: boolean;
  cliPath: string;
  state: string;
}

export interface CopilotSdkPromptRequest {
  prompt: string;
  model?: string;
  cwd?: string;
}

export interface CopilotSdkPromptResponse {
  success: boolean;
  sessionId?: string;
  response?: string;
  model?: string;
  error?: string;
}

export class CopilotSdkService {
  private client: CopilotClient | null = null;
  private readonly cliPath: string;
  private readonly workspaceRoot: string;
  private readonly configDir: string;
  private readonly skillDirectories: string[];

  constructor() {
    this.cliPath = process.env.COPILOT_CLI_PATH || 'copilot';
    this.workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    this.configDir = process.env.COPILOT_CONFIG_DIR || `${this.workspaceRoot}\\.workspace_meta\\copilot`;
    this.skillDirectories = [`${this.workspaceRoot}\\.github\\skills`];
  }

  private ensureClient(): CopilotClient {
    if (!this.client) {
      this.client = new CopilotClient({
        cliPath: this.cliPath,
        logLevel: 'info',
      });
    }

    return this.client;
  }

  async getStatus(): Promise<CopilotSdkStatus> {
    try {
      const client = this.ensureClient();
      const state = client.getState();

      return {
        configured: true,
        connected: state === 'connected',
        cliPath: this.cliPath,
        state,
      };
    } catch (error) {
      return {
        configured: false,
        connected: false,
        cliPath: this.cliPath,
        state: `error: ${error instanceof Error ? error.message : 'CLI not found'}`,
      };
    }
  }

  async start(): Promise<CopilotSdkStatus> {
    try {
      const client = this.ensureClient();

      if (client.getState() !== 'connected') {
        await client.start();
      }

      return this.getStatus();
    } catch (error) {
      return {
        configured: false,
        connected: false,
        cliPath: this.cliPath,
        state: `start_failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async stop(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.stop();
  }

  async runPrompt(request: CopilotSdkPromptRequest): Promise<CopilotSdkPromptResponse> {
    if (!request.prompt?.trim()) {
      return {
        success: false,
        error: 'Prompt is required',
      };
    }

    try {
      const client = this.ensureClient();

      if (client.getState() !== 'connected') {
        await client.start();
      }

      const session = await client.createSession({
        model: request.model || 'gpt-5',
        clientName: 'zeno-browser-electron',
        configDir: this.configDir,
        workingDirectory: request.cwd || this.workspaceRoot,
        skillDirectories: this.skillDirectories,
        onPermissionRequest: approveAll,
      });

      try {
        const result = await session.sendAndWait({
          prompt: request.prompt,
        }, 120000);

        return {
          success: true,
          sessionId: session.sessionId,
          response: result?.data?.content || '',
          model: request.model || 'gpt-5',
        };
      } finally {
        await session.disconnect();
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
