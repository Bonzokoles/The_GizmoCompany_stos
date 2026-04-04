/**
 * useJimboCopilotActions
 *
 * Rejestruje akcje CopilotKit dla JIMBO Agent Hub (localhost:4224).
 * Hook musi być wywołany wewnątrz komponentu opakowanego przez <CopilotKit>.
 *
 * Kategorie akcji:
 *   - Chat       (wysyłanie wiadomości do agenta przez /chat)
 *   - Zadania    (uruchamianie Goose task runner przez /agent/run)
 *   - Agenci     (lista agentów, zmiana aktywnego)
 *   - Skills     (lista, wyszukiwanie, szczegóły skilla)
 *   - Podman     (lista kontenerów, start/stop)
 *   - Hub        (status połączenia, model, sesja)
 */

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';

const HUB = 'http://localhost:4224';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface JimboCopilotHandlers {
  /** Czy hub jest online (przekazywane z AgentHubPanel) */
  hubOnline:        boolean;
  hubModel:         string;
  sessionName:      string | null;
  activeAgentName:  string | null;
  /** Callback — wyślij tekst do chat panelu w AgentHubPanel */
  sendToChat?:      (text: string) => void;
  /** Callback — wyślij tekst do task runner w AgentHubPanel */
  sendToTask?:      (text: string) => void;
  /** Callback — przełącz zakładkę w prawym panelu */
  setRightTab?:     (tab: 'tasks' | 'skills' | 'podman' | 'graph') => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function hubPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${HUB}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hub ${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function hubGet<T>(path: string): Promise<T> {
  const res = await fetch(`${HUB}${path}`);
  if (!res.ok) throw new Error(`Hub GET ${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useJimboCopilotActions(h: JimboCopilotHandlers) {

  // ── Kontekst widoczny dla AI ─────────────────────────────────────────────

  useCopilotReadable({
    description: 'Status JIMBO Agent Hub — połączenie, model i aktywna sesja',
    value: {
      hubOnline:       h.hubOnline,
      hubModel:        h.hubModel,
      sessionName:     h.sessionName,
      activeAgentName: h.activeAgentName,
    },
  });

  // ── Chat ─────────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'jimbo_chat',
    description:
      'Wysyła wiadomość do aktywnego agenta JIMBO i zwraca odpowiedź. ' +
      'Używaj do zadawania pytań agentowi, zlecania zadań lub prowadzenia rozmowy.',
    parameters: [
      {
        name:        'message',
        type:        'string',
        description: 'Treść wiadomości do agenta',
        required:    true,
      },
    ],
    handler: async ({ message }: { message: string }) => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline. Uruchom go poleceniem: cd JIMBO_agent_HUB && npm start';
      try {
        const data = await hubPost<{ reply?: string; text?: string }>('/chat', { message });
        const reply = data.reply ?? data.text ?? 'Brak odpowiedzi';
        h.sendToChat?.(message);
        return reply;
      } catch (e) {
        return `Błąd chatu: ${(e as Error).message}`;
      }
    },
  });

  // ── Task runner (Goose) ───────────────────────────────────────────────────

  useCopilotAction({
    name: 'jimbo_run_task',
    description:
      'Uruchamia zadanie w Goose task runner wewnątrz JIMBO Hub. ' +
      'Goose może wykonywać komendy shell, edytować pliki, uruchamiać skrypty. ' +
      'Używaj do automatyzacji, generowania kodu lub deploymentu.',
    parameters: [
      {
        name:        'instructions',
        type:        'string',
        description: 'Pełne instrukcje dla Goose — co ma zrobić',
        required:    true,
      },
    ],
    handler: async ({ instructions }: { instructions: string }) => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline.';
      try {
        h.setRightTab?.('tasks');
        h.sendToTask?.(instructions);
        const data = await hubPost<{ taskId?: string; status?: string }>('/agent/run', { instructions });
        return `Zadanie uruchomione (ID: ${data.taskId ?? 'n/a'}). Sprawdź zakładkę Tasks w AgentHubPanel.`;
      } catch (e) {
        return `Błąd task runnera: ${(e as Error).message}`;
      }
    },
  });

  // ── Agenci ───────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'jimbo_list_agents',
    description: 'Zwraca listę dostępnych agentów JIMBO z ich nazwami i opisami.',
    parameters: [],
    handler: async () => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline.';
      try {
        const agents = await hubGet<Array<{ id: string; name: string; description: string }>>('/agents');
        if (!agents.length) return 'Brak zarejestrowanych agentów.';
        return agents.map(a => `• ${a.name}: ${a.description}`).join('\n');
      } catch (e) {
        return `Błąd pobierania agentów: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: 'jimbo_switch_agent',
    description: 'Przełącza aktywnego agenta JIMBO po nazwie lub ID.',
    parameters: [
      {
        name:        'agentNameOrId',
        type:        'string',
        description: 'Nazwa lub ID agenta do aktywowania',
        required:    true,
      },
    ],
    handler: async ({ agentNameOrId }: { agentNameOrId: string }) => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline.';
      try {
        const data = await hubPost<{ success: boolean; agentName?: string }>('/agents/switch', { agentNameOrId });
        return data.success
          ? `Aktywny agent: ${data.agentName ?? agentNameOrId}`
          : 'Nie znaleziono agenta.';
      } catch (e) {
        return `Błąd przełączania agenta: ${(e as Error).message}`;
      }
    },
  });

  // ── Skills ───────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'jimbo_list_skills',
    description: 'Zwraca listę dostępnych skillów JIMBO z tagami i opisami.',
    parameters: [
      {
        name:        'search',
        type:        'string',
        description: 'Opcjonalna fraza do filtrowania skillów',
        required:    false,
      },
    ],
    handler: async ({ search }: { search?: string }) => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline.';
      try {
        const url = search ? `/skills?q=${encodeURIComponent(search)}` : '/skills';
        const skills = await hubGet<Array<{ id: string; name: string; description: string; tags?: string[] }>>(url);
        if (!skills.length) return 'Brak skillów' + (search ? ` pasujących do "${search}"` : '') + '.';
        h.setRightTab?.('skills');
        return skills
          .map(s => `• ${s.name}${s.tags?.length ? ` [${s.tags.join(', ')}]` : ''}: ${s.description}`)
          .join('\n');
      } catch (e) {
        return `Błąd pobierania skillów: ${(e as Error).message}`;
      }
    },
  });

  // ── Podman ───────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'jimbo_list_containers',
    description: 'Wyświetla listę kontenerów Podman zarządzanych przez JIMBO Hub z ich statusem.',
    parameters: [],
    handler: async () => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline.';
      try {
        h.setRightTab?.('podman');
        const containers = await hubGet<Array<{ name: string; image: string; status: string; state: string }>>('/podman/containers');
        if (!containers.length) return 'Brak kontenerów.';
        return containers
          .map(c => `• ${c.name} (${c.image}) — ${c.state}`)
          .join('\n');
      } catch (e) {
        return `Błąd Podman: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: 'jimbo_container_action',
    description: 'Uruchamia lub zatrzymuje kontener Podman zarządzany przez JIMBO Hub.',
    parameters: [
      {
        name:        'containerName',
        type:        'string',
        description: 'Nazwa kontenera',
        required:    true,
      },
      {
        name:        'action',
        type:        'string',
        description: 'Akcja: "start" lub "stop"',
        required:    true,
      },
    ],
    handler: async ({ containerName, action }: { containerName: string; action: string }) => {
      if (!h.hubOnline) return 'JIMBO Hub jest offline.';
      if (action !== 'start' && action !== 'stop') return 'Akcja musi być "start" lub "stop".';
      try {
        const data = await hubPost<{ success: boolean; message?: string }>(
          `/podman/containers/${encodeURIComponent(containerName)}/${action}`,
          {}
        );
        return data.message ?? (data.success ? `Kontener ${containerName} — ${action} OK` : 'Operacja nieudana.');
      } catch (e) {
        return `Błąd operacji na kontenerze: ${(e as Error).message}`;
      }
    },
  });

  // ── Hub info ─────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'jimbo_hub_status',
    description: 'Sprawdza status połączenia z JIMBO Hub i zwraca informacje o aktywnej sesji, modelu i agentach.',
    parameters: [],
    handler: async () => {
      if (!h.hubOnline) {
        return [
          'JIMBO Hub jest OFFLINE.',
          'Uruchom: cd JIMBO_agent_HUB && npm start',
          'Domyślny port: 4224',
        ].join('\n');
      }
      return [
        `✅ JIMBO Hub: ONLINE`,
        `Model: ${h.hubModel || 'nieznany'}`,
        `Sesja: ${h.sessionName ?? 'brak aktywnej sesji'}`,
        `Aktywny agent: ${h.activeAgentName ?? 'brak'}`,
      ].join('\n');
    },
  });
}
