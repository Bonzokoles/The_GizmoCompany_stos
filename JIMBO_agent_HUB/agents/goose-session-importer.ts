/**
 * GooseSessionImporter — importuje sesje z Goose Desktop do Skills DB
 *
 * Czyta Goose sessions.db (SQLite, read-only), parsuje wiadomości user→assistant,
 * dla każdej pary wywołuje SkillAgent.evalAndSave() — ten sam mechanizm co
 * przy auto-save po taskach hubu.
 *
 * Goose DB: C:\Users\<user>\AppData\Roaming\Block\goose\data\sessions\sessions.db
 *
 * Endpointy w hub-server.ts:
 *   GET  /skills/goose-sessions                          — lista sesji
 *   POST /skills/import-goose-session  { sessionId }    — importuj sesję
 */

import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import type { SkillAgent } from './skill-agent.js';

// ── Ścieżka do Goose sessions.db ────────────────────────────────────────────
export const GOOSE_SESSIONS_DB = join(
  homedir(),
  'AppData', 'Roaming', 'Block', 'goose', 'data', 'sessions', 'sessions.db',
);

// ── Typy ─────────────────────────────────────────────────────────────────────
export interface GooseSessionMeta {
  id:         string;
  name:       string;
  workingDir: string;
  createdAt:  string;
  updatedAt:  string;
  msgCount:   number;
  provider:   string | null;
  model:      string | null;
}

export interface ImportResult {
  sessionId: string;
  processed: number;
  saved:     string[];
  skipped:   number;
  error?:    string;
}

// ── Lista sesji ───────────────────────────────────────────────────────────────
/**
 * Zwraca listę ostatnich sesji Goose z metadanymi.
 * Bezpiecznie failuje (zwraca []) jeśli Goose DB niedostępna.
 */
export function listGooseSessions(limit = 30): GooseSessionMeta[] {
  try {
    const db = new Database(GOOSE_SESSIONS_DB, { readonly: true });
    const rows = db.prepare(`
      SELECT
        s.id,
        s.name,
        s.working_dir,
        s.created_at,
        s.updated_at,
        s.provider_name,
        s.model_config_json,
        COUNT(m.id) AS msg_count
      FROM sessions s
      LEFT JOIN messages m ON m.session_id = s.id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT ?
    `).all(limit) as any[];
    db.close();

    return rows.map(r => {
      let model: string | null = null;
      try {
        const cfg = JSON.parse(r.model_config_json ?? '{}');
        model = cfg.model ?? null;
      } catch { /* ignore */ }
      return {
        id:         r.id,
        name:       r.name || r.id,
        workingDir: r.working_dir ?? '',
        createdAt:  r.created_at ?? '',
        updatedAt:  r.updated_at ?? '',
        msgCount:   Number(r.msg_count ?? 0),
        provider:   r.provider_name ?? null,
        model,
      };
    });
  } catch (err) {
    console.warn('[GooseImporter] Nie można otworzyć sessions.db:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Import sesji ──────────────────────────────────────────────────────────────
/**
 * Importuje wybraną sesję Goose do Skills DB.
 *
 * Algorytm:
 *  - Wczytuje wszystkie wiadomości sesji w kolejności chronologicznej
 *  - Paruje kolejne user→assistant
 *  - Dla każdej pary wywołuje SkillAgent.evalAndSave()
 *  - Zwraca raport: ile przetworzono, ile zapisano, ile pominięto
 */
export async function importGooseSession(
  sessionId:  string,
  skillAgent: SkillAgent,
): Promise<ImportResult> {
  let db: Database.Database | undefined;

  try {
    db = new Database(GOOSE_SESSIONS_DB, { readonly: true });

    // Sprawdź czy sesja istnieje
    const session = db.prepare('SELECT id, name FROM sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      return { sessionId, processed: 0, saved: [], skipped: 0, error: `Sesja nie znaleziona: ${sessionId}` };
    }

    const messages = db.prepare(`
      SELECT role, content_json
      FROM messages
      WHERE session_id = ?
      ORDER BY id ASC
    `).all(sessionId) as Array<{ role: string; content_json: string }>;

    db.close();
    db = undefined;

    const saved: string[] = [];
    let processed = 0;
    let skipped    = 0;

    // Paruj user→assistant (pomijaj niekompletne pary)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role !== 'user') continue;

      // Szukaj następnej wiadomości assistant
      const next = messages[i + 1];
      if (!next || next.role !== 'assistant') { skipped++; continue; }

      const userText      = extractText(msg.content_json);
      const assistantText = extractText(next.content_json);

      if (!userText || userText.length < 20) { skipped++; i++; continue; }

      processed++;
      const savedName = await skillAgent.evalAndSave(userText, assistantText, 0);
      if (savedName) {
        saved.push(savedName);
      } else {
        skipped++;
      }

      i++; // przesuń za wiadomość assistant
    }

    return { sessionId, processed, saved, skipped };
  } catch (err) {
    db?.close();
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GooseImporter] Błąd importu:', msg);
    return { sessionId, processed: 0, saved: [], skipped: 0, error: msg };
  }
}

// ── Helper: wyciągnij tekst z content_json ────────────────────────────────────
function extractText(contentJson: string): string {
  try {
    const parts = JSON.parse(contentJson) as Array<{ type: string; text?: string }>;
    return parts
      .filter(p => p.type === 'text' && p.text)
      .map(p => p.text ?? '')
      .join('\n')
      .trim();
  } catch {
    return typeof contentJson === 'string' ? contentJson.trim() : '';
  }
}