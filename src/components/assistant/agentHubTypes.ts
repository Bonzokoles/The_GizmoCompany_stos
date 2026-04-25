/* ── Shared types for AgentHubPanel and sub-components ── */

export interface AgentEntry { id: string; name: string; description: string; }

export interface SkillEntry {
  id: string; name: string; description: string; code?: string;
  tags?: string[]; namespace?: string; successCount?: number; failureCount?: number;
}

export interface ContainerInfo {
  id: string; name: string; image: string;
  status: string; state: 'running' | 'stopped' | 'paused' | 'error' | 'unknown';
  ports: string; namespace: string;
}

export interface NamespaceInfo { all: string[]; active: string[]; counts: Record<string, number>; }

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  streaming?: boolean;
}

export interface TaskLine { text: string; isStderr?: boolean; ts: number; }

export interface TaskEntry {
  id: string;
  instructions: string;
  lines: TaskLine[];
  status: 'running' | 'done' | 'error';
  durationMs?: number;
  collapsed?: boolean;
  reflexionScore?: number;
  reflexionVerdict?: string;
  reflexionImprovement?: string;
  retryNum?: number;
  maxRetries?: number;
}

export interface GooseSessionMeta {
  id: string; name: string; workingDir: string;
  createdAt: string; updatedAt: string; msgCount: number; provider: string | null;
}

export interface PolaczekAgent {
  id: string; icon?: string; description: string; model: string;
  status: string; tags: string[]; accepts_image?: boolean;
}

export interface FileReport {
  summary: string; insights: string[]; fileType: string;
  tags: string[]; actionItems: string[]; rawOutput: string;
}

export interface ScanResult {
  dir: string; scanned: number; cataloged: number;
  catalog: Array<{ path: string; type: string; ext: string; description: string }>;
}

export interface FileCatalogEntry { id: string; path: string; description: string; tags: string[]; }
