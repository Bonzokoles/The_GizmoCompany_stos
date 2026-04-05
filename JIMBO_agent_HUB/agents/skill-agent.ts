/**
 * SkillAgent — centralny moduł uczenia i wstrzykiwania skills
 *
 * Odpowiada za:
 *  1. buildSuffix()   — przed wywołaniem LLM: szuka pasujących skills
 *                       i zwraca suffix do system prompt
 *  2. evalAndSave()   — po Goose done: ocenia czy task wart zapisu (via LLM),
 *                       auto-zapisuje do Skills DB
 *
 * Używany przez hub-server.ts i goose-session-importer.ts
 */

import OpenAI from 'openai';
import { chat, type Message } from '../core/llm-client.js';
import type { SkillManager } from '../skills/skill-manager.js';

// ── Prompt klasyfikatora ─────────────────────────────────────────────────────
export const SKILL_EVAL_PROMPT = `Jesteś klasyfikatorem umiejętności AI. Otrzymujesz instrukcję zadania i output Goose.
Oceń czy to zadanie jest WARTOŚCIOWYM, REUŻYWALNYM skillem godnym zapisania.

NIE zapisuj jeśli:
- To test/hello world/jednorazowy eksperyment
- Instrukcja to proste pytanie lub pozdrowienie
- Instrukcja zaczyna się od "⚡" (marker UI, nie skill)
- Zadanie nie zawiera nic reużywalnego

ZAPISZ jeśli:
- Zawiera reużywalny kod, procedurę lub workflow
- Ma wyraźną nazwę i da się uruchomić ponownie
- Może pomóc w przyszłych podobnych zadaniach

Odpowiedz WYŁĄCZNIE jednym z dwóch formatów:
1. null  — jeśli NIE warto zapisać
2. JSON: {"name":"krótka-nazwa-kebab","description":"Co robi ten skill","tags":["tag1","tag2"],"namespace":"global"}

Żadnego innego tekstu poza null lub JSON.`;

// ── SkillAgent ───────────────────────────────────────────────────────────────
export class SkillAgent {
  constructor(
    private readonly llm:    OpenAI,
    private readonly skills: SkillManager,
  ) {}

  /**
   * Szuka skills pasujących do zapytania użytkownika.
   * Zwraca prefix gotowy do wstrzyknięcia jako pierwsza część wiadomości użytkownika.
   * Wzorzec Hermes: skills jako user message → system prompt pozostaje statyczny
   * → Anthropic cache_control działa → ~80% oszczędności na tokenach systemu.
   * Zwraca '' jeśli nic nie znaleziono.
   */
  async buildUserPrefix(query: string, activeNamespaces: Iterable<string>): Promise<string> {
    if (!query.trim()) return '';
    try {
      const ns = [...activeNamespaces];
      const matched = await this.skills.search(query, 3, 0.65, ns);
      if (matched.length === 0) return '';
      const skillsBlock = matched
        .map(
          s =>
            `## ${s.name}\n${s.description}\n\`\`\`\n${(s.code ?? '').slice(0, 400)}\n\`\`\``,
        )
        .join('\n\n');
      return `[Relevant skills from knowledge base:\n${skillsBlock}\n]\n\n`;
    } catch {
      return ''; // nie blokuj chatu gdy skills DB fail
    }
  }

  /**
   * @deprecated Użyj buildUserPrefix() — wstrzykuje skills jako user message zamiast system prompt.
   * Zostaje dla kompatybilności wstecznej.
   */
  async buildSuffix(query: string, activeNamespaces: Iterable<string>): Promise<string> {
    return this.buildUserPrefix(query, activeNamespaces);
  }

  /**
   * Ocenia task via LLM i zapisuje jeśli warto.
   * Zwraca nazwę zapisanego skilla lub null.
   */
  async evalAndSave(
    instructions: string,
    output:       string,
    exitCode:     number,
  ): Promise<string | null> {
    if (exitCode !== 0) return null;

    const stripped = instructions.trim();
    if (!stripped || stripped.length < 20) return null;
    if (/^(cześć|hej|hello|hi |test|ok |tak |nie )/i.test(stripped)) return null;

    try {
      const evalMessages: Message[] = [
        { role: 'system', content: SKILL_EVAL_PROMPT },
        {
          role: 'user',
          content:
            `INSTRUKCJA:\n${stripped.slice(0, 800)}\n\nOUTPUT GOOSE:\n${output.slice(0, 1200)}`,
        },
      ];

      const completion = await chat(this.llm, evalMessages, undefined, undefined);
      const text = completion.choices[0]?.message?.content?.trim() ?? '';

      if (!text || text === 'null' || !text.startsWith('{')) return null;

      const parsed = JSON.parse(text) as {
        name?:        string;
        description?: string;
        tags?:        string[];
        namespace?:   string;
      };
      if (!parsed.name || !parsed.description) return null;

      await this.skills.save({
        name:        parsed.name.slice(0, 80),
        description: parsed.description.slice(0, 500),
        code:        `// Auto-extracted skill\n// Źródło: Goose task ${new Date().toISOString()}\n\n${stripped}`,
        tags:        Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : ['auto'],
        namespace:   parsed.namespace ?? 'global',
      });

      console.log(`[SkillAgent] Zapisano skill: "${parsed.name}"`);
      return parsed.name;
    } catch (err) {
      console.warn('[SkillAgent] evalAndSave błąd:', err instanceof Error ? err.message : err);
      return null;
    }
  }
}