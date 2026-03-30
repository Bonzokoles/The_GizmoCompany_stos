/**
 * MCP Database Tools — local SQLite storage for ZENO Browser
 * Uses better-sqlite3 for embedded database
 */

import type { MCPTool } from '../mcp-server';
import path from 'path';
import { app } from 'electron';
import BetterSqlite3 from 'better-sqlite3';

let Database: typeof BetterSqlite3;
let db: BetterSqlite3.Database;

function getDB() {
  if (db) return db;
  try {
    Database = BetterSqlite3;
    const dbPath = path.join(app.getPath('userData'), 'zeno-data.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    console.log(`🗄️ Database opened: ${dbPath}`);
    return db;
  } catch (err: any) {
    console.error('Database init failed:', err.message);
    return null;
  }
}

function initSchema() {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS network_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      host TEXT,
      result TEXT,
      latency_ms REAL,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      tags TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS browsing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      visited_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_kv_category ON kv_store(category);
    CREATE INDEX IF NOT EXISTS idx_netlog_type ON network_log(type);
    CREATE INDEX IF NOT EXISTS idx_netlog_host ON network_log(host);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks(tags);
    CREATE INDEX IF NOT EXISTS idx_history_url ON browsing_history(url);
  `);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function createDatabaseTools(): MCPTool[] {
  return [
    // ── Key-Value Store ──
    {
      name: 'db_kv_set',
      description: 'Store a key-value pair in the local database',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key name' },
          value: { type: 'string', description: 'Value (JSON string for complex data)' },
          category: { type: 'string', description: 'Optional category (default: general)' },
        },
        required: ['key', 'value'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const key = str(input.key);
        const value = str(input.value);
        const category = str(input.category) || 'general';

        database.prepare(
          `INSERT INTO kv_store (key, value, category, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, category=excluded.category, updated_at=datetime('now')`
        ).run(key, value, category);

        return { ok: true, key, category };
      },
    },

    {
      name: 'db_kv_get',
      description: 'Get a value from the key-value store',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key name' },
        },
        required: ['key'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const row = database.prepare('SELECT * FROM kv_store WHERE key = ?').get(str(input.key));
        return row || { found: false };
      },
    },

    {
      name: 'db_kv_list',
      description: 'List all keys in a category',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category filter (default: all)' },
        },
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const category = str(input.category);
        const rows = category
          ? database.prepare('SELECT key, category, updated_at FROM kv_store WHERE category = ? ORDER BY key').all(category)
          : database.prepare('SELECT key, category, updated_at FROM kv_store ORDER BY category, key').all();

        return { count: rows.length, items: rows };
      },
    },

    {
      name: 'db_kv_delete',
      description: 'Delete a key from the store',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key to delete' },
        },
        required: ['key'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const result = database.prepare('DELETE FROM kv_store WHERE key = ?').run(str(input.key));
        return { deleted: result.changes > 0 };
      },
    },

    // ── Network Logging ──
    {
      name: 'db_net_log',
      description: 'Log a network scan/check result',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Log type: ping, port_scan, dns, http_check, traceroute' },
          host: { type: 'string', description: 'Target host' },
          result: { type: 'string', description: 'Result (JSON string)' },
          latency_ms: { type: 'number', description: 'Latency in ms (optional)' },
        },
        required: ['type', 'result'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const info = database.prepare(
          'INSERT INTO network_log (type, host, result, latency_ms) VALUES (?, ?, ?, ?)'
        ).run(str(input.type), str(input.host), str(input.result), input.latency_ms ?? null);

        return { ok: true, id: info.lastInsertRowid };
      },
    },

    {
      name: 'db_net_history',
      description: 'Get network scan history',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by type (optional)' },
          host: { type: 'string', description: 'Filter by host (optional)' },
          limit: { type: 'number', description: 'Max results (default: 50)' },
        },
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const limit = Math.min(Number(input.limit) || 50, 500);
        const type = str(input.type);
        const host = str(input.host);

        let sql = 'SELECT * FROM network_log WHERE 1=1';
        const params: unknown[] = [];

        if (type) { sql += ' AND type = ?'; params.push(type); }
        if (host) { sql += ' AND host = ?'; params.push(host); }
        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const rows = database.prepare(sql).all(...params);
        return { count: rows.length, logs: rows };
      },
    },

    // ── Bookmarks ──
    {
      name: 'db_bookmark_add',
      description: 'Save a bookmark',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to bookmark' },
          title: { type: 'string', description: 'Title' },
          tags: { type: 'string', description: 'Comma-separated tags' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['url'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const info = database.prepare(
          'INSERT INTO bookmarks (url, title, tags, notes) VALUES (?, ?, ?, ?)'
        ).run(str(input.url), str(input.title), str(input.tags), str(input.notes));

        return { ok: true, id: info.lastInsertRowid };
      },
    },

    {
      name: 'db_bookmark_search',
      description: 'Search bookmarks by title, URL, or tags',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (matches title, url, tags)' },
          limit: { type: 'number', description: 'Max results (default: 50)' },
        },
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const query = str(input.query);
        const limit = Math.min(Number(input.limit) || 50, 500);

        const rows = query
          ? database.prepare(
            'SELECT * FROM bookmarks WHERE url LIKE ? OR title LIKE ? OR tags LIKE ? ORDER BY created_at DESC LIMIT ?'
          ).all(`%${query}%`, `%${query}%`, `%${query}%`, limit)
          : database.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC LIMIT ?').all(limit);

        return { count: rows.length, bookmarks: rows };
      },
    },

    {
      name: 'db_bookmark_delete',
      description: 'Delete a bookmark by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Bookmark ID' },
        },
        required: ['id'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const result = database.prepare('DELETE FROM bookmarks WHERE id = ?').run(Number(input.id));
        return { deleted: result.changes > 0 };
      },
    },

    // ── Raw SQL (read-only) ──
    {
      name: 'db_query',
      description: 'Execute a read-only SQL query on the local database. Tables: kv_store, network_log, bookmarks, browsing_history',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SELECT query (read-only)' },
        },
        required: ['sql'],
      },
      handler: async (input) => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const sql = str(input.sql).trim();

        // Only allow SELECT statements
        if (!/^SELECT\b/i.test(sql)) {
          return { error: 'Only SELECT queries allowed' };
        }
        // Block dangerous patterns
        if (/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|ATTACH|DETACH)\b/i.test(sql)) {
          return { error: 'Only SELECT queries allowed' };
        }

        try {
          const rows = database.prepare(sql).all();
          return { count: rows.length, rows: rows.slice(0, 200) };
        } catch (err: unknown) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },

    // ── Database Info ──
    {
      name: 'db_info',
      description: 'Get database statistics and table info',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const database = getDB();
        if (!database) return { error: 'Database not available' };

        const tables = database.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).all();

        const stats: Record<string, number> = {};
        for (const t of tables) {
          const row = database.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
          stats[t.name] = row?.count ?? 0;
        }

        return {
          tables: tables.map((t: any) => t.name),
          rowCounts: stats,
          dbPath: path.join(app.getPath('userData'), 'zeno-data.db'),
        };
      },
    },
  ];
}
