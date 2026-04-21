/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CENTRALNY REJESTR MODELI OPENROUTER                            ║
 * ║  Jeden plik — jedno miejsce wyboru modelu per narzędzie.        ║
 * ║                                                                  ║
 * ║  Aby zmienić model dla danego narzędzia → edytuj ROLE_MODELS    ║
 * ║  Aby zobaczyć co masz do wyboru → przeglądaj OR_MODELS poniżej  ║
 * ║                                                                  ║
 * ║  .env zawsze nadpisuje (env ma wyższy priorytet niż ten plik)   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Import w kodzie:
 *   import { ROLE_MODELS } from '../../config/openrouter-models.js';
 *   const MODEL = process.env.JIMBO_MODEL ?? ROLE_MODELS.JIMBO_CHAT;
 */

// ─────────────────────────────────────────────────────────────────────────────
// KATALOG MODELI — wszystkie znane modele w jednym miejscu
// Koszt: /1M tokenów (input/output, orientacyjnie)
// ─────────────────────────────────────────────────────────────────────────────

export const OR_MODELS = {
  // ── FREE ($0) ─────────────────────────────────────────────────────────────
  FREE: {
    /** Gemini 2.0 Flash Experimental — szybki, dobry do czytania/klasyfikacji */
    GEMINI_2_FLASH: "google/gemini-2.0-flash-exp:free",
    /** DeepSeek R1 (maj 2025) — najlepsze rozumowanie w free tier */
    DEEPSEEK_R1: "deepseek/deepseek-r1-0528:free",
    /** Llama 3.3 70B — ogólny, dobry do dłuższych treści */
    // QWEN3_6_PLUS: usunięty — model niedostępny od kwietnia 2026
    LLAMA_3_3_70B: "meta-llama/llama-3.3-70b-instruct:free",
    /** Gemma 3 27B — Google, dobry do polskiego */
    GEMMA_3_27B: "google/gemma-3-27b-it:free",
    /** Mistral Small 3.2 24B */
    MISTRAL_SMALL: "mistralai/mistral-small-3.2-24b-instruct:free",
  },

  // ── CHEAP ($0.05–0.40 /1M) ────────────────────────────────────────────────
  CHEAP: {
    /** Gemini 2.0 Flash (stabilny) — $0.10/1M — najlepszy stosunek cena/jakość */
    GEMINI_2_FLASH: "google/gemini-2.0-flash-001",
    /** Gemini 2.5 Flash — $0.15/1M — nowszy, lepsza jakość od 2.0 */
    GEMINI_2_5_FLASH: "google/gemini-2.5-flash-preview",
    /** Llama 3.3 70B — $0.12/1M — ogólny, długi kontekst */
    LLAMA_3_3_70B: "meta-llama/llama-3.3-70b-instruct",
    /** DeepSeek V3 Chat — $0.27/1M — świetny tool-use, coding */
    DEEPSEEK_CHAT: "deepseek/deepseek-chat-v3-0324",
    /** Qwen 2.5 72B — $0.35/1M — wielojęzyczny, dobry do polskiego */
    QWEN_2_5_72B: "qwen/qwen-2.5-72b-instruct",
    /** Mistral Small 3.2 24B — $0.10/1M — szybki, do prostych zadań */
    MISTRAL_SMALL: "mistralai/mistral-small-3.2-24b-instruct",
  },

  // ── MID ($0.50–2.50 /1M) ─────────────────────────────────────────────────
  MID: {
    /** Gemini 2.5 Pro — $1.25/1M — najlepszy Gemini, długi kontekst 1M */
    GEMINI_2_5_PRO: "google/gemini-2.5-pro-exp-03-25",
    /** Claude 3.5 Haiku — $0.80/1M — najtańszy Claude, świetny tool-use */
    CLAUDE_HAIKU: "anthropic/claude-3.5-haiku-20241022",
    /** DeepSeek R1 — $0.55/1M — rozumowanie, math, coding */
    DEEPSEEK_R1: "deepseek/deepseek-r1-0528",
    /** GPT-4o Mini — $0.15/1M — szybki, dobry do prostych zadań */
    GPT_4O_MINI: "openai/gpt-4o-mini",
    /** Command R+ — $2.50/1M — Cohere, dobry RAG */
    COMMAND_R_PLUS: "cohere/command-r-plus-08-2024",
  },

  // ── PREMIUM ($3+ /1M) ────────────────────────────────────────────────────
  PREMIUM: {
    /** Claude Sonnet 4 — $3/1M — najlepszy ogólny model Claude */
    CLAUDE_SONNET_4: "anthropic/claude-sonnet-4",
    /** Claude Sonnet 4.5 — $3/1M — nowszy, lepszy coding */
    CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4-5",
    /** Claude Opus 4 — $15/1M — najinteligentniejszy, complex reasoning */
    CLAUDE_OPUS_4: "anthropic/claude-opus-4",
    /** GPT-4o — $2.50/1M — multimodal, dobry vision */
    GPT_4O: "openai/gpt-4o",
    /** O3 Mini — $1.10/1M — szybkie reasoning, coding */
    O3_MINI: "openai/o3-mini",
    /** Grok 3 — $3/1M — X.AI, dobry do analizy web */
    GROK_3: "x-ai/grok-3",
    /** Kimi K2.5 — $0.60/1M — MoE, bardzo długi kontekst */
    KIMI_K2_5: "moonshotai/kimi-k2.5",
  },
  // ── ROUTERS — specjalne modele OpenRouter ($0 za routing) ────────────────
  ROUTERS: {
    /**
     * Auto Router — `openrouter/auto`
     * NotDiamond analizuje prompt → wybiera optymalny model automatycznie.
     * Dobre gdy: nie wiesz który model pasuje, chcesz najlepszą jakość za cenę.
     * Odpowiedź zawiera pole `model` z nazwą wybranego modelu.
     */
    AUTO: "openrouter/auto",

    /**
     * Free Models Router — `openrouter/free`
     * Losuje spośród WSZYSTKICH aktualnie darmowych modeli na OpenRouter.
     * Router filtruje pod kątem wymaganych możliwości (vision, tool-calling, JSON).
     * Dobre gdy: eksperymentowanie, learninig, zero budżetu.
     */
    FREE: "openrouter/free",

    /**
     * Body Builder — `openrouter/bodybuilder`
     * Zwraca tablicę `{ requests: [...] }` gotowych body do równoległego wysłania.
     * Darmowy (zero koszt za generację body).
     * Dobre gdy: MOA/benchmarking — to samo zadanie do wielu modeli naraz.
     * UWAGA: wymaga post-processingu — wynik to JSON bodies, nie gotowa odpowiedź!
     */
    BODY_BUILDER: "openrouter/bodybuilder",
  },
} as const;

