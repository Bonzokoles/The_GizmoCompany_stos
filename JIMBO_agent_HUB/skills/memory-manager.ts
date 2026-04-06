/**
 * MemoryManager — Letta-style 3-tier memory dla JIMBO Agent HUB
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TIER 1 — Core Memory (zawsze w kontekście, ~1500 tokenów)      │
 * │  SQLite: core_memory(key, value, updated_at)                    │
 * │  Wpisy: persona, human, project, goals, ...                     │
 * │  → wstrzykiwane do system prompt (statyczne, cacheable)         │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  TIER 2 — Archival Memory (nieograniczone, wektorowe)           │
 * │  SQLite: archival_memory(id, content, source, tags, embedding)  │
 * │  → semantyczne wyszukiwanie przed każdym chatem                 │
 * │  → wstrzykiwane jako user message prefix (Hermes pattern)       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  TIER 3 — Recall Memory (historia konwersacji, FTS5)            │
 * │  SQLite: recall_memory + recall_fts (FTS5 virtual table)        │
 * │  → zapis po każdej turze chatu                                  │
 * │  → keyword search przed chatem → recent context prefix          │
 * └─────────────────────────────────────────────────────────────────┘
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DB_PATH    = join(__dirname, 'db', 'memory.db');

// ── Typy ────────────────────────────────────────────────────────────────────

export interface CoreEntry {
  key:       string;
  value:     string;
  updatedAt: number;
}

export interface ArchivalEntry {
  id:        string;
  content:   string;
  source:    string;
  tags:      string[];
  createdAt: number;
}

export interface ArchivalMatch extends ArchivalEntry { similarity: number; }

export interface RecallEntry {
  id:        string;
  sessionId: string;
  role:      string;
  content:   string;
  createdAt: number;
}

// ── MemoryManager ────────────────────────────────────────────────────────────

export class MemoryManager {
  private db: Database.Database;
  private openai: OpenAI;
  private embedCache = new Map<string, number[]>();

  /** Domyślne wpisy core memory — ładowane przy pierwszym starcie */
  private static readonly CORE_DEFAULTS: CoreEntry[] = [
    {
      key: 'persona',
      value: 'Jesteś JIMBO — lokalny asystent AI zintegrowany z ZENO Browser. ' +
             'Jesteś zwięzły, techniczny, pomocny. Masz dostęp do Goose AI, ' +
             'lokalnych serwisów (Meilisearch, Umami, Plausible, Sist2) i bazy skills.',
      updatedAt: Date.now(),
    },
    {
      key: 'project',
      value: 'ZENO Browser: Electron + React 19 + Vite + TypeScript + Cloudflare Pages/Workers/D1/R2. ' +
             'Hub: port 4224. Web: zenbrowsers.org. Katalog: U:\\WWW_Zen_BRo_wser_org3.',
      updatedAt: Date.now(),
    },
    {
      key: 'human',
      value: 'Właściciel projektu: Bonzo. Preferuje odpowiedzi po polsku lub angielsku. ' +
             'Zaawansowany użytkownik — nie tłumacz podstaw.',
      updatedAt: Date.now(),
    },
    {
      key: 'goals',
      value: 'Aktualny cel: rozbudowa JIMBO Agent HUB (Etap 2 — stabilizacja). ' +
             'Kolejne etapy: Letta memory, OpenEvolve optimizer, EvoAgentX multi-agent.',
      updatedAt: Date.now(),
    },
  ];

  constructor() {
    mkdirSync(join(__dirname, 'db'), { recursive: true });
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseURL: 'https://api.openai.com/v1',
    });

    console.log(`[MemoryManager] DB: ${DB_PATH}`);
    this.seedCoreIfEmpty();
  }

  // ── Schema ──────────────────────────────────────────────────────────────────

  private initSchema() {
    this.db.exec(`
      -- TIER 1: Core Memory
      CREATE TABLE IF NOT EXISTS core_memory (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- TIER 2: Archival Memory
      CREATE TABLE IF NOT EXISTS archival_memory (
        id         TEXT PRIMARY KEY,
        content    TEXT NOT NULL,
        source     TEXT NOT NULL DEFAULT '',
        tags       TEXT NOT NULL DEFAULT '[]',
        embedding  TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_archival_source ON archival_memory(source);

      -- TIER 3: Recall Memory (konwersacje)
      CREATE TABLE IF NOT EXISTS recall_memory (
        id         TEXT PRIMARY KEY,
        session_id TEXT NOT NULL DEFAULT '',
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recall_session ON recall_memory(session_id);
      CREATE INDEX IF NOT EXISTS idx_recall_time    ON recall_memory(created_at DESC);
    `);

    // FTS5 virtual table dla recall — osobna od głównej tabeli
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS recall_fts
        USING fts5(id UNINDEXED, role, content, tokenize='unicode61');
    `);

    // Trigger: sync FTS5 przy DELETE z recall_memory (zapobiega zombie entries)
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS recall_fts_delete
        AFTER DELETE ON recall_memory BEGIN
          DELETE FROM recall_fts WHERE id = old.id;
        END;
    `);
  }

  private seedCoreIfEmpty() {
    const count = (this.db.prepare('SELECT COUNT(*) as n FROM core_memory').get() as any).n;
    if (count > 0) return;
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO core_memory (key, value, updated_at) VALUES (?, ?, ?)'
    );
    const tx = this.db.transaction(() => {
      for (const e of MemoryManager.CORE_DEFAULTS) {
        insert.run(e.key, e.value, e.updatedAt);
      }
    });
    tx();
    console.log(`[MemoryManager] Core memory zainicjalizowana (${MemoryManager.CORE_DEFAULTS.length} wpisów)`);
  }

  // ── Embeddings ──────────────────────────────────────────────────────────────

  private async embed(text: string): Promise<number[]> {
    const key = text.slice(0, 100);
    if (this.embedCache.has(key)) return this.embedCache.get(key)!;
    const vec = !process.env.OPENAI_API_KEY
      ? this.hashEmbed(text)
      : (await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000),
          dimensions: 512,
        })).data[0].embedding;
    if (this.embedCache.size >= 20) this.embedCache.delete(this.embedCache.keys().next().value!);
    this.embedCache.set(key, vec);
    return vec;
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

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 1 — CORE MEMORY
  // ────────────────────────────────────────────────────────────────────────────

  /** Zwraca wszystkie wpisy core memory */
  getCoreAll(): CoreEntry[] {
    return (this.db.prepare('SELECT * FROM core_memory ORDER BY key').all() as any[])
      .map(r => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));
  }

  /** Zwraca jeden wpis */
  getCoreEntry(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM core_memory WHERE key = ?').get(key) as any;
    return row?.value ?? null;
  }

  /** Zapisz lub zaktualizuj wpis core memory */
  setCoreEntry(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO core_memory (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value.slice(0, 2000), Date.now());
  }

  /** Usuń wpis */
  deleteCoreEntry(key: string): boolean {
    return this.db.prepare('DELETE FROM core_memory WHERE key = ?').run(key).changes > 0;
  }

  /**
   * Formatuje core memory do wstrzyknięcia w system prompt.
   * ~200-400 tokenów dla domyślnych 4 wpisów.
   */
  formatCoreForPrompt(): string {
    const entries = this.getCoreAll();
    if (entries.length === 0) return '';
    const lines = entries.map(e => `[${e.key.toUpperCase()}]\n${e.value}`).join('\n\n');
    return `\n\n─── CORE MEMORY ───\n${lines}\n─────────────────`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 2 — ARCHIVAL MEMORY
  // ────────────────────────────────────────────────────────────────────────────

  /** Zapisz do archiwum */
  async saveArchival(
    content: string,
    source  = 'manual',
    tags:   string[] = [],
  ): Promise<string> {
    const id        = randomUUID();
    const embedding = await this.embed(content);
    this.db.prepare(`
      INSERT INTO archival_memory (id, content, source, tags, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, content.slice(0, 4000), source, JSON.stringify(tags), JSON.stringify(embedding), Date.now());
    return id;
  }

  /** Semantyczne wyszukiwanie w archiwum */
  async searchArchival(
    query:         string,
    topK           = 3,
    minSimilarity  = 0.55,
  ): Promise<ArchivalMatch[]> {
    const queryEmbed = await this.embed(query);
    // Pre-filter: ostatnie 500 wpisów zamiast ładowania całej tabeli do RAM
    const rows = this.db.prepare('SELECT * FROM archival_memory ORDER BY created_at DESC LIMIT 500').all() as any[];
    return rows
      .map(row => ({
        id:        row.id,
        content:   row.content,
        source:    row.source,
        tags:      JSON.parse(row.tags ?? '[]'),
        createdAt: row.created_at,
        similarity: this.cosine(queryEmbed, JSON.parse(row.embedding ?? '[]')),
      }))
      .filter(m => m.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  listArchival(limit = 50): ArchivalEntry[] {
    return (this.db.prepare(
      'SELECT id, content, source, tags, created_at FROM archival_memory ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as any[]).map(r => ({
      id: r.id, content: r.content, source: r.source,
      tags: JSON.parse(r.tags ?? '[]'), createdAt: r.created_at,
    }));
  }

  deleteArchival(id: string): boolean {
    return this.db.prepare('DELETE FROM archival_memory WHERE id = ?').run(id).changes > 0;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 3 — RECALL MEMORY
  // ────────────────────────────────────────────────────────────────────────────

  /** Zapisz turę konwersacji */
  saveRecall(role: string, content: string, sessionId = ''): string {
    const id  = randomUUID();
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO recall_memory (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sessionId, role, content.slice(0, 8000), now);
    // Sync do FTS5
    this.db.prepare(`
      INSERT INTO recall_fts (id, role, content) VALUES (?, ?, ?)
    `).run(id, role, content.slice(0, 8000));
    return id;
  }

  /** FTS5 keyword search po historii konwersacji */
  searchRecall(query: string, limit = 5): RecallEntry[] {
    try {
      const rows = this.db.prepare(`
        SELECT r.* FROM recall_memory r
        JOIN recall_fts f ON r.id = f.id
        WHERE recall_fts MATCH ?
        ORDER BY r.created_at DESC
        LIMIT ?
      `).all(query.replace(/['"*]/g, ' ').trim() + '*', limit) as any[];
      return rows.map(r => ({
        id: r.id, sessionId: r.session_id, role: r.role,
        content: r.content, createdAt: r.created_at,
      }));
    } catch {
      return []; // FTS5 query syntax error — nie blokuj
    }
  }

  /** Ostatnie N wpisów recall (opcjonalnie filtr po sesji) */
  getRecentRecall(limit = 10, sessionId?: string): RecallEntry[] {
    const rows = sessionId
      ? (this.db.prepare(
          'SELECT * FROM recall_memory WHERE session_id = ? ORDER BY created_at DESC LIMIT ?'
        ).all(sessionId, limit) as any[])
      : (this.db.prepare(
          'SELECT * FROM recall_memory ORDER BY created_at DESC LIMIT ?'
        ).all(limit) as any[]);
    return rows.map(r => ({
      id: r.id, sessionId: r.session_id, role: r.role,
      content: r.content, createdAt: r.created_at,
    }));
  }

  /** Formatuje recall jako user message prefix */
  formatRecallForPrefix(matches: RecallEntry[]): string {
    if (matches.length === 0) return '';
    const lines = matches
      .slice(0, 3)
      .map(m => `[${m.role} @ ${new Date(m.createdAt).toLocaleDateString('pl')}]: ${m.content.slice(0, 600)}`)
      .join('\n');
    return `[Relevant conversation history:\n${lines}\n]\n\n`;
  }

  countRecall(): number {
    return (this.db.prepare('SELECT COUNT(*) as n FROM recall_memory').get() as any).n;
  }

  countArchival(): number {
    return (this.db.prepare('SELECT COUNT(*) as n FROM archival_memory').get() as any).n;
  }
}
