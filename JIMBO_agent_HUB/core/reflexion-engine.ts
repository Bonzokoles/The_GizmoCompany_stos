/**
 * ReflexionEngine — pętla refleksji po zadaniach Goose
 *
 * Po każdym zakończonym zadaniu Goose:
 *  1. LLM ocenia wynik (verdict + score 0-1)
 *  2. Wynik trafia do reflexion_log (SQLite, ten sam skills.db)
 *  3. Skill który był użyty dostaje zaktualizowany score (weighted average)
 *  4. Po EVOLVE_AFTER_N słabych wynikach z rzędu → skill oznaczany do zastąpienia
 *  5. LLM proponuje nowy draft skilla → wstawia jako 'candidate' (czeka na approve)
 *
 * Dzieli instancję DB z SkillManager — brak race condition.
 */

import type Database from 'better-sqlite3';
import type OpenAI from 'openai';
import { chat, type Message } from './llm-client.js';
import { randomUUID } from 'crypto';

// ── Stałe ────────────────────────────────────────────────────────────────────

const REPLACE_THRESHOLD = 0.45;   // skill poniżej tej oceny → kandydat do zastąpienia
const EVOLVE_AFTER_N    = 3;      // po ilu słabych wynikach z rzędu → wymuszony replace

// ── Typy ─────────────────────────────────────────────────────────────────────

export interface ReflexionInput {
  taskId:          string;
  taskDescription: string;
  agentOutput:     string;
  executionMs:     number;
  skillId?:        string;
  userFeedback?:   'good' | 'bad' | 'skip';
}

export interface ReflexionResult {
  verdict:            'success' | 'partial' | 'failure';
  score:              number;
  reflection:         string;
  improvement:        string;
  shouldReplaceSkill: boolean;
  newSkillDraft?:     string;
}

// ── ReflexionEngine ───────────────────────────────────────────────────────────

export class ReflexionEngine {
  private db:  Database.Database;
  private llm: OpenAI;

  /**
   * @param db  Instancja z SkillManager.getDb() — wspólna konekcja, brak race condition
   * @param llm Instancja z createLLMClient() z hub-server
   */
  constructor(db: Database.Database, llm: OpenAI) {
    this.db  = db;
    this.llm = llm;
    this._initTables();
  }

  // ── Główna metoda ─────────────────────────────────────────────────────────

  async reflect(input: ReflexionInput): Promise<ReflexionResult> {
    const raw    = await this._callLLM(input);
    const result = this._parse(raw);

    this._saveReflexion(input, result);

    if (input.skillId) {
      this._updateSkillScore(input.skillId, result.score);
    }

    if (input.skillId && result.shouldReplaceSkill && result.newSkillDraft) {
      this._proposeSkillReplacement(input.skillId, result.newSkillDraft);
    }

    console.log(`[Reflexion] ${result.verdict} score=${result.score.toFixed(2)} task="${input.taskDescription.slice(0, 60)}"`);
    return result;
  }

  // ── Prywatne ──────────────────────────────────────────────────────────────

