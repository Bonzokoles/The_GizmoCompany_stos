/**
 * Catalog Service — Local file library browser with SQLite FTS5 indexing
 * Scans configured directories for .md, .json, .txt, .html files
 * Provides full-text search and file tree navigation
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface CatalogEntry {
  id: number;
  filePath: string;
  fileName: string;
  extension: string;
  directory: string;
  content: string;
  size: number;
  modifiedAt: string;
  indexedAt: string;
}

export interface CatalogSearchResult {
  id: number;
  filePath: string;
  fileName: string;
  snippet: string;
  rank: number;
}

export interface CatalogTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: CatalogTreeNode[];
}

export interface LibraryConfig {
  id: string;
  name: string;
  rootPath: string;
  extensions: string[];
  enabled: boolean;
}

const SUPPORTED_EXTENSIONS = ['.md', '.json', '.txt', '.html', '.csv', '.xml', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export class CatalogService {
  private db: Database.Database;
  private libraries: LibraryConfig[] = [];

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'catalog.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS libraries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rootPath TEXT NOT NULL,
        extensions TEXT NOT NULL DEFAULT '.md,.json,.txt',
        enabled INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        libraryId TEXT NOT NULL,
        filePath TEXT NOT NULL UNIQUE,
        fileName TEXT NOT NULL,
        extension TEXT NOT NULL,
        directory TEXT NOT NULL,
        content TEXT NOT NULL,
        size INTEGER NOT NULL,
        modifiedAt TEXT NOT NULL,
        indexedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (libraryId) REFERENCES libraries(id)
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(
        fileName,
        content,
        filePath,
        content='catalog',
        content_rowid='id',
        tokenize='unicode61'
      );

      CREATE TRIGGER IF NOT EXISTS catalog_ai AFTER INSERT ON catalog BEGIN
        INSERT INTO catalog_fts(rowid, fileName, content, filePath)
        VALUES (new.id, new.fileName, new.content, new.filePath);
      END;

      CREATE TRIGGER IF NOT EXISTS catalog_ad AFTER DELETE ON catalog BEGIN
        INSERT INTO catalog_fts(catalog_fts, rowid, fileName, content, filePath)
        VALUES ('delete', old.id, old.fileName, old.content, old.filePath);
      END;

      CREATE TRIGGER IF NOT EXISTS catalog_au AFTER UPDATE ON catalog BEGIN
        INSERT INTO catalog_fts(catalog_fts, rowid, fileName, content, filePath)
        VALUES ('delete', old.id, old.fileName, old.content, old.filePath);
        INSERT INTO catalog_fts(rowid, fileName, content, filePath)
        VALUES (new.id, new.fileName, new.content, new.filePath);
      END;
    `);

    // Load libraries from DB
    const rows = this.db.prepare('SELECT * FROM libraries').all() as any[];
    this.libraries = rows.map(r => ({
      id: r.id,
      name: r.name,
      rootPath: r.rootPath,
      extensions: r.extensions.split(','),
      enabled: r.enabled === 1,
    }));
  }

  // ── Library management ───────────────────────────────────────

  addLibrary(name: string, rootPath: string, extensions?: string[]): LibraryConfig {
    const resolvedPath = path.resolve(rootPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Ścieżka nie istnieje: ${resolvedPath}`);
    }

    const id = `lib-${Date.now()}`;
    const exts = extensions ?? SUPPORTED_EXTENSIONS;

    this.db.prepare(
      'INSERT INTO libraries (id, name, rootPath, extensions, enabled) VALUES (?, ?, ?, ?, 1)'
    ).run(id, name, resolvedPath, exts.join(','));

    const lib: LibraryConfig = { id, name, rootPath: resolvedPath, extensions: exts, enabled: true };
    this.libraries.push(lib);
    return lib;
  }

  removeLibrary(libraryId: string): void {
    this.db.prepare('DELETE FROM catalog WHERE libraryId = ?').run(libraryId);
    this.db.prepare('DELETE FROM libraries WHERE id = ?').run(libraryId);
    this.libraries = this.libraries.filter(l => l.id !== libraryId);
  }

  getLibraries(): LibraryConfig[] {
    return [...this.libraries];
  }

  // ── Indexing ─────────────────────────────────────────────────

  indexLibrary(libraryId: string): { indexed: number; skipped: number; errors: number } {
    const lib = this.libraries.find(l => l.id === libraryId);
    if (!lib) throw new Error(`Biblioteka nie znaleziona: ${libraryId}`);
    if (!fs.existsSync(lib.rootPath)) throw new Error(`Ścieżka nie istnieje: ${lib.rootPath}`);

    let indexed = 0, skipped = 0, errors = 0;

    const upsert = this.db.prepare(`
      INSERT INTO catalog (libraryId, filePath, fileName, extension, directory, content, size, modifiedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(filePath) DO UPDATE SET
        content = excluded.content,
        size = excluded.size,
        modifiedAt = excluded.modifiedAt,
        indexedAt = datetime('now')
    `);

    const scanDir = (dirPath: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch {
        errors++;
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!lib.extensions.includes(ext)) { skipped++; continue; }

          try {
            const stats = fs.statSync(fullPath);
            if (stats.size > MAX_FILE_SIZE) { skipped++; continue; }

            const content = fs.readFileSync(fullPath, 'utf-8');
            const modifiedAt = stats.mtime.toISOString();

            upsert.run(lib.id, fullPath, entry.name, ext, path.dirname(fullPath), content, stats.size, modifiedAt);
            indexed++;
          } catch {
            errors++;
          }
        }
      }
    };

    const runTransaction = this.db.transaction(() => scanDir(lib.rootPath));
    runTransaction();

    return { indexed, skipped, errors };
  }

  indexAll(): { total: number; errors: number } {
    let total = 0, errors = 0;
    for (const lib of this.libraries.filter(l => l.enabled)) {
      try {
        const result = this.indexLibrary(lib.id);
        total += result.indexed;
        errors += result.errors;
      } catch {
        errors++;
      }
    }
    return { total, errors };
  }

  // ── Search ───────────────────────────────────────────────────

  search(query: string, libraryId?: string, limit = 20): CatalogSearchResult[] {
    let sql = `
      SELECT c.id, c.filePath, c.fileName,
             snippet(catalog_fts, 1, '<mark>', '</mark>', '...', 40) AS snippet,
             rank
      FROM catalog_fts
      JOIN catalog c ON c.id = catalog_fts.rowid
    `;

    const params: any[] = [query];

    if (libraryId) {
      sql += ' WHERE catalog_fts MATCH ? AND c.libraryId = ?';
      params.push(libraryId);
    } else {
      sql += ' WHERE catalog_fts MATCH ?';
    }

    sql += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    return this.db.prepare(sql).all(...params) as CatalogSearchResult[];
  }

  // ── File operations ──────────────────────────────────────────

  readFile(filePath: string): { content: string; size: number; modifiedAt: string } | null {
    const resolvedPath = path.resolve(filePath);

    // Security: only allow reading from registered libraries
    const isInLibrary = this.libraries.some(lib => resolvedPath.startsWith(lib.rootPath));
    if (!isInLibrary) return null;

    try {
      const stats = fs.statSync(resolvedPath);
      if (stats.size > MAX_FILE_SIZE) return null;
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      return { content, size: stats.size, modifiedAt: stats.mtime.toISOString() };
    } catch {
      return null;
    }
  }

  getFileTree(libraryId: string): CatalogTreeNode | null {
    const lib = this.libraries.find(l => l.id === libraryId);
    if (!lib || !fs.existsSync(lib.rootPath)) return null;

    const buildTree = (dirPath: string): CatalogTreeNode => {
      const name = path.basename(dirPath);
      const node: CatalogTreeNode = { name, path: dirPath, type: 'directory', children: [] };

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch {
        return node;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          node.children!.push(buildTree(fullPath));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (lib.extensions.includes(ext)) {
            try {
              const stats = fs.statSync(fullPath);
              node.children!.push({
                name: entry.name,
                path: fullPath,
                type: 'file',
                extension: ext,
                size: stats.size,
              });
            } catch { /* skip */ }
          }
        }
      }

      // Sort: directories first, then files alphabetically
      node.children!.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return node;
    };

    return buildTree(lib.rootPath);
  }

  getStats(): { libraries: number; files: number; totalSize: number } {
    const row = this.db.prepare('SELECT COUNT(*) as files, COALESCE(SUM(size), 0) as totalSize FROM catalog').get() as any;
    return {
      libraries: this.libraries.length,
      files: row.files,
      totalSize: row.totalSize,
    };
  }

  close(): void {
    this.db.close();
  }
}