// Skrótowy typ dla wszystkich ID modeli
type ModelId =
  (typeof OR_MODELS)[keyof typeof OR_MODELS][keyof (typeof OR_MODELS)[keyof typeof OR_MODELS]];

// ─────────────────────────────────────────────────────────────────────────────
// MAPOWANIE RÓL → MODELE
// ─────────────────────────────────────────────────────────────────────────────
// To jest główne miejsce wyboru — zmień tutaj, żeby zmienić model dla narzędzia.
// Wartości z .env nadal mają wyższy priorytet.

export const ROLE_MODELS = {
  // ── JIMbo_kit (chat serwer, port 4111) ────────────────────────────────────
  /** Główny model czatu — odpowiedzi dla użytkownika */
  JIMBO_CHAT: OR_MODELS.FREE.GEMMA_3_27B,
  /** Model do tool-use (Phase 1) — musi być dobry w JSON/function calling */
  JIMBO_TOOLS: OR_MODELS.CHEAP.GEMINI_2_FLASH,
  /** Model do kodowania — precyzja, długi kontekst kodu */
  JIMBO_CODING: OR_MODELS.CHEAP.DEEPSEEK_CHAT,

  // ── JIMBO_agent_HUB (agent hub, port 4224) ────────────────────────────────
  /** Domyślny model dla agentów w HUBie */
  HUB_DEFAULT: OR_MODELS.CHEAP.GEMINI_2_FLASH,
  /** Model dla wolnych agentów (free tier) — Gemma 3 27B dobry do polskiego */
  HUB_FREE: OR_MODELS.FREE.GEMMA_3_27B,

  // ── MOA Pipeline (Mixture of Agents) ──────────────────────────────────────
  /** Etap 1: Czytanie DB, klasyfikacja — free wystarczy */
  MOA_READ: OR_MODELS.FREE.GEMINI_2_FLASH,
  /** Etap 2: Czyszczenie treści — tani stabilny */
  MOA_CLEAN: OR_MODELS.CHEAP.GEMINI_2_FLASH,
  /** Etap 3: Zapis SQL — precyzja, nie oszczędzamy */
  MOA_WRITE: OR_MODELS.CHEAP.DEEPSEEK_CHAT,

  // ── Ogólne role (do użycia w innych miejscach) ────────────────────────────
  /** Szybki i tani — do klasyfikacji, filtrowania, prostych zadań */
  FAST_CHEAP: OR_MODELS.CHEAP.GEMINI_2_FLASH,
  /** Najlepsze rozumowanie z free-tier */
  REASONING_FREE: OR_MODELS.FREE.DEEPSEEK_R1,
  /** Najlepsze rozumowanie (płatne) */
  REASONING_PAID: OR_MODELS.MID.DEEPSEEK_R1,
  /** Coding — najtańszy dobry do kodu */
  CODING: OR_MODELS.CHEAP.DEEPSEEK_CHAT,
  /** Premium — wszystko co wymaga najwyższej jakości */
  PREMIUM: OR_MODELS.PREMIUM.CLAUDE_SONNET_4,

  // ── Routery OpenRouter ────────────────────────────────────────────────────
  /** Auto-routing przez NotDiamond — najlepszy model do zadania, auto-dobierany */
  AUTO_ROUTE: OR_MODELS.ROUTERS.AUTO,
  /** Darmowy routing — losowy free model z odpowiednimi capabilities */
  FREE_ROUTE: OR_MODELS.ROUTERS.FREE,
  /** Body Builder — generator równoległych requestów (MOA/benchmarking) */
  BODY_BUILDER: OR_MODELS.ROUTERS.BODY_BUILDER,
} as const satisfies Record<string, ModelId | string>;

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK CHAINS — uporządkowane listy modeli dla każdej roli
// System próbuje modele po kolei — gdy jeden zawiedzie, przechodzi do następnego.
// ─────────────────────────────────────────────────────────────────────────────

