/**
 * SyncService — Bidirectional sync between local SQLite and Cloudflare (D1 + R2)
 * 
 * LOCAL → CLOUD: Create article locally → publish to D1 + upload images to R2
 * CLOUD → LOCAL: Pull articles/events from CF API → store in local SQLite
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app, ipcMain } from 'electron';

export interface SyncConfig {
  apiBase: string;     // https://zenbrowsers.org
  syncInterval: number; // ms between auto-syncs (0 = manual only)
}

interface SyncRecord {
  id: string;
  type: 'article' | 'image' | 'event';
  localId: string;
  remoteId: string | null;
  direction: 'push' | 'pull';
  status: 'pending' | 'synced' | 'error';
  lastSynced: string | null;
  error: string | null;
}

export class SyncService {
  private db: Database.Database;
  private config: SyncConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      apiBase: config?.apiBase || 'https://zenbrowsers.org',
      syncInterval: config?.syncInterval || 0,
    };

    const dbPath = path.join(app.getPath('userData'), 'zeno-sync.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(`
      -- Sync log: tracks what was synced and when
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('article', 'image', 'event')),
        local_id TEXT NOT NULL,
        remote_id TEXT,
        direction TEXT NOT NULL CHECK(direction IN ('push', 'pull')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'synced', 'error')),
        last_synced TEXT,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Local articles
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        content TEXT NOT NULL DEFAULT '',
        excerpt TEXT,
        cover_image TEXT,
        category TEXT DEFAULT 'general',
        tags TEXT DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
        language TEXT DEFAULT 'pl',
        author TEXT DEFAULT 'Jimbo',
        seo_title TEXT,
        seo_description TEXT,
        published_at TEXT,
        synced_at TEXT,
        remote_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Local images (attached to articles or standalone)
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        article_id TEXT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT DEFAULT 'image/png',
        size_bytes INTEGER DEFAULT 0,
        width INTEGER,
        height INTEGER,
        alt_text TEXT,
        remote_url TEXT,
        synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
      );

      -- Cached pipeline events (pulled from CF)
      CREATE TABLE IF NOT EXISTS cached_events (
        id TEXT PRIMARY KEY,
        pipeline_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT DEFAULT '{}',
        source TEXT,
        timestamp TEXT NOT NULL,
        pulled_at TEXT DEFAULT (datetime('now'))
      );

      -- Cached analytics (pulled from Umami)
      CREATE TABLE IF NOT EXISTS cached_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        period TEXT NOT NULL,
        data TEXT NOT NULL,
        pulled_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
      CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
      CREATE INDEX IF NOT EXISTS idx_images_article ON images(article_id);
      CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
      CREATE INDEX IF NOT EXISTS idx_cached_events_pipeline ON cached_events(pipeline_id);
    `);

    console.log('📦 SyncService: Database initialized');
  }

  /** Register all IPC handlers */
  registerIPC(): void {
    // ── Articles CRUD ──
    ipcMain.handle('cms:create-article', (_e, data: Partial<ArticleInput>) =>
      this.createArticle(data));
    ipcMain.handle('cms:update-article', (_e, id: string, data: Partial<ArticleInput>) =>
      this.updateArticle(id, data));
    ipcMain.handle('cms:delete-article', (_e, id: string) =>
      this.deleteArticle(id));
    ipcMain.handle('cms:get-article', (_e, id: string) =>
      this.getArticle(id));
    ipcMain.handle('cms:list-articles', (_e, filter?: { status?: string; category?: string }) =>
      this.listArticles(filter));

    // ── Images ──
    ipcMain.handle('cms:save-image', (_e, data: { articleId?: string; fileName: string; base64: string; altText?: string }) =>
      this.saveImage(data));
    ipcMain.handle('cms:list-images', (_e, articleId?: string) =>
      this.listImages(articleId));
    ipcMain.handle('cms:delete-image', (_e, imageId: string) =>
      this.deleteImage(imageId));

    // ── Publish (Local → Cloud) ──
    ipcMain.handle('cms:publish-article', (_e, articleId: string) =>
      this.publishArticle(articleId));
    ipcMain.handle('cms:unpublish-article', (_e, articleId: string) =>
      this.unpublishArticle(articleId));

    // ── Sync ──
    ipcMain.handle('sync:pull-articles', () => this.pullArticles());
    ipcMain.handle('sync:pull-events', (_e, limit?: number) => this.pullEvents(limit));
    ipcMain.handle('sync:pull-analytics', (_e, siteId?: string) => this.pullAnalytics(siteId));
    ipcMain.handle('sync:status', () => this.getSyncStatus());
    ipcMain.handle('sync:get-cached-events', (_e, pipelineId?: string, limit?: number) =>
      this.getCachedEvents(pipelineId, limit));

    // ── File save to disk ──
    ipcMain.handle('file:save-to-disk', (_e, data: { base64: string; fileName: string; directory?: string }) =>
      this.saveFileToDisk(data));
  }

  // ═══════════════════════════════════════════════════════════
  //  Articles CRUD (local SQLite)
  // ═══════════════════════════════════════════════════════════

  createArticle(data: Partial<ArticleInput>): { success: boolean; data?: any; error?: string } {
    try {
      const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const slug = this.slugify(data.title || 'untitled');

      this.db.prepare(`
        INSERT INTO articles (id, title, slug, content, excerpt, category, tags, status, language, author, seo_title, seo_description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.title || 'Bez tytułu',
        slug,
        data.content || '',
        data.excerpt || '',
        data.category || 'general',
        JSON.stringify(data.tags || []),
        data.status || 'draft',
        data.language || 'pl',
        data.author || 'Jimbo',
        data.seoTitle || data.title || '',
        data.seoDescription || data.excerpt || '',
      );

      const article = this.db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
      console.log(`📝 Article created: ${id}`);
      return { success: true, data: article };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  updateArticle(id: string, data: Partial<ArticleInput>): { success: boolean; data?: any; error?: string } {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
      if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
      if (data.excerpt !== undefined) { fields.push('excerpt = ?'); values.push(data.excerpt); }
      if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
      if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
      if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language); }
      if (data.coverImage !== undefined) { fields.push('cover_image = ?'); values.push(data.coverImage); }
      if (data.seoTitle !== undefined) { fields.push('seo_title = ?'); values.push(data.seoTitle); }
      if (data.seoDescription !== undefined) { fields.push('seo_description = ?'); values.push(data.seoDescription); }

      if (fields.length === 0) return { success: false, error: 'No fields to update' };

      fields.push("updated_at = datetime('now')");
      if (data.title !== undefined) {
        fields.push('slug = ?');
        values.push(this.slugify(data.title));
      }

      values.push(id);
      this.db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const article = this.db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
      return { success: true, data: article };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  deleteArticle(id: string): { success: boolean; error?: string } {
    try {
      // Delete associated images from disk
      const images = this.db.prepare('SELECT file_path FROM images WHERE article_id = ?').all(id) as any[];
      for (const img of images) {
        try { fs.unlinkSync(img.file_path); } catch { /* ignore */ }
      }
      this.db.prepare('DELETE FROM images WHERE article_id = ?').run(id);
      this.db.prepare('DELETE FROM articles WHERE id = ?').run(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  getArticle(id: string): any {
    const article = this.db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
    if (!article) return null;
    article.images = this.db.prepare('SELECT * FROM images WHERE article_id = ? ORDER BY created_at').all(id);
    try { article.tags = JSON.parse(article.tags); } catch { article.tags = []; }
    return article;
  }

  listArticles(filter?: { status?: string; category?: string }): any[] {
    let sql = 'SELECT * FROM articles';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) { conditions.push('status = ?'); params.push(filter.status); }
    if (filter?.category) { conditions.push('category = ?'); params.push(filter.category); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY updated_at DESC';

    const articles = this.db.prepare(sql).all(...params) as any[];
    return articles.map(a => {
      try { a.tags = JSON.parse(a.tags); } catch { a.tags = []; }
      const imgCount = this.db.prepare('SELECT COUNT(*) as cnt FROM images WHERE article_id = ?').get(a.id) as any;
      a.imageCount = imgCount?.cnt || 0;
      return a;
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  Images (local file system + SQLite tracking)
  // ═══════════════════════════════════════════════════════════

  saveImage(data: { articleId?: string; fileName: string; base64: string; altText?: string }): { success: boolean; data?: any; error?: string } {
    try {
      const imageDir = path.join(app.getPath('userData'), 'zeno-images');
      if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ext = path.extname(data.fileName) || '.png';
      const safeFileName = `${id}${ext}`;
      const filePath = path.join(imageDir, safeFileName);

      // Decode base64 and write to disk
      const buffer = Buffer.from(data.base64, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Detect mime type from extension
      const mimeMap: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      };
      const mimeType = mimeMap[ext.toLowerCase()] || 'image/png';

      this.db.prepare(`
        INSERT INTO images (id, article_id, file_name, file_path, mime_type, size_bytes, alt_text)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.articleId || null, data.fileName, filePath, mimeType, buffer.length, data.altText || '');

      console.log(`🖼️ Image saved: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return { success: true, data: { id, filePath, fileName: safeFileName, size: buffer.length } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  listImages(articleId?: string): any[] {
    if (articleId) {
      return this.db.prepare('SELECT * FROM images WHERE article_id = ? ORDER BY created_at DESC').all(articleId) as any[];
    }
    return this.db.prepare('SELECT * FROM images ORDER BY created_at DESC LIMIT 100').all() as any[];
  }

  deleteImage(imageId: string): { success: boolean; error?: string } {
    try {
      const img = this.db.prepare('SELECT file_path FROM images WHERE id = ?').get(imageId) as any;
      if (img?.file_path) {
        try { fs.unlinkSync(img.file_path); } catch { /* file already gone */ }
      }
      this.db.prepare('DELETE FROM images WHERE id = ?').run(imageId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Publish: Local → Cloud (D1 + R2)
  // ═══════════════════════════════════════════════════════════

  async publishArticle(articleId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const article = this.getArticle(articleId);
      if (!article) return { success: false, error: 'Artykuł nie znaleziony' };

      // First upload images to cloud
      const uploadedImages: { localId: string; remoteUrl: string }[] = [];
      if (article.images?.length > 0) {
        for (const img of article.images) {
          if (!fs.existsSync(img.file_path)) continue;
          const imageData = fs.readFileSync(img.file_path);
          const base64 = imageData.toString('base64');

          const resp = await fetch(`${this.config.apiBase}/api/content/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: img.file_name,
              base64,
              mimeType: img.mime_type,
              articleSlug: article.slug,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (resp.ok) {
            const result = await resp.json() as any;
            uploadedImages.push({ localId: img.id, remoteUrl: result.url });
            // Update local record with remote URL
            this.db.prepare('UPDATE images SET remote_url = ?, synced_at = datetime(\'now\') WHERE id = ?')
              .run(result.url, img.id);
          }
        }
      }

      // Replace local image references with remote URLs in content
      let publishContent = article.content;
      for (const up of uploadedImages) {
        const localImg = article.images.find((i: any) => i.id === up.localId);
        if (localImg) {
          // Replace file:// or local path references with remote URL
          publishContent = publishContent.replace(
            new RegExp(localImg.file_path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            up.remoteUrl
          );
        }
      }

      // Publish article to D1 via CF Worker
      const resp = await fetch(`${this.config.apiBase}/api/content/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          slug: article.slug,
          content: publishContent,
          excerpt: article.excerpt,
          coverImage: uploadedImages[0]?.remoteUrl || article.cover_image || null,
          category: article.category,
          tags: article.tags,
          language: article.language,
          author: article.author,
          seoTitle: article.seo_title,
          seoDescription: article.seo_description,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return { success: false, error: `Publish failed: ${err}` };
      }

      const result = await resp.json() as any;

      // Update local article status
      this.db.prepare(`
        UPDATE articles SET status = 'published', published_at = datetime('now'), synced_at = datetime('now'), remote_id = ?
        WHERE id = ?
      `).run(result.id || article.slug, articleId);

      // Log sync
      this.logSync('article', articleId, result.id || article.slug, 'push');

      const articleUrl = `${this.config.apiBase}/blog/${article.slug}`;
      console.log(`🚀 Article published: ${articleUrl}`);
      return { success: true, url: articleUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async unpublishArticle(articleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const article = this.getArticle(articleId);
      if (!article) return { success: false, error: 'Artykuł nie znaleziony' };

      const resp = await fetch(`${this.config.apiBase}/api/content/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: article.slug }),
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        return { success: false, error: `Unpublish failed: ${resp.status}` };
      }

      this.db.prepare("UPDATE articles SET status = 'draft', synced_at = datetime('now') WHERE id = ?")
        .run(articleId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Pull: Cloud → Local
  // ═══════════════════════════════════════════════════════════

  async pullArticles(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const resp = await fetch(`${this.config.apiBase}/api/content/articles`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };

      const data = await resp.json() as any;
      const articles = data.articles || [];
      let count = 0;

      const upsert = this.db.prepare(`
        INSERT INTO articles (id, title, slug, content, excerpt, cover_image, category, tags, status, language, author, seo_title, seo_description, remote_id, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          excerpt = excluded.excerpt,
          cover_image = excluded.cover_image,
          category = excluded.category,
          tags = excluded.tags,
          status = excluded.status,
          synced_at = datetime('now'),
          updated_at = datetime('now')
      `);

      for (const art of articles) {
        const localId = `art_cloud_${art.slug}`;
        upsert.run(localId, art.title, art.slug, art.content, art.excerpt || '',
          art.cover_image || null, art.category || 'general',
          JSON.stringify(art.tags || []), art.status || 'published',
          art.language || 'pl', art.author || 'Jimbo',
          art.seo_title || art.title, art.seo_description || '',
          art.id || art.slug);
        this.logSync('article', localId, art.id || art.slug, 'pull');
        count++;
      }

      return { success: true, count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async pullEvents(limit = 50): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const resp = await fetch(`${this.config.apiBase}/api/pipelines/events?limit=${limit}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };

      const data = await resp.json() as any;
      const events = data.events || [];
      let count = 0;

      const upsert = this.db.prepare(`
        INSERT OR IGNORE INTO cached_events (id, pipeline_id, event_type, payload, source, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const evt of events) {
        upsert.run(evt.id, evt.pipeline_id, evt.event_type,
          typeof evt.payload === 'string' ? evt.payload : JSON.stringify(evt.payload),
          evt.source || '', evt.timestamp);
        count++;
      }

      return { success: true, count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async pullAnalytics(siteId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await fetch(`${this.config.apiBase}/api/analytics/overview?period=30d`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };

      const data = await resp.json() as any;

      this.db.prepare(`
        INSERT INTO cached_analytics (site_id, metric_type, period, data)
        VALUES (?, 'overview', '30d', ?)
      `).run(siteId || 'all', JSON.stringify(data));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  getCachedEvents(pipelineId?: string, limit = 50): any[] {
    if (pipelineId) {
      return this.db.prepare('SELECT * FROM cached_events WHERE pipeline_id = ? ORDER BY timestamp DESC LIMIT ?')
        .all(pipelineId, limit) as any[];
    }
    return this.db.prepare('SELECT * FROM cached_events ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
  }

  // ═══════════════════════════════════════════════════════════
  //  File save to local disk (for AI-generated images etc.)
  // ═══════════════════════════════════════════════════════════

  saveFileToDisk(data: { base64: string; fileName: string; directory?: string }): { success: boolean; filePath?: string; error?: string } {
    try {
      const dir = data.directory || path.join(app.getPath('pictures'), 'Zeno');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, data.fileName);
      const buffer = Buffer.from(data.base64, 'base64');
      fs.writeFileSync(filePath, buffer);

      console.log(`💾 File saved to disk: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Sync status & utilities
  // ═══════════════════════════════════════════════════════════

  getSyncStatus(): any {
    const articleCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM articles').get() as any).cnt;
    const imageCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM images').get() as any).cnt;
    const eventCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM cached_events').get() as any).cnt;
    const pendingSync = (this.db.prepare("SELECT COUNT(*) as cnt FROM sync_log WHERE status = 'pending'").get() as any).cnt;
    const lastSync = this.db.prepare("SELECT MAX(last_synced) as ts FROM sync_log WHERE status = 'synced'").get() as any;

    const published = (this.db.prepare("SELECT COUNT(*) as cnt FROM articles WHERE status = 'published'").get() as any).cnt;
    const drafts = (this.db.prepare("SELECT COUNT(*) as cnt FROM articles WHERE status = 'draft'").get() as any).cnt;

    return {
      articles: { total: articleCount, published, drafts },
      images: imageCount,
      cachedEvents: eventCount,
      pendingSync,
      lastSynced: lastSync?.ts || null,
      apiBase: this.config.apiBase,
    };
  }

  private logSync(type: string, localId: string, remoteId: string | null, direction: 'push' | 'pull'): void {
    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.db.prepare(`
      INSERT INTO sync_log (id, type, local_id, remote_id, direction, status, last_synced)
      VALUES (?, ?, ?, ?, ?, 'synced', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET status = 'synced', last_synced = datetime('now')
    `).run(id, type, localId, remoteId, direction);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[łŁ]/g, 'l')
      .replace(/[ąĄ]/g, 'a')
      .replace(/[ćĆ]/g, 'c')
      .replace(/[ęĘ]/g, 'e')
      .replace(/[ńŃ]/g, 'n')
      .replace(/[óÓ]/g, 'o')
      .replace(/[śŚ]/g, 's')
      .replace(/[źŹżŻ]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);
  }

  destroy(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.db.close();
    console.log('📦 SyncService: Closed');
  }
}

// Input type for article creation/update
interface ArticleInput {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  language: string;
  author: string;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
}