  private async _callLLM(input: ReflexionInput): Promise<string> {
    const messages: Message[] = [
      {
        role: 'user',
        content: `## EWALUACJA ZADANIA GOOSE

Jesteś bezstronnym recenzentem wyników AI agenta. Oceń wynik poniższego zadania.
Bądź krytyczny — nie chwal jeśli nie ma powodu.

### Zadanie
${input.taskDescription.slice(0, 800)}

### Wynik agenta
${input.agentOutput.slice(0, 1200)}

### Czas wykonania
${input.executionMs}ms${input.userFeedback ? `\n\n### Feedback użytkownika\n${input.userFeedback}` : ''}

---

Odpowiedz TYLKO w formacie JSON (bez markdown, bez wyjaśnień):
{
  "verdict": "success" | "partial" | "failure",
  "score": 0.0-1.0,
  "reflection": "Co poszło dobrze i co źle — max 2 zdania",
  "improvement": "Konkretna zmiana poprawiająca wynik — max 2 zdania",
  "shouldReplaceSkill": true | false,
  "newSkillDraft": "Nowy prompt skilla lub null"
}

Kryteria:
- 0.9-1.0: Doskonały, przekracza oczekiwania
- 0.7-0.9: Dobry, spełnia cel
- 0.45-0.7: Częściowy sukces, wymaga poprawy
- 0.0-0.45: Porażka — shouldReplaceSkill: true`,
      },
    ];

    try {
      const res = await chat(this.llm, messages, undefined, undefined);
      return res.choices[0]?.message?.content ?? '';
    } catch (err) {
      console.warn('[Reflexion] LLM call failed:', err instanceof Error ? err.message : err);
      return '';
    }
  }

  private _parse(raw: string): ReflexionResult {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in response');
      const p = JSON.parse(match[0]);
      return {
        verdict:            (['success', 'partial', 'failure'].includes(p.verdict) ? p.verdict : 'partial') as ReflexionResult['verdict'],
        score:              Math.max(0, Math.min(1, Number(p.score) || 0.5)),
        reflection:         String(p.reflection ?? ''),
        improvement:        String(p.improvement ?? ''),
        shouldReplaceSkill: Boolean(p.shouldReplaceSkill),
        newSkillDraft:      p.newSkillDraft && p.newSkillDraft !== 'null' ? String(p.newSkillDraft) : undefined,
      };
    } catch {
      return {
        verdict: 'partial', score: 0.5,
        reflection: 'Parse error — nie można odczytać oceny LLM',
        improvement: 'Sprawdź format odpowiedzi LLM',
        shouldReplaceSkill: false,
      };
    }
  }

  private _saveReflexion(input: ReflexionInput, result: ReflexionResult): void {
    this.db.prepare(`
      INSERT INTO reflexion_log
        (id, task_id, task_description, skill_id, verdict, score,
         reflection, improvement, execution_ms, user_feedback, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      randomUUID(),
      input.taskId,
      input.taskDescription.slice(0, 500),
      input.skillId ?? null,
      result.verdict,
      result.score,
      result.reflection,
      result.improvement,
      input.executionMs,
      input.userFeedback ?? null,
    );
  }

  private _updateSkillScore(skillId: string, newScore: number): void {
    // Weighted average — nowe 40%, historia 60%
    this.db.prepare(`
      UPDATE skills SET
        score                = ROUND(COALESCE(score, 0.7) * 0.6 + ? * 0.4, 3),
        usage_count          = COALESCE(usage_count, 0) + 1,
        last_used_at         = datetime('now'),
        consecutive_failures = CASE
          WHEN ? < ${REPLACE_THRESHOLD} THEN COALESCE(consecutive_failures, 0) + 1
          ELSE 0
        END
      WHERE id = ?
    `).run(newScore, newScore, skillId);

    const skill = this.db.prepare(
      `SELECT consecutive_failures FROM skills WHERE id = ?`
    ).get(skillId) as { consecutive_failures: number } | undefined;

    if (skill && skill.consecutive_failures >= EVOLVE_AFTER_N) {
      this.db.prepare(
        `UPDATE skills SET status = 'needs_replacement' WHERE id = ?`
      ).run(skillId);
      console.log(`[Reflexion] ⚠ Skill ${skillId} needs_replacement po ${EVOLVE_AFTER_N} słabych wynikach`);
    }
  }

  private _proposeSkillReplacement(oldSkillId: string, draft: string): void {
    // Archiwizuj stary skill
    this.db.prepare(`
      UPDATE skills SET status = 'archived', archived_at = datetime('now')
      WHERE id = ? AND status != 'archived'
    `).run(oldSkillId);

    // Wstaw kandydata — czeka na approveCandidateSkill()
    const candidateId = randomUUID();
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO skills (id, name, description, code, tags, embedding, namespace, created_at,
                          success_count, failure_count, score, usage_count,
                          consecutive_failures, status, source)
      VALUES (?, ?, ?, ?, '[]', '[]', 'global', ?, 0, 0, 0.5, 0, 0, 'candidate', 'reflexion_evolution')
    `).run(
      candidateId,
      `evolved_${oldSkillId.slice(0, 8)}_${now}`,
      `Ewolucja skilla ${oldSkillId} — kandydat do zatwierdzenia`,
      draft.slice(0, 4000),
      now,
    );
    console.log(`[Reflexion] 🧬 Kandydat ${candidateId} zastępuje skill ${oldSkillId}`);
  }

  private _initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reflexion_log (
        id               TEXT PRIMARY KEY,
        task_id          TEXT NOT NULL,
        task_description TEXT,
        skill_id         TEXT,
        verdict          TEXT,
        score            REAL,
        reflection       TEXT,
        improvement      TEXT,
        execution_ms     INTEGER,
        user_feedback    TEXT,
        created_at       TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_reflexion_task   ON reflexion_log(task_id);
      CREATE INDEX IF NOT EXISTS idx_reflexion_skill  ON reflexion_log(skill_id);
      CREATE INDEX IF NOT EXISTS idx_reflexion_verdict ON reflexion_log(verdict);
    `);
  }

  // ── API dla Express endpoints ──────────────────────────────────────────────

  getStats() {
    const total    = (this.db.prepare(`SELECT COUNT(*) as c FROM reflexion_log`).get() as any).c as number;
    const avgScore = (this.db.prepare(`SELECT ROUND(AVG(score), 2) as s FROM reflexion_log`).get() as any).s as number | null;
    const failRate = (this.db.prepare(`
      SELECT ROUND(AVG(CASE WHEN verdict='failure' THEN 1.0 ELSE 0.0 END), 2) as r FROM reflexion_log
    `).get() as any).r as number | null;
    const forReview = this.db.prepare(
      `SELECT id, name, score, consecutive_failures FROM skills WHERE status='needs_replacement'`
    ).all();
    const recentLog = this.db.prepare(
      `SELECT * FROM reflexion_log ORDER BY id DESC LIMIT 10`
    ).all();
    return { total, avgScore, failRate, forReview, recentLog };
  }

  approveCandidateSkill(candidateId: string): boolean {
    const res = this.db.prepare(
      `UPDATE skills SET status = 'active' WHERE id = ? AND status = 'candidate'`
    ).run(candidateId);
    return res.changes > 0;
  }
}