export const FALLBACK_CHAINS = {
  /** Chat/rozumowanie — free modele + płatny fallback */
  JIMBO_CHAT: [
    OR_MODELS.FREE.GEMMA_3_27B, // primary: dobry do polskiego, darmowy
    OR_MODELS.FREE.LLAMA_3_3_70B, // backup: solidny general-purpose
    OR_MODELS.FREE.GEMINI_2_FLASH, // backup: szybki
    OR_MODELS.FREE.MISTRAL_SMALL, // backup: szybki
    OR_MODELS.CHEAP.GEMINI_2_FLASH, // płatny fallback (ostatnia deska ratunku)
  ] as string[],

  /** Tool-use (Phase 1) — stabilny model z function calling */
  JIMBO_TOOLS: [
    OR_MODELS.CHEAP.GEMINI_2_FLASH, // primary: dobry w tool-use, tani
    OR_MODELS.CHEAP.GEMINI_2_5_FLASH, // backup: nowszy Gemini
    OR_MODELS.FREE.GEMINI_2_FLASH, // free fallback
    OR_MODELS.FREE.LLAMA_3_3_70B, // ostateczny fallback
  ] as string[],

  /** Kodowanie — DeepSeek Chat z Gemini fallback */
  JIMBO_CODING: [
    OR_MODELS.CHEAP.DEEPSEEK_CHAT, // primary: najlepszy do kodu
    OR_MODELS.CHEAP.GEMINI_2_5_FLASH, // backup: długi kontekst
    OR_MODELS.CHEAP.GEMINI_2_FLASH, // backup: szybki
  ] as string[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER → generuje fragment .env z aktualnymi wyborami
// Uruchom: npx tsx config/openrouter-models.ts
// ─────────────────────────────────────────────────────────────────────────────

export function printEnvSuggestions(): void {
  console.log(`
# ── OpenRouter modele (generowane z config/openrouter-models.ts) ──
JIMBO_MODEL=${ROLE_MODELS.JIMBO_CHAT}
JIMBO_TOOL_MODEL=${ROLE_MODELS.JIMBO_TOOLS}
JIMBO_CODING_MODEL=${ROLE_MODELS.JIMBO_CODING}
OPENROUTER_MODEL=${ROLE_MODELS.HUB_DEFAULT}
OPENROUTER_MODEL_HUB=${ROLE_MODELS.HUB_FREE}
MOA_MODEL_READ=${ROLE_MODELS.MOA_READ}
MOA_MODEL_CLEAN=${ROLE_MODELS.MOA_CLEAN}
MOA_MODEL_WRITE=${ROLE_MODELS.MOA_WRITE}
`);
}

// Uruchomienie bezpośrednie: npx tsx config/openrouter-models.ts
if (
  import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
  process.argv[1]?.includes("openrouter-models")
) {
  printEnvSuggestions();
}
