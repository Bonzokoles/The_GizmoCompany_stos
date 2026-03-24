/**
 * Knowledge Hub Service  Orchestrates local libraries + cloud (D1/R2) knowledge
 * Auto-registers The_DEVz_HUB_of_work directories on startup
 * Provides agent knowledge base creation from indexed content
 */

import * as fs from 'fs';
import * as path from 'path';
import { CatalogService, type LibraryConfig } from './catalog-service';

//  Hub source definitions 

const DEVZ_HUB_ROOT = 'U:\\The_DEVz_HUB_of_work';

interface HubLibraryDef {
  name: string;
  subPath: string;
  category: 'knowledge' | 'library' | 'agents' | 'data' | 'system';
  description: string;
  icon: string;
}

const HUB_LIBRARIES: HubLibraryDef[] = [
  { name: 'Knowledge Base', subPath: 'knowledge_base', category: 'knowledge', description: '20 tematycznych baz wiedzy + RAG corpus', icon: '' },
  { name: 'LOCAL_LIBRARIES', subPath: 'LOCAL_LIBRARIES', category: 'library', description: 'Centralny system zapisu  wiedza, historia, połączenia, finanse', icon: '' },
  { name: 'Agents', subPath: 'agents', category: 'agents', description: 'Definicje agentów tematycznych', icon: '' },
  { name: 'HuggingFace Skills', subPath: 'huggingface-skills', category: 'knowledge', description: 'Skills z HuggingFace Hub', icon: '' },
  { name: 'Config', subPath: 'config', category: 'system', description: 'Konfiguracje systemowe', icon: '' },
  { name: 'Data', subPath: 'data', category: 'data', description: 'Business intelligence, koszty, użycie', icon: '' },
];

//  Knowledge topic from knowledge_base 

export interface KnowledgeTopic {
  id: string;
  name: string;
  category: string;
  path: string;
  fileCount: number;
  description: string;
  icon: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  knowledgeTopics: string[];
  systemPrompt?: string;
  model?: string;
  createdAt: string;
}

export interface CloudResource {
  type: 'd1' | 'r2';
  id: string;
  name: string;
  description: string;
  project: string;
  category?: string;
}

export interface HubStats {
  localLibraries: number;
  knowledgeTopics: number;
  agents: number;
  indexedFiles: number;
  totalSizeMB: number;
  cloudDatabases: number;
  cloudBuckets: number;
}

// KB topic metadata mapping
const KB_TOPICS: Record<string, { description: string; icon: string; category: string }> = {
  '01_AI_SEO': { description: 'Strategie SEO pod AI, boty, schema.org', icon: '', category: 'tech' },
  '02_WHITECAT_SYSTEM': { description: 'Dokumentacja techniczna Whitecat', icon: '', category: 'tech' },
  '03_PYTHON_AUTOMATION': { description: 'Skrypty i narzędzia developerskie', icon: '', category: 'tech' },
  '04_ECOMMERCE_SHOPS': { description: 'Wiedza o sklepach (Astro, Stripe, IdoSell)', icon: '', category: 'business' },
  '05_AGENTS_AND_RAG': { description: 'Architektura agentów i bazy wiedzy', icon: '', category: 'tech' },
  '06_FINANCE': { description: 'Strategie finansowe, cenniki, modele przychodowe', icon: '', category: 'business' },
  '07_B2B_SALES': { description: 'Procesy sprzedaży B2B, lead generation', icon: '', category: 'business' },
  '08_MARKETPLACE': { description: 'Strategie dla Allegro, Amazon, eBay, Empik', icon: '', category: 'business' },
  '09_BUY_AND_SELL': { description: 'Okazje rynkowe, flippowanie, handel', icon: '', category: 'business' },
  '10_MARKET_ANALYSIS': { description: 'Raporty rynkowe, analiza konkurencji', icon: '', category: 'intelligence' },
  '11_OPPORTUNITIES': { description: 'Nowe możliwości biznesowe, nisze', icon: '', category: 'intelligence' },
  '12_FORECASTING': { description: 'Prognozy rynkowe i technologiczne', icon: '', category: 'intelligence' },
  '13_AI_NEWS': { description: 'Nowości ze świata AI, modele, updatey', icon: '📰', category: 'content' },
  '14_BLOG_TOPICS': { description: 'Pomysły na artykuły, słowa kluczowe', icon: '', category: 'content' },
  '15_READY_ARTICLES': { description: 'Gotowe artykuły do publikacji', icon: '', category: 'content' },
  '16_PROMPT_LIBRARY': { description: 'Biblioteka promptów', icon: '', category: 'tech' },
  '17_AGENT_KNOWLEDGE': { description: 'Wiedza specjalistyczna dla agentów', icon: '', category: 'tech' },
  '18_MCP_TOOLS': { description: 'Narzędzia MCP', icon: '', category: 'tech' },
  '19_PROJECT_PLANS': { description: 'Plany projektowe', icon: '', category: 'business' },
  '20_TRAINING_CORPUS': { description: 'Korpus treningowy', icon: '', category: 'tech' },
};

