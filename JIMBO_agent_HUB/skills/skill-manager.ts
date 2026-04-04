/**
 * Skill Manager — z namespace support
 *
 * Schema:
 *   skills(id, name, description, code, tags, embedding, namespace,
 *          created_at, success_count, failure_count)
 *
 * Namespace mapping (kontener → domena):
 *   zeno-umami, plausible, zeno-superset  → analytics
 *   zeno-meilisearch, zeno-websurfx, sist2 → search
 *   mydia                                  → media
 *   (domyślnie)                            → global
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DB_PATH    = join(__dirname, 'db', 'skills.db');
const LIBRARY_PATH = join(__dirname, 'library');

export const CONTAINER_NAMESPACE: Record<string, string> = {
  'zeno-umami':          'analytics',
  'plausible':           'analytics',
  'zeno-superset':       'analytics',
  'zeno-meilisearch':    'search',
  'zeno-websurfx':       'search',
  'zeno-sist2':          'search',
  'zeno-searxng-redis':  'search',
  'mydia':               'media',
};

export const ALL_NAMESPACES = ['global', 'analytics', 'search', 'media', 'finance', 'devtools'];

export interface Skill {
  id: string;
  name: string;
  description: string;
  code: string;
  tags: string[];
  namespace: string;
  createdAt: number;
  successCount: number;
  failureCount: number;
}

export interface SkillMatch extends Skill { similarity: number; }

export class SkillManager {
  private db: Database.Database;
  private openai: OpenAI;

  constructor() {
    mkdirSync(join(__dirname, 'db'), { recursive: true });
    mkdirSync(LIBRARY_PATH, { recursive: true });
    // Upewnij się że podfoldery namespace istnieją
    for (const ns of ALL_NAMESPACES) {
      mkdirSync(join(LIBRARY_PATH, ns), { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseURL: 'https://api.openai.com/v1',
    });

    console.log(`[SkillManager] DB: ${DB_PATH}`);
    console.log(`[SkillManager] Skills w bazie: ${this.count()}`);
  }

  private initSchema() {
    // Krok 1: utwórz tabelę (bez indeksu namespace — może nie istnieć w starej bazie)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL UNIQUE,
        description   TEXT NOT NULL,
        code          TEXT NOT NULL,
        tags          TEXT NOT NULL DEFAULT '[]',
        embedding     TEXT NOT NULL DEFAULT '[]',
        namespace     TEXT NOT NULL DEFAULT 'global',
        created_at    INTEGER NOT NULL,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
    `);

    // Krok 2: migracja — dodaj namespace jeśli kolumna nie istnieje (stare bazy)
    const cols = (this.db.prepare("PRAGMA table_info(skills)").all() as { name: string }[]).map(c => c.name);
    if (!cols.includes('namespace')) {
      this.db.exec(`ALTER TABLE skills ADD COLUMN namespace TEXT NOT NULL DEFAULT 'global'`);
      console.log('[SkillManager] Migracja: dodano kolumnę namespace');
    }

    // Krok 3: indeks namespace (dopiero po upewnieniu się że kolumna istnieje)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_skills_namespace ON skills(namespace);`);
  }

  private async embed(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) return this.hashEmbed(text);
    const res = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 512,
    });
    return res.data[0].embedding;
  }

  private hashEmbed(text: string): number[] {
    const vec = new Array(512).fill(0);
    for (let i = 0; i < text.length; i++) vec[i % 512] += text.charCodeAt(i) / 1000;
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  private cosine(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }

  /** Zapisz skill — namespace wymagany, default 'global' */
  async save(
    skill: Omit<Skill, 'id' | 'createdAt' | 'successCount' | 'failureCount'> & { namespace?: string }
  ): Promise<Skill> {
    const ns = skill.namespace ?? 'global';
    const embedding = await this.embed(`${skill.name} ${skill.description} ${skill.tags.join(' ')}`);
    const id  = randomUUID();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO skills (id, name, description, code, tags, embedding, namespace, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        description = excluded.description,
        code        = excluded.code,
        tags        = excluded.tags,
        embedding   = excluded.embedding,
        namespace   = excluded.namespace
    `).run(id, skill.name, skill.description, skill.code,
           JSON.stringify(skill.tags), JSON.stringify(embedding), ns, now);

    // Zapisz .ts w library/{namespace}/
    mkdirSync(join(LIBRARY_PATH, ns), { recursive: true });
    const filename = skill.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.ts';
    writeFileSync(
      join(LIBRARY_PATH, ns, filename),
      `// Skill: ${skill.name}\n// Namespace: ${ns}\n// ${skill.description}\n// Tags: ${skill.tags.join(', ')}\n\n${skill.code}\n`,
    );

    return this.getByName(skill.name)!;
  }

  /**
   * Szukaj skills semantycznie.
   * @param namespaces - filtr namespace (puste = szukaj wszędzie)
   */
  async search(
    query: string,
    topK = 5,
    minSimilarity = 0.3,
    namespaces: string[] = [],
  ): Promise<SkillMatch[]> {
    const queryEmbed = await this.embed(query);
    const rows = (namespaces.length > 0
      ? this.db.prepare(
          `SELECT * FROM skills WHERE namespace IN (${namespaces.map(() => '?').join(',')}) OR namespace = 'global'`
        ).all(...namespaces)
      : this.db.prepare('SELECT * FROM skills').all()
    ) as any[];

    return rows
      .map(row => ({
        ...this.rowToSkill(row),
        similarity: this.cosine(queryEmbed, JSON.parse(row.embedding ?? '[]')),
      }))
      .filter(s => s.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  getByName(name: string): Skill | null {
    const row = this.db.prepare('SELECT * FROM skills WHERE name = ?').get(name) as any;
    return row ? this.rowToSkill(row) : null;
  }

  getById(id: string): Skill | null {
    const row = this.db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as any;
    return row ? this.rowToSkill(row) : null;
  }

  /** Lista skills — opcjonalnie filtruj po namespace */
  list(namespace?: string): Omit<Skill, never>[] {
    const rows = namespace
      ? (this.db.prepare(
          'SELECT id,name,description,tags,namespace,created_at,success_count,failure_count FROM skills WHERE namespace = ? ORDER BY success_count DESC'
        ).all(namespace) as any[])
      : (this.db.prepare(
          'SELECT id,name,description,tags,namespace,created_at,success_count,failure_count FROM skills ORDER BY namespace, success_count DESC'
        ).all() as any[]);
    return rows.map(row => ({ ...this.rowToSkill(row), code: '[użyj getById]' }));
  }

  /** Liczba skills per namespace */
  countByNamespace(): Record<string, number> {
    const rows = this.db.prepare(
      'SELECT namespace, COUNT(*) as n FROM skills GROUP BY namespace'
    ).all() as { namespace: string; n: number }[];
    const result: Record<string, number> = { global: 0 };
    for (const r of rows) result[r.namespace] = r.n;
    return result;
  }

  recordResult(id: string, success: boolean) {
    const col = success ? 'success_count' : 'failure_count';
    this.db.prepare(`UPDATE skills SET ${col} = ${col} + 1 WHERE id = ?`).run(id);
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM skills WHERE id = ?').run(id).changes > 0;
  }

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) as n FROM skills').get() as any).n;
  }

  private rowToSkill(row: any): Skill {
    return {
      id:           row.id,
      name:         row.name,
      description:  row.description,
      code:         row.code ?? '',
      tags:         JSON.parse(row.tags ?? '[]'),
      namespace:    row.namespace ?? 'global',
      createdAt:    row.created_at,
      successCount: row.success_count,
      failureCount: row.failure_count,
    };
  }
}
