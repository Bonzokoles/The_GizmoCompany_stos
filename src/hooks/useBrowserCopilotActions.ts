/**
 * useBrowserCopilotActions
 *
 * Rejestruje akcje CopilotKit dostępne dla asystenta AI w ZENO Browser.
 * Hook musi być wywołany wewnątrz komponentu opakowanego przez <CopilotKit>.
 *
 * Kategorie akcji:
 *   - Nawigacja (URL, karty, wstecz/dalej)
 *   - Panele  (otwieranie/zamykanie dowolnego panelu po nazwie)
 *   - Agenty  (tworzenie agentów, wyświetlanie kreatora)
 *   - Crawler / wyszukiwanie (konfiguracja silników, uruchamianie crawlera)
 *   - Aplikacja (odczyt stanu, info systemowe)
 */

import { useCopilotAction } from '@copilotkit/react-core';
import type { Tab } from '../types/electron';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BrowserCopilotPanels {
  ai:           (open: boolean) => void;
  security:     (open: boolean) => void;
  tunnel:       (open: boolean) => void;
  plugins:      (open: boolean) => void;
  tools:        (open: boolean) => void;
  gateway:      (open: boolean) => void;
  terminal:     (open: boolean) => void;
  analytics:    (open: boolean) => void;
  search:       (open: boolean) => void;
  catalog:      (open: boolean) => void;
  knowledgeHub: (open: boolean) => void;
  agents:       (open: boolean) => void;
  copilotDev:   (open: boolean) => void;
  sidebar:      (open: boolean) => void;
}

