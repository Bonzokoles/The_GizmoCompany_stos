export interface AgentConfig {
  id: string;
  role: string;
  version: string;
  author: string;
  systemPrompt: string;
  modelId: string;
  toolIds: string[];
  capabilities: string[];
}

export const agents: AgentConfig[] = [
  {
    id: 'planner',
    role: 'Project Planner',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are a project planner. Your job is to break down a complex task into a series of smaller, manageable steps. Provide a clear, ordered list of steps to be taken.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['file_read', 'file_write'],
    capabilities: ['task-decomposition', 'step-by-step-planning', 'resource-allocation', 'timeline-estimation', 'risk-assessment'],
  },
];