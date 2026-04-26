/**
 * JIMBOKIT_COMMS Helper
 * 
 * Funkcje pomocnicze do komunikacji z JIMBOKIT_COMMS:
 * - przez HUB API (nowy sposób, rekomendowany)
 * - przez Electron file API (stary sposób, dla kompatybilności)
 * 
 * FAZA 3: Feature flag pozwala przełączać między trybami
 */

const HUB_URL = 'http://localhost:4224';

export interface CommsTask {
  id: string;
  type: 'data_cleanup' | 'data_analysis' | 'document_processing' | 'file_conversion' | 
        'data_validation' | 'batch_processing' | 'custom';
  source: 'jimbo_kit' | 'agent_pi' | 'buch_chat' | 'ui';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  payload: {
    instruction: string;
    files?: string[];
    context?: string;
    outputFormat?: 'json' | 'csv' | 'txt' | 'markdown' | 'auto';
    metadata?: Record<string, any>;
  };
  timestamp: string;
  timeout?: number;
}

/**
 * Zapisz task przez HUB API (nowy sposób)
 * Używa POST /jimbokit-comms/task z walidacją JSON Schema
 */
export async function writeTaskViaHub(task: CommsTask): Promise<{ ok: boolean; taskId: string; error?: string }> {
  try {
    const response = await fetch(`${HUB_URL}/jimbokit-comms/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });

    if (!response.ok) {
      const error = await response.json();
      return { ok: false, taskId: task.id, error: error.error || error.details || 'Unknown error' };
    }

    const result = await response.json();
    return { ok: true, taskId: result.taskId };
  } catch (err) {
    return { ok: false, taskId: task.id, error: String(err) };
  }
}

/**
 * Zapisz task przez Electron file API (stary sposób)
 * Zapisuje markdown do JIMBOKIT_COMMS root
 */
export async function writeTaskViaElectron(
  agentName: string, 
  content: string,
  commsDir: string = 'U:/WWW_Zen_BRo_wser_org3/JIMBOKIT_COMMS'
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const isElectron = !!(window as Window & { electronAPI?: unknown }).electronAPI;
  
  if (!isElectron) {
    return { ok: false, error: 'Not in Electron environment' };
  }

  const ts = new Date()
    .toISOString()
    .slice(0, 19)
    .replace('T', '_')
    .replace(/:/g, '-');
  
  const filePath = `${commsDir}/${agentName}_task_${ts}.md`;
  const md = `# Zadanie → ${agentName}\n> Wystawione przez: Pi Agent | ${new Date().toLocaleString('pl-PL')}\n\n${content}\n`;

  try {
    const res = await (window as any).electronAPI?.file?.write?.(filePath, md);
    return {
      ok: res?.success ?? false,
      path: res?.success ? filePath : undefined,
      error: res?.error
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Uniwersalna funkcja - automatycznie wybiera metodę na podstawie feature flag
 * @param method - 'hub' (nowy) lub 'electron' (stary)
 */
export async function writeTask(
  taskOrContent: CommsTask | string,
  method: 'hub' | 'electron' = 'hub',
  agentName?: string
): Promise<{ ok: boolean; taskId?: string; path?: string; error?: string }> {
  
  if (method === 'hub' && typeof taskOrContent !== 'string') {
    return writeTaskViaHub(taskOrContent);
  }
  
  if (method === 'electron' && typeof taskOrContent === 'string' && agentName) {
    return writeTaskViaElectron(agentName, taskOrContent);
  }
  
  return { ok: false, error: 'Invalid arguments for writeTask' };
}

/**
 * Utwórz task object z prostych parametrów
 * Helper do łatwego tworzenia tasków dla HUB API
 */
export function createTask(
  instruction: string,
  options?: {
    type?: CommsTask['type'];
    priority?: CommsTask['priority'];
    files?: string[];
    context?: string;
    metadata?: Record<string, any>;
  }
): CommsTask {
  return {
    id: crypto.randomUUID(),
    type: options?.type || 'custom',
    source: 'ui',
    priority: options?.priority || 'medium',
    payload: {
      instruction,
      files: options?.files,
      context: options?.context,
      metadata: options?.metadata
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Pobierz listę pending tasków z HUB
 */
export async function getPendingTasks(): Promise<CommsTask[]> {
  try {
    const response = await fetch(`${HUB_URL}/jimbokit-comms/tasks`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.tasks || [];
  } catch {
    return [];
  }
}

/**
 * Sprawdź czy HUB API jest dostępny
 */
export async function checkHubAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${HUB_URL}/status`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
