import { ipcRenderer } from "electron";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.HUB;

export const knowledgeHubAPI = {
  autoRegister: () =>
    ipcRenderer.invoke(CH.AUTO_REGISTER),

  getStats: () =>
    ipcRenderer.invoke(CH.GET_STATS),

  getTopics: () =>
    ipcRenderer.invoke(CH.GET_TOPICS),

  getTopicFiles: (topicId: string, limit?: number) =>
    ipcRenderer.invoke(CH.GET_TOPIC_FILES, topicId, limit),

  getAgents: () =>
    ipcRenderer.invoke(CH.GET_AGENTS),

  createAgent: (agent: unknown) =>
    ipcRenderer.invoke(CH.CREATE_AGENT, agent),

  getCloudResources: () =>
    ipcRenderer.invoke(CH.GET_CLOUD_RESOURCES),

  searchKnowledge: (query: string, topicId?: string) =>
    ipcRenderer.invoke(CH.SEARCH_KNOWLEDGE, query, topicId),
} as const;