export class KnowledgeHubService {
  private catalogService: CatalogService;
  private agentsDir: string;

  constructor(catalogService: CatalogService) {
    this.catalogService = catalogService;
    this.agentsDir = path.join(DEVZ_HUB_ROOT, 'agents');
  }

  //  Auto-register hub libraries 

  async autoRegisterHubLibraries(): Promise<{ registered: number; skipped: number }> {
    let registered = 0, skipped = 0;
    const existing = this.catalogService.getLibraries();
    const existingPaths = new Set(existing.map(l => l.rootPath.toLowerCase()));

    for (const def of HUB_LIBRARIES) {
      const fullPath = path.join(DEVZ_HUB_ROOT, def.subPath);
      if (!fs.existsSync(fullPath)) { skipped++; continue; }
      if (existingPaths.has(fullPath.toLowerCase())) { skipped++; continue; }

      try {
        this.catalogService.addLibrary(`[HUB] ${def.name}`, fullPath);
        registered++;
      } catch {
        skipped++;
      }
    }

    return { registered, skipped };
  }

  //  Knowledge topics discovery 

  getKnowledgeTopics(): KnowledgeTopic[] {
    const kbRoot = path.join(DEVZ_HUB_ROOT, 'knowledge_base');
    if (!fs.existsSync(kbRoot)) return [];

    const topics: KnowledgeTopic[] = [];

    try {
      const entries = fs.readdirSync(kbRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

        const topicPath = path.join(kbRoot, entry.name);
        const meta = KB_TOPICS[entry.name];
        let fileCount = 0;

        try {
          fileCount = this.countFiles(topicPath);
        } catch { /* skip */ }

        topics.push({
          id: entry.name,
          name: entry.name.replace(/^\d+_/, '').replace(/_/g, ' '),
          category: meta?.category ?? 'other',
          path: topicPath,
          fileCount,
          description: meta?.description ?? '',
          icon: meta?.icon ?? '',
        });
      }
    } catch { /* skip */ }

    return topics.sort((a, b) => a.id.localeCompare(b.id));
  }

