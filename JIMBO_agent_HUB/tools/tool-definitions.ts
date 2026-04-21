/**
 * BUCH_AGENT — definicje narzędzi (OpenAI tool format)
 *
 * 15 narzędzi podzielonych na kategorie:
 *   LOCAL  — pliki, komendy, status serwisów
 *   HUB    — skills, pamięć, Goose, Pi agent
 *   CLOUD  — D1, R2 (Cloudflare)
 *   WEB    — wyszukiwanie, HTTP
 *   CONTENT— blog, organizacja
 */

import type OpenAI from "openai";

export const AGENT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  // ── LOCAL ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Czyta zawartość pliku. Ścieżki absolutne lub względne od korzenia projektu ZENO Browser (U:\\WWW_Zen_BRo_wser_org3).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Ścieżka do pliku" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Zapisuje treść do pliku. NIE używaj na plikach chronionych: src-electron/main.ts, src/shared/ipc/, package.json, vite.config*, tsconfig*, electron-builder*.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Ścieżka do pliku" },
          content: { type: "string", description: "Treść do zapisania" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "Listuje pliki i podfoldery w katalogu.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Ścieżka do katalogu" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Uruchamia bezpieczne polecenie shell (npx, npm run, git status/log/diff, dir, ls, grep, tsc). Nie używaj do rm, del, format, shutdown.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Polecenie do uruchomienia" },
          cwd: {
            type: "string",
            description: "Katalog roboczy (domyślnie: katalog projektu)",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "local_services_status",
      description:
        "Sprawdza status lokalnych serwisów ZENO: JIMBO HUB (:4224), JimboKit (:4111), Goose, SearXNG.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },

  // ── HUB ────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "hub_search_skills",
      description:
        "Przeszukuje bazę skills JIMBO HUB semantycznie. Zwraca powiązane skills z kodem i opisem.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Zapytanie semantyczne" },
          limit: {
            type: "number",
            description: "Maks. wyniki (domyślnie 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hub_search_memory",
      description:
        "Przeszukuje pamięć archiwalną JIMBO HUB. Przydatne do przypomnienia sobie poprzednich decyzji i kontekstu.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Zapytanie semantyczne" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hub_goose_run",
      description:
        "Deleguje złożone zadanie kodowania/edycji plików do Goose (autonomiczny agent). Używaj gdy zadanie wymaga zmian w wielu plikach lub refaktoryzacji. Zwraca taskId — wynik przyjdzie przez synthesis.",
      parameters: {
        type: "object",
        properties: {
          instructions: {
            type: "string",
            description:
              "Kompletna instrukcja dla Goose — wszystkie kroki, ścieżki absolutne, co sprawdzić",
          },
        },
        required: ["instructions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pi_agent_run",
      description:
        "Wysyła zadanie do lokalnego agenta Pi/Polaczek (Ollama). Używaj do analiz, porządkowania danych, zadań organizacyjnych. Wymaga działającego Ollama na localhost:11434.",
      parameters: {
        type: "object",
        properties: {
          agent_id: {
            type: "string",
            description:
              "ID agenta: 'bibliotekarz' (szuka i kataloguje), 'analityk' (analizuje dane), 'porzadkowy' (porządkuje projekty)",
          },
          task: { type: "string", description: "Zadanie do wykonania" },
        },
        required: ["agent_id", "task"],
      },
    },
  },

  // ── CLOUD ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "d1_query",
      description:
        "Wykonuje SQL query na bazie Cloudflare D1. Wymaga CF_API_TOKEN i CF_ACCOUNT_ID w .env.",
      parameters: {
        type: "object",
        properties: {
          database_id: {
            type: "string",
            description: "UUID bazy D1 z CF dashboard",
          },
          sql: {
            type: "string",
            description: "SQL query (SELECT, INSERT, UPDATE, DELETE)",
          },
          params: {
            type: "array",
            items: { type: "string" },
            description: "Parametry bindowania ? (opcjonalne)",
          },
        },
        required: ["database_id", "sql"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_list",
      description: "Listuje pliki w buckecie Cloudflare R2.",
      parameters: {
        type: "object",
        properties: {
          bucket: { type: "string", description: "Nazwa bucketa R2" },
          prefix: {
            type: "string",
            description: "Prefiks ścieżki (opcjonalny)",
          },
        },
        required: ["bucket"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_read",
      description: "Odczytuje zawartość pliku z Cloudflare R2.",
      parameters: {
        type: "object",
        properties: {
          bucket: { type: "string", description: "Nazwa bucketa R2" },
          key: { type: "string", description: "Klucz (ścieżka) pliku w R2" },
        },
        required: ["bucket", "key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "r2_write",
      description: "Zapisuje plik do Cloudflare R2.",
      parameters: {
        type: "object",
        properties: {
          bucket: { type: "string", description: "Nazwa bucketa R2" },
          key: { type: "string", description: "Klucz (ścieżka) pliku w R2" },
          content: { type: "string", description: "Treść pliku" },
          content_type: {
            type: "string",
            description: "MIME type (domyślnie text/plain)",
          },
        },
        required: ["bucket", "key", "content"],
      },
    },
  },

  // ── KB (Knowledge Base / ChromaDB) ────────────────────────────────
  {
    type: "function",
    function: {
      name: "kb_search",
      description:
        "Przeszukuje lokalną bazę wiedzy (ChromaDB, port 7071) semantycznie. 20 kategorii: AI_SEO, AGENTS_AND_RAG, FINANCE, B2B_SALES, ECOMMERCE, PROMPT_LIBRARY, itp. Zwraca fragmenty dokumentów z metadanymi. Jeśli podasz categories[], filtruje do wybranych kategorii.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Zapytanie semantyczne (po polsku lub angielsku)" },
          limit: { type: "number", description: "Maks. wyniki (domyślnie 8, max 20)" },
          categories: {
            type: "array",
            items: { type: "string" },
            description: "Opcjonalne ID kategorii np. ['01', '05', '13'] — filtruje wyniki",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kb_categories",
      description:
        "Zwraca listę wszystkich kategorii KB z liczbą plików i zindeksowanych dokumentów. Użyj do sprawdzenia co jest w bazie wiedzy.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },

  // ── WEB ────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Wyszukuje w internecie przez SearXNG. Zwraca tytuły, URL-e i fragmenty wyników.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Zapytanie wyszukiwania" },
          num_results: {
            type: "number",
            description: "Liczba wyników (domyślnie 5, max 10)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "http_fetch",
      description:
        "Wykonuje zapytanie HTTP do dowolnego endpointu lokalnego lub zewnętrznego. Używaj do integracji z API (kalendarz, blogi, zewnętrzne serwisy).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL endpointu" },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "Metoda HTTP (domyślnie GET)",
          },
          body: {
            type: "string",
            description: "Body JSON jako string (opcjonalne)",
          },
          headers: {
            type: "object",
            description: "Dodatkowe nagłówki HTTP (opcjonalne)",
          },
        },
        required: ["url"],
      },
    },
  },

  // ── CONTENT ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "blog_post",
      description:
        "Tworzy wpis na blogu mybonzo (mybonzo.com). Używaj gdy użytkownik chce opublikować artykuł lub notatkę.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Tytuł wpisu" },
          content: {
            type: "string",
            description: "Treść wpisu (markdown lub HTML)",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tagi (opcjonalne)",
          },
          status: {
            type: "string",
            enum: ["draft", "published"],
            description: "Status publikacji (domyślnie 'draft')",
          },
        },
        required: ["title", "content"],
      },
    },
  },
];
