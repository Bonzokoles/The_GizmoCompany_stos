/**
 * AgentLoader — ładuje agenty z .workspace_meta/awesome-copilot/agents/*.agent.md
 *
 * Format pliku:
 *   ---
 *   name: 'Nazwa agenta'
 *   description: 'Opis'
 *   tools: [...]
 *   ---
 *   # Treść systemu (systemPrompt)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

export interface AgentDef {
  id: string;          // filename without .agent.md
  name: string;
  description: string;
  systemPrompt: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// JIMBO_agent_HUB/core/ → projekt root → .workspace_meta/awesome-copilot/agents
const AGENTS_DIR = resolve(__dirname, '../../.workspace_meta/awesome-copilot/agents');

let _cache: AgentDef[] | null = null;

/** Prosty parser frontmatter YAML — obsługuje name i description */
function parseFrontmatter(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    // dopasuj: key: 'value' lub key: "value" lub key: value
    const m = line.match(/^(\w[\w-]*):\s*['"]?(.*?)['"]?\s*$/);
    if (m && m[2]) result[m[1]] = m[2];
  }
  return result;
}

/** Załaduj wszystkich agentów z katalogu (wynik cache'owany) */
export function loadAgents(): AgentDef[] {
  if (_cache) return _cache;

  if (!existsSync(AGENTS_DIR)) {
    console.warn(`[AgentLoader] Brak katalogu: ${AGENTS_DIR}`);
    return (_cache = []);
  }

  const agents: AgentDef[] = [];
  const files = readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.agent.md'))
    .sort();

  for (const file of files) {
    try {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
      // Split na frontmatter i body
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!fmMatch) continue;

      const fm   = parseFrontmatter(fmMatch[1]);
      const body = fmMatch[2].trim();
      const id   = file.replace(/\.agent\.md$/, '');

      agents.push({
        id,
        name:         fm['name']        || id,
        description:  fm['description'] || '',
        systemPrompt: body,
      });
    } catch {
      // pomiń uszkodzone pliki
    }
  }

  console.log(`[AgentLoader] Załadowano ${agents.length} agentów z awesome-copilot`);
  _cache = agents;
  return agents;
}

/** Pobierz agenta po id */
export function getAgentById(id: string): AgentDef | undefined {
  return loadAgents().find(a => a.id === id);
}

/** Wyczyść cache (np. po edycji plików) */
export function clearCache(): void {
  _cache = null;
}