export interface BrowserCopilotHandlers {
  navigate:   (input: string) => void;
  newTab:     () => void;
  closeTab:   (tabId: string) => void;
  goBack:     () => void;
  goForward:  () => void;
  reload:     () => void;
  currentUrl: string;
  tabs:       Tab[];
  setPanels:  BrowserCopilotPanels;
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel name lookup
// ─────────────────────────────────────────────────────────────────────────────

type PanelKey = keyof BrowserCopilotPanels;

const PANEL_ALIASES: Record<string, PanelKey> = {
  ai:            'ai',
  'ai-panel':    'ai',
  security:      'security',
  bezpieczeństwo:'security',
  tunnel:        'tunnel',
  plugins:       'plugins',
  wtyczki:       'plugins',
  tools:         'tools',
  narzędzia:     'tools',
  gateway:       'gateway',
  'ai-gateway':  'gateway',
  terminal:      'terminal',
  analytics:     'analytics',
  statystyki:    'analytics',
  search:        'search',
  wyszukiwanie:  'search',
  catalog:       'catalog',
  katalog:       'catalog',
  knowledge:     'knowledgeHub',
  'knowledge-hub':'knowledgeHub',
  wiedza:        'knowledgeHub',
  agents:        'agents',
  agenci:        'agents',
  copilot:       'copilotDev',
  'copilot-dev': 'copilotDev',
  sidebar:       'sidebar',
  panel:         'sidebar',
};

function resolvePanel(name: string): PanelKey | null {
  const key = name.toLowerCase().trim();
  return PANEL_ALIASES[key] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useBrowserCopilotActions(h: BrowserCopilotHandlers) {
  // ── Nawigacja ────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'navigate_to_url',
    description:
      'Nawiguje przeglądarkę do podanego adresu URL lub wyszukuje frazę w Google. ' +
      'Akceptuje pełne URL (https://...), domeny (example.com) lub frazy do wyszukania.',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Pełny adres URL, domena lub fraza do wyszukania',
        required: true,
      },
    ],
    handler: ({ url }: { url: string }) => {
      h.navigate(url);
      return `Nawiguję do: ${url}`;
    },
  });

  useCopilotAction({
    name: 'open_new_tab',
    description: 'Otwiera nową kartę w przeglądarce (puste okno startowe).',
    parameters: [],
    handler: () => {
      h.newTab();
      return 'Otworzono nową kartę.';
    },
  });

  useCopilotAction({
    name: 'close_tab',
    description: 'Zamyka wskazaną kartę. Jeśli nie podasz ID, asystent zamknie aktywną kartę.',
    parameters: [
      {
        name: 'tab_id',
        type: 'string',
        description: 'ID karty do zamknięcia (np. "tab-2"). Pomiń, aby zamknąć aktywną.',
        required: false,
      },
    ],
    handler: ({ tab_id }: { tab_id?: string }) => {
      const active = h.tabs.find(t => t.isActive);
      const target = tab_id ?? active?.id;
      if (!target) return 'Brak aktywnej karty do zamknięcia.';
      h.closeTab(target);
      return `Zamknięto kartę: ${target}`;
    },
  });

  useCopilotAction({
    name: 'go_back',
    description: 'Cofa do poprzedniej strony w aktywnej karcie (jak przycisk Wstecz).',
    parameters: [],
    handler: () => { h.goBack(); return 'Cofam do poprzedniej strony.'; },
  });

  useCopilotAction({
    name: 'go_forward',
    description: 'Przechodzi do następnej strony w historii aktywnej karty.',
    parameters: [],
    handler: () => { h.goForward(); return 'Przechodzę do następnej strony.'; },
  });

  useCopilotAction({
    name: 'reload_page',
    description: 'Przeładowuje aktualnie otwartą stronę.',
    parameters: [],
    handler: () => { h.reload(); return 'Przeładowuję stronę.'; },
  });

  // ── Panele ────────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'toggle_panel',
    description:
      'Otwiera lub zamyka panel w ZENO Browser. ' +
      'Dostępne panele: ai, security, tunnel, plugins, tools, gateway, terminal, ' +
      'analytics, search, catalog, knowledgeHub (knowledge), agents, copilotDev, sidebar.',
    parameters: [
      {
        name: 'panel',
        type: 'string',
        description: 'Nazwa panelu (np. "ai", "terminal", "agents", "knowledgeHub")',
        required: true,
      },
      {
        name: 'open',
        type: 'boolean',
        description: 'true = otwórz, false = zamknij. Domyślnie: true.',
        required: false,
      },
    ],
    handler: ({ panel, open = true }: { panel: string; open?: boolean }) => {
      const key = resolvePanel(panel);
      if (!key) return `Nieznany panel: "${panel}". Dostępne: ai, terminal, agents, search, tools, gateway, analytics, catalog, knowledgeHub, plugins, security, tunnel, copilotDev, sidebar.`;
      h.setPanels[key](open);
      return `Panel "${key}" ${open ? 'otwarty' : 'zamknięty'}.`;
    },
  });

  // Szybkie skróty dla najczęstszych paneli

  useCopilotAction({
    name: 'open_terminal',
    description: 'Otwiera panel terminala (szybki skrót).',
    parameters: [],
    handler: () => { h.setPanels.terminal(true); return 'Terminal otwarty.'; },
  });

  useCopilotAction({
    name: 'open_ai_panel',
    description: 'Otwiera panel AI (chat z modelem AI, skróty AI).',
    parameters: [],
    handler: () => { h.setPanels.ai(true); return 'Panel AI otwarty.'; },
  });

  useCopilotAction({
    name: 'open_agents_creator',
    description: 'Otwiera kreator agentów AI — możesz tworzyć, zarządzać i wdrażać agentów.',
    parameters: [],
    handler: () => { h.setPanels.agents(true); return 'Kreator agentów otwarty.'; },
  });

  useCopilotAction({
    name: 'open_knowledge_hub',
    description: 'Otwiera Knowledge Hub — bazę wiedzy przeglądarkową.',
    parameters: [],
    handler: () => { h.setPanels.knowledgeHub(true); return 'Knowledge Hub otwarty.'; },
  });

  // ── Agenty ────────────────────────────────────────────────────────────────

  useCopilotAction({
    name: 'deploy_agent',
    description:
      'Wdraża nowego agenta AI przez API. Podaj nazwę, opis oraz (opcjonalnie) model i rolę systemową.',
    parameters: [
      { name: 'name',        type: 'string', description: 'Nazwa agenta',              required: true  },
      { name: 'description', type: 'string', description: 'Opis / cel agenta',         required: true  },
      { name: 'model',       type: 'string', description: 'Model AI (np. claude-sonnet-4, gpt-4o)', required: false },
      { name: 'system_prompt', type: 'string', description: 'Rola systemowa agenta',   required: false },
    ],
    handler: async ({ name, description, model = 'claude-sonnet-4', system_prompt }: {
      name: string; description: string; model?: string; system_prompt?: string;
    }) => {
      try {
        const res = await fetch('/api/agents/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, model, system_prompt }),
        });
        if (!res.ok) {
          const err = await res.text();
          return `Błąd wdrożenia agenta: ${res.status} — ${err}`;
        }
        // Otwórz kreator żeby pokazać wynik
        h.setPanels.agents(true);
        return `Agent "${name}" wdrożony pomyślnie (model: ${model}).`;
      } catch (e) {
        return `Nie można wdrożyć agenta: ${String(e)}`;
      }
    },
  });

  // ── Crawler / Wyszukiwanie ────────────────────────────────────────────────

  useCopilotAction({
    name: 'configure_search_engine',
    description:
      'Konfiguruje silnik wyszukiwania lub crawlera dla ZENO. ' +
      'Obsługiwane silniki: tavily, brave, serper, google.',
    parameters: [
      {
        name: 'engine',
        type: 'string',
        description: 'Silnik wyszukiwania: "tavily", "brave", "serper" lub "google"',
        required: true,
      },
      {
        name: 'query',
        type: 'string',
        description: 'Opcjonalna fraza startowa — od razu wyszukaj po otwarciu panelu',
        required: false,
      },
    ],
    handler: ({ engine, query }: { engine: string; query?: string }) => {
      // Przechowaj preferowany silnik w sessionStorage dla SearchPanel
      sessionStorage.setItem('zeno:search:engine', engine);
      if (query) sessionStorage.setItem('zeno:search:query', query);
      h.setPanels.search(true);
      return `Silnik wyszukiwania ustawiony na "${engine}".${query ? ` Szukam: "${query}".` : ''}`;
    },
  });

  useCopilotAction({
    name: 'start_crawler',
    description:
      'Uruchamia crawler na podanym URL. Crawler zbiera treści do Knowledge Base. ' +
      'Możesz podać głębokość (domyślnie 2) i temat przewodni.',
    parameters: [
      { name: 'url',   type: 'string', description: 'Adres URL strony do przeszukania', required: true  },
      { name: 'depth', type: 'number', description: 'Głębokość crawlowania (1-5)',       required: false },
      { name: 'topic', type: 'string', description: 'Temat / słowa kluczowe',            required: false },
    ],
    handler: async ({ url, depth = 2, topic }: { url: string; depth?: number; topic?: string }) => {
      try {
        const res = await fetch('/api/crawlers/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, depth: Math.min(Math.max(depth, 1), 5), topic }),
        });
        if (!res.ok) {
          const err = await res.text();
          return `Błąd crawlera: ${res.status} — ${err}`;
        }
        h.setPanels.knowledgeHub(true);
        return `Crawler uruchomiony dla "${url}" (głębokość: ${depth}${topic ? `, temat: ${topic}` : ''}).`;
      } catch (e) {
        return `Nie można uruchomić crawlera: ${String(e)}`;
      }
    },
  });

  // ── Odczyt stanu aplikacji ────────────────────────────────────────────────

  useCopilotAction({
    name: 'get_browser_state',
    description:
      'Zwraca aktualny stan przeglądarki: bieżący URL, liczbę otwartych kart oraz ich tytuły.',
    parameters: [],
    handler: () => {
      const tabList = h.tabs
        .map((t, i) => `${i + 1}. [${t.isActive ? 'aktywna' : ''}] "${t.title}" — ${t.url}`)
        .join('\n');
      return `Aktualny URL: ${h.currentUrl}\nLiczba kart: ${h.tabs.length}\n\nKarty:\n${tabList}`;
    },
  });

  useCopilotAction({
    name: 'search_knowledge_base',
    description: 'Otwiera Knowledge Hub i ustawia frazę wyszukiwania w bazie wiedzy ZENO.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Fraza do wyszukania w Knowledge Base',
        required: true,
      },
    ],
    handler: ({ query }: { query: string }) => {
      sessionStorage.setItem('zeno:kb:query', query);
      h.setPanels.knowledgeHub(true);
      return `Otwieram Knowledge Hub z zapytaniem: "${query}".`;
    },
  });
}
