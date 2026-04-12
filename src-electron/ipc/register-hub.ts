import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import {
  KnowledgeHubService,
  type AgentDefinition,
} from "../services/knowledge-hub-service";
import { isValidString } from "../utils/validate-url";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.HUB;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerHub(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const knowledgeHubService = container.get<KnowledgeHubService>(
    "knowledgeHubService",
  );

  ipcMain.handle(CH.AUTO_REGISTER, async () => {
    try {
      return {
        success: true,
        data: await knowledgeHubService.autoRegisterHubLibraries(),
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });
  ipcMain.handle(CH.GET_STATS, async () => knowledgeHubService.getHubStats());
  ipcMain.handle(CH.GET_TOPICS, async () =>
    knowledgeHubService.getKnowledgeTopics(),
  );
  ipcMain.handle(
    CH.GET_TOPIC_FILES,
    async (_, topicId: string, limit?: number) => {
      if (!isValidString(topicId)) return [];
      return knowledgeHubService.readTopicFiles(topicId, limit);
    },
  );
  ipcMain.handle(CH.GET_AGENTS, async () =>
    knowledgeHubService.getAgentDefinitions(),
  );
  ipcMain.handle(CH.CREATE_AGENT, async (_, agent: AgentDefinition) => {
    if (!agent || !isValidString(agent.id) || !isValidString(agent.name)) {
      return { success: false, error: "Nieprawidłowe dane agenta" };
    }
    try {
      return { success: true, data: knowledgeHubService.createAgent(agent) };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });
  ipcMain.handle(CH.GET_CLOUD_RESOURCES, async () =>
    knowledgeHubService.getCloudResources(),
  );
  ipcMain.handle(
    CH.SEARCH_KNOWLEDGE,
    async (_, query: string, topicId?: string) => {
      if (!isValidString(query))
        return { success: false, error: "Puste zapytanie" };
      try {
        return {
          success: true,
          data: knowledgeHubService.searchKnowledge(query, topicId),
        };
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
  );
}