  private countFiles(dirPath: string): number {
    let count = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      if (e.isFile()) count++;
      else if (e.isDirectory()) count += this.countFiles(path.join(dirPath, e.name));
    }
    return count;
  }

  //  Agent definitions 

  getAgentDefinitions(): AgentDefinition[] {
    const defsPath = path.join(DEVZ_HUB_ROOT, 'knowledge_base', '17_AGENT_KNOWLEDGE');
    const agents: AgentDefinition[] = [];

    // Scan agents directory
    const agentDirs = [this.agentsDir, defsPath];
    for (const dir of agentDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

          const configFile = path.join(dir, entry.name, 'config.json');
          const readmeFile = path.join(dir, entry.name, 'README.md');

          if (fs.existsSync(configFile)) {
            try {
              const raw = fs.readFileSync(configFile, 'utf-8');
              const config = JSON.parse(raw);
              agents.push({
                id: entry.name,
                name: config.name || entry.name,
                role: config.role || 'agent',
                knowledgeTopics: config.knowledgeTopics || [],
                systemPrompt: config.systemPrompt,
                model: config.model,
                createdAt: config.createdAt || new Date().toISOString(),
              });
            } catch { /* skip malformed */ }
          } else if (fs.existsSync(readmeFile)) {
            agents.push({
              id: entry.name,
              name: entry.name.replace(/^agent-\d+-/, '').replace(/-/g, ' '),
              role: 'agent',
              knowledgeTopics: [],
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch { /* skip */ }
    }

    return agents;
  }

  //  Create themed agent 

  createAgent(agent: Omit<AgentDefinition, 'createdAt'>): AgentDefinition {
    const agentDir = path.join(this.agentsDir, 'agents', agent.id);
    fs.mkdirSync(agentDir, { recursive: true });

    const fullAgent: AgentDefinition = {
      ...agent,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(agentDir, 'config.json'),
      JSON.stringify(fullAgent, null, 2),
      'utf-8'
    );

    // Create README
    const readme = `# ${agent.name}\n\n**Role:** ${agent.role}\n**Topics:** ${agent.knowledgeTopics.join(', ')}\n\n${agent.systemPrompt || ''}\n`;
    fs.writeFileSync(path.join(agentDir, 'README.md'), readme, 'utf-8');

    return fullAgent;
  }

  //  Read topic content (for preview) 

  readTopicFiles(topicId: string, limit = 10): Array<{ name: string; path: string; snippet: string; size: number }> {
    const topicPath = path.join(DEVZ_HUB_ROOT, 'knowledge_base', topicId);
    if (!fs.existsSync(topicPath)) return [];

    const files: Array<{ name: string; path: string; snippet: string; size: number }> = [];

    const scan = (dir: string) => {
      if (files.length >= limit) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (files.length >= limit) break;
          if (e.name.startsWith('.')) continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) { scan(full); continue; }
          if (e.isFile()) {
            try {
              const stats = fs.statSync(full);
              if (stats.size > 2 * 1024 * 1024) continue;
              const content = fs.readFileSync(full, 'utf-8');
              files.push({
                name: e.name,
                path: full,
                snippet: content.substring(0, 300).replace(/\n/g, ' '),
                size: stats.size,
              });
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    };

    scan(topicPath);
    return files;
  }

  //  Cloud resources (D1 + R2) 

  getCloudResources(): CloudResource[] {
    return [
      // D1 Databases
      { type: 'd1', id: 'ddac77ec-c59b-4c19-895f-19e5b8e0b335', name: 'zeno-browser-db', description: 'Zen Browser main database', project: 'zenbrowsers.org' },
      { type: 'd1', id: '5c46da23-b3ae-42d3-91a2-0a2b81d8f3ec', name: 'jimbo77-community-db', description: 'Jimbo77 community data', project: 'jimbo77.com' },
      { type: 'd1', id: '7cd9d679-77d5-466d-930e-a5c57ba18621', name: 'jimbo77-social-db', description: 'Jimbo77 social features', project: 'jimbo77.com' },
      { type: 'd1', id: '84f0f3cb-9cfa-4c18-abd1-ab3f13d2e6ea', name: 'mybonzo', description: 'MyBonzo main database', project: 'mybonzo.com' },
      { type: 'd1', id: '50360b87-8e2a-42bc-b65f-66c4ddd09a2e', name: 'pumo-db', description: 'Pumo product database', project: 'pumo/jimbo77' },
      { type: 'd1', id: '90fe9b43-3d7e-4e8b-8a1f-2c5f9d4e6b7a', name: 'jimbo-rag-db', description: 'RAG knowledge base', project: 'jimbo77.com' },
      // R2 Buckets
      { type: 'r2', id: 'jimbo77-community-images', name: 'jimbo77-community-images', description: 'Community uploaded images', project: 'jimbo77.com', category: 'media' },
      { type: 'r2', id: 'mybonzo-ai-models', name: 'mybonzo-ai-models', description: 'AI model files & weights', project: 'mybonzo.com', category: 'ai' },
      { type: 'r2', id: 'mybonzo-blog-content', name: 'mybonzo-blog-content', description: 'Blog posts & articles', project: 'mybonzo.com', category: 'content' },
      { type: 'r2', id: 'mybonzo-storage', name: 'mybonzo-storage', description: 'General purpose storage', project: 'mybonzo.com', category: 'general' },
      { type: 'r2', id: 'mybonzo-analytics', name: 'mybonzo-analytics', description: 'Analytics data exports', project: 'mybonzo.com', category: 'data' },
      { type: 'r2', id: 'mybonzo-finanse', name: 'mybonzo-finanse', description: 'Financial documents', project: 'mybonzo.com', category: 'data' },
      { type: 'r2', id: 'zen-blog-images', name: 'zen-blog-images', description: 'Zen Browser blog images', project: 'zenbrowsers.org', category: 'media' },
      { type: 'r2', id: 'zen-static-assets', name: 'zen-static-assets', description: 'Zen Browser static assets', project: 'zenbrowsers.org', category: 'assets' },
    ];
  }

  //  Hub stats 

  getHubStats(): HubStats {
    const catalogStats = this.catalogService.getStats();
    const topics = this.getKnowledgeTopics();
    const agents = this.getAgentDefinitions();
    const cloud = this.getCloudResources();

    return {
      localLibraries: catalogStats.libraries,
      knowledgeTopics: topics.length,
      agents: agents.length,
      indexedFiles: catalogStats.files,
      totalSizeMB: Math.round(catalogStats.totalSize / 1024 / 1024 * 10) / 10,
      cloudDatabases: cloud.filter(r => r.type === 'd1').length,
      cloudBuckets: cloud.filter(r => r.type === 'r2').length,
    };
  }

  //  Search across knowledge base 

  searchKnowledge(query: string, topicId?: string, limit = 20) {
    // Find the library ID for knowledge_base
    const libs = this.catalogService.getLibraries();
    const kbLib = libs.find(l => l.rootPath.includes('knowledge_base'));
    const libId = topicId ? undefined : kbLib?.id;
    return this.catalogService.search(query, libId, limit);
  }
}
