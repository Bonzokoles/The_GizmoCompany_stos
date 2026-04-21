/**
 * Agents Creator Service  Build themed AI agents with personal knowledge bases
 * Workspace-based: each agent gets folder with KB, prompts, RAG config
 * Mini RAG via CatalogService FTS5, domain templates, AI context generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { CatalogService } from '../knowledge/catalog-service';

const DEVZ_HUB_ROOT = 'U:\\The_DEVz_HUB_of_work';
const AGENTS_CREATOR_ROOT = path.join(DEVZ_HUB_ROOT, 'agents_creator');

//  Exported Types 

export interface AgentWorkspace {
  id: string;
  name: string;
  domain: string;
  model: string;
  description: string;
  systemPrompt: string;
  knowledgeFiles: number;
  ragIndexed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentKBFile {
  name: string;
  path: string;
  size: number;
  type: 'local' | 'imported' | 'web';
  source?: string;
  addedAt: string;
}

export interface DomainTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedTopics: string[];
  systemPromptTemplate: string;
  promptSnippets: Array<{ name: string; prompt: string }>;
}

export interface PromptSnippet {
  name: string;
  prompt: string;
}

//  Domain Templates 

const DOMAIN_TEMPLATES: DomainTemplate[] = [
  {
    id: 'finance',
    name: 'Finanse i Ksiegowosc',
    icon: '\ud83d\udcb0',
    description: 'Agent do analiz finansowych, raportow, budzetowania i prognoz',
    suggestedTopics: ['06_FINANCE', '10_MARKET_ANALYSIS', '12_FORECASTING'],
    systemPromptTemplate: [
      'Jestes ekspertem finansowym specjalizujacym sie w analizie danych, raportowaniu i prognozowaniu.',
      'Twoje zadania:',
      '- Analiza kosztow i przychodow',
      '- Tworzenie raportow finansowych',
      '- Prognozowanie trendow rynkowych',
      '- Optymalizacja budzetu',
      '',
      'Odpowiadaj zawsze w jezyku polskim. Bazuj na dostarczonych bazach wiedzy.',
    ].join('\n'),
    promptSnippets: [
      { name: 'Analiza kosztow', prompt: 'Przeanalizuj podane koszty i wskaz mozliwosci optymalizacji. Uwzglednij trendy z ostatnich miesiecy.' },
      { name: 'Raport miesieczny', prompt: 'Wygeneruj raport miesieczny na podstawie dostarczonych danych. Format: podsumowanie, kluczowe wskazniki, rekomendacje.' },
      { name: 'Prognoza przychodow', prompt: 'Na podstawie historycznych danych przygotuj prognoze przychodow na najblizsze 3 miesiace.' },
    ],
  },
  {
    id: 'business',
    name: 'Strategia Biznesowa',
    icon: '\ud83d\udcca',
    description: 'Agent do planowania strategicznego, analiz SWOT, business model canvas',
    suggestedTopics: ['07_B2B_SALES', '09_BUY_AND_SELL', '11_OPPORTUNITIES', '19_PROJECT_PLANS'],
    systemPromptTemplate: [
      'Jestes doradca strategicznym dla malych i srednich firm.',
      'Pomagasz w:',
      '- Tworzeniu strategii biznesowych',
      '- Analizie SWOT i konkurencji',
      '- Planowaniu rozwoju produktow',
      '- Identyfikacji nisz rynkowych',
      '',
      'Odpowiadaj w jezyku polskim. Bazuj na faktach z dostarczonych baz wiedzy.',
    ].join('\n'),
    promptSnippets: [
      { name: 'Analiza SWOT', prompt: 'Przeprowadz analize SWOT dla podanego biznesu/produktu.' },
      { name: 'Business Model Canvas', prompt: 'Stworz Business Model Canvas w formacie tabelarycznym.' },
      { name: 'Plan wejscia na rynek', prompt: 'Opracuj plan wejscia na rynek dla podanego produktu/uslugi.' },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce i Marketplace',
    icon: '\ud83d\uded2',
    description: 'Agent do zarzadzania sprzedaza online, marketplace, logistyki',
    suggestedTopics: ['04_ECOMMERCE_SHOPS', '08_MARKETPLACE', '09_BUY_AND_SELL'],
    systemPromptTemplate: [
      'Jestes ekspertem e-commerce i marketplace.',
      'Specjalizujesz sie w:',
      '- Optymalizacji listingow (Allegro, Amazon, eBay)',
      '- Strategiach cenowych',
      '- Logistyce i fulfillment',
      '- Customer experience',
      '',
      'Odpowiadaj po polsku. Uzywaj danych z knowledge base.',
    ].join('\n'),
    promptSnippets: [
      { name: 'Optymalizacja listingu', prompt: 'Zoptymalizuj listing produktu pod katem SEO i konwersji.' },
      { name: 'Strategia cenowa', prompt: 'Zaproponuj strategie cenowa uwzgledniajaca konkurencje i marze.' },
      { name: 'Analiza marketplace', prompt: 'Porownaj marketplace pod katem podanej kategorii produktowej.' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing i Content',
    icon: '\ud83d\udce3',
    description: 'Agent do tworzenia tresci, SEO, kampanii marketingowych',
    suggestedTopics: ['01_AI_SEO', '14_BLOG_TOPICS', '15_READY_ARTICLES', '16_PROMPT_LIBRARY'],
    systemPromptTemplate: [
      'Jestes specjalista od marketingu cyfrowego i content marketingu.',
      'Twoje kompetencje:',
      '- SEO i optymalizacja tresci',
      '- Tworzenie artykulow i postow',
      '- Planowanie kampanii PPC',
      '- Social media marketing',
      '',
      'Piszesz po polsku, kreatywnie i zgodnie z wytycznymi SEO.',
    ].join('\n'),
    promptSnippets: [
      { name: 'Artykul SEO', prompt: 'Napisz artykul SEO na podany temat. Uwzglednij H1-H3, meta description, slowa kluczowe.' },
      { name: 'Plan content', prompt: 'Stworz plan contentu na miesiac z tematami, formatami i celami.' },
      { name: 'Kampania PPC', prompt: 'Zaplanuj kampanie PPC: grupy reklam, slowa kluczowe, budzet.' },
    ],
  },
  {
    id: 'tech',
    name: 'Tech i DevOps',
    icon: '\u2699\ufe0f',
    description: 'Agent techniczny  architektura, code review, DevOps, debugging',
    suggestedTopics: ['02_WHITECAT_SYSTEM', '03_PYTHON_AUTOMATION', '05_AGENTS_AND_RAG', '18_MCP_TOOLS'],
    systemPromptTemplate: [
      'Jestes senior developerem i architektem oprogramowania.',
      'Specjalizujesz sie w:',
      '- TypeScript/React/Node.js',
      '- Cloudflare Workers i serverless',
      '- Architekturze systemow AI',
      '- DevOps i automatyzacji',
      '',
      'Pisz kod czysto, komentuj po angielsku, komunikuj po polsku.',
    ].join('\n'),
    promptSnippets: [
      { name: 'Code Review', prompt: 'Zrob code review podanego kodu. Wskaz problemy, zaproponuj poprawki.' },
      { name: 'Architektura', prompt: 'Zaproponuj architekture systemu dla podanych wymagan. Uwzglednij skalowalnosc.' },
      { name: 'Debug', prompt: 'Zdiagnozuj problem na podstawie podanego stacktrace/logow.' },
    ],
  },
  {
    id: 'intelligence',
    name: 'Market Intelligence',
    icon: '\ud83d\udd0d',
    description: 'Agent do analizy rynku, konkurencji, trendow i OSINT',
    suggestedTopics: ['10_MARKET_ANALYSIS', '11_OPPORTUNITIES', '12_FORECASTING', '13_AI_NEWS'],
    systemPromptTemplate: [
      'Jestes analitykiem rynkowym i specjalista od business intelligence.',
      'Twoje zadania:',
      '- Analiza konkurencji i benchmarking',
      '- Identyfikacja trendow rynkowych',
      '- OSINT i open source intelligence',
      '- Scoring szans biznesowych',
      '',
      'Raportuj po polsku, z konkretnymi danymi i zrodlami.',
    ].join('\n'),
    promptSnippets: [
      { name: 'Analiza konkurencji', prompt: 'Przeanalizuj konkurencje w podanej branzy. Uzyj frameworka Porters Five Forces.' },
      { name: 'Trend report', prompt: 'Przygotuj raport trendow rynkowych na podstawie dostarczonych zrodel.' },
      { name: 'Scoring szanse', prompt: 'Ocen szanse biznesowa na skali 1-10 z uzasadnieniem.' },
    ],
  },
];

//  Service 

export class AgentsCreatorService {
  private catalogService: CatalogService;

  constructor(catalogService: CatalogService) {
    this.catalogService = catalogService;
    if (!fs.existsSync(AGENTS_CREATOR_ROOT)) {
      fs.mkdirSync(AGENTS_CREATOR_ROOT, { recursive: true });
    }
  }

  //  Workspaces 

  listWorkspaces(): AgentWorkspace[] {
    if (!fs.existsSync(AGENTS_CREATOR_ROOT)) return [];
    const workspaces: AgentWorkspace[] = [];
    try {
      const entries = fs.readdirSync(AGENTS_CREATOR_ROOT, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const ws = this.readWorkspaceConfig(entry.name);
        if (ws) workspaces.push(ws);
      }
    } catch { /* skip */ }
    return workspaces.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createWorkspace(config: {
    name: string;
    domain: string;
    model: string;
    description: string;
    systemPrompt?: string;
  }): AgentWorkspace {
    const id = config.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-20/g, '')
      .substring(0, 50);

    const wsDir = path.join(AGENTS_CREATOR_ROOT, id);
    if (fs.existsSync(wsDir)) {
      throw new Error('Workspace "' + id + '" already exists');
    }

    fs.mkdirSync(path.join(wsDir, 'knowledge'), { recursive: true });
    fs.mkdirSync(path.join(wsDir, 'prompts'), { recursive: true });
    fs.mkdirSync(path.join(wsDir, 'outputs'), { recursive: true });

    const template = DOMAIN_TEMPLATES.find(t => t.id === config.domain);
    const systemPrompt = config.systemPrompt || template?.systemPromptTemplate || '';
    const now = new Date().toISOString();

    const workspace: AgentWorkspace = {
      id,
      name: config.name,
      domain: config.domain,
      model: config.model,
      description: config.description,
      systemPrompt,
      knowledgeFiles: 0,
      ragIndexed: false,
      createdAt: now,
      updatedAt: now,
    };

    fs.writeFileSync(
      path.join(wsDir, 'config.json'),
      JSON.stringify(workspace, null, 2),
      'utf-8',
    );
    fs.writeFileSync(path.join(wsDir, 'prompts', 'system.md'), systemPrompt, 'utf-8');

    if (template) {
      fs.writeFileSync(
        path.join(wsDir, 'prompts', 'snippets.json'),
        JSON.stringify(template.promptSnippets, null, 2),
        'utf-8',
      );
    }

    const readme = '# ' + config.name + '\n\n'
      + '**Domena:** ' + config.domain + '\n'
      + '**Model:** ' + config.model + '\n\n'
      + config.description + '\n\n'
      + '## Knowledge Base\n\nDodaj pliki do folderu knowledge/ aby zasilic agenta wiedza.\n\n'
      + '## Prompts\n\n- prompts/system.md - system prompt\n- prompts/snippets.json - szablony promptow\n';
    fs.writeFileSync(path.join(wsDir, 'README.md'), readme, 'utf-8');

    return workspace;
  }

  deleteWorkspace(agentId: string): void {
    const wsDir = path.join(AGENTS_CREATOR_ROOT, agentId);
    if (!fs.existsSync(wsDir)) throw new Error('Workspace "' + agentId + '" not found');

    const libs = this.catalogService.getLibraries();
    const lib = libs.find(l => l.name === '[AC] ' + agentId);
    if (lib) {
      try { this.catalogService.removeLibrary(lib.id); } catch { /* ok */ }
    }

    fs.rmSync(wsDir, { recursive: true, force: true });
  }

  getWorkspace(agentId: string): AgentWorkspace | null {
    return this.readWorkspaceConfig(agentId);
  }

  updateWorkspace(
    agentId: string,
    updates: Partial<Pick<AgentWorkspace, 'name' | 'domain' | 'model' | 'description' | 'systemPrompt'>>,
  ): AgentWorkspace {
    const ws = this.readWorkspaceConfig(agentId);
    if (!ws) throw new Error('Workspace "' + agentId + '" not found');

    const updated = { ...ws, ...updates, updatedAt: new Date().toISOString() };
    const wsDir = path.join(AGENTS_CREATOR_ROOT, agentId);
    fs.writeFileSync(path.join(wsDir, 'config.json'), JSON.stringify(updated, null, 2), 'utf-8');

    if (updates.systemPrompt !== undefined) {
      fs.writeFileSync(path.join(wsDir, 'prompts', 'system.md'), updates.systemPrompt, 'utf-8');
    }
    return updated;
  }

  //  Knowledge Base 

  getKnowledgeFiles(agentId: string): AgentKBFile[] {
    const kbDir = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge');
    if (!fs.existsSync(kbDir)) return [];

    const files: AgentKBFile[] = [];
    const metaPath = path.join(AGENTS_CREATOR_ROOT, agentId, 'kb-meta.json');
    let meta: Record<string, { type: string; source?: string; addedAt: string }> = {};
    if (fs.existsSync(metaPath)) {
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { /* */ }
    }

    const scan = (dir: string, relPath = '') => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.')) continue;
          const fullPath = path.join(dir, e.name);
          const rel = relPath ? relPath + '/' + e.name : e.name;
          if (e.isDirectory()) { scan(fullPath, rel); continue; }
          if (e.isFile()) {
            const stat = fs.statSync(fullPath);
            const m = meta[rel] || {} as any;
            files.push({
              name: rel,
              path: fullPath,
              size: stat.size,
              type: (m.type as 'local' | 'imported' | 'web') || 'local',
              source: m.source,
              addedAt: m.addedAt || stat.mtime.toISOString(),
            });
          }
        }
      } catch { /* skip */ }
    };
    scan(kbDir);
    return files;
  }

  addKnowledgeFile(agentId: string, sourcePath: string): AgentKBFile {
    const kbDir = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge');
    if (!fs.existsSync(kbDir)) fs.mkdirSync(kbDir, { recursive: true });
    if (!fs.existsSync(sourcePath)) throw new Error('Source file not found: ' + sourcePath);

    const fileName = path.basename(sourcePath);
    const destPath = path.join(kbDir, fileName);
    fs.copyFileSync(sourcePath, destPath);

    const stat = fs.statSync(destPath);
    const file: AgentKBFile = {
      name: fileName,
      path: destPath,
      size: stat.size,
      type: 'local',
      source: sourcePath,
      addedAt: new Date().toISOString(),
    };
    this.updateKBMeta(agentId, fileName, { type: 'local', source: sourcePath, addedAt: file.addedAt });
    this.touchWorkspace(agentId);
    return file;
  }

  importFromTopic(agentId: string, topicId: string): { imported: number; errors: number } {
    const topicPath = path.join(DEVZ_HUB_ROOT, 'knowledge_base', topicId);
    if (!fs.existsSync(topicPath)) throw new Error('Topic "' + topicId + '" not found');

    const kbDir = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge');
    const topicKbDir = path.join(kbDir, topicId);
    fs.mkdirSync(topicKbDir, { recursive: true });

    let imported = 0, errors = 0;
    const processDir = (srcDir: string, destDir: string) => {
      try {
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.')) continue;
          const srcFull = path.join(srcDir, e.name);
          const destFull = path.join(destDir, e.name);
          if (e.isDirectory()) {
            fs.mkdirSync(destFull, { recursive: true });
            processDir(srcFull, destFull);
            continue;
          }
          try {
            const stat = fs.statSync(srcFull);
            if (stat.size > 10 * 1024 * 1024) { errors++; continue; }
            fs.copyFileSync(srcFull, destFull);
            imported++;
          } catch { errors++; }
        }
      } catch { /* skip */ }
    };
    processDir(topicPath, topicKbDir);
    this.touchWorkspace(agentId);
    return { imported, errors };
  }

  async importFromUrl(agentId: string, url: string): Promise<AgentKBFile> {
    const kbDir = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge');
    if (!fs.existsSync(kbDir)) fs.mkdirSync(kbDir, { recursive: true });

    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { throw new Error('Invalid URL: ' + url); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs are allowed');
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'ZenBrowser/1.0 AgentsCreator' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);

    const body = await response.text();
    if (body.length > 5 * 1024 * 1024) throw new Error('Content too large (>5MB)');

    const contentType = response.headers.get('content-type') || '';
    let fileName = (parsedUrl.pathname.split('/').pop() || 'page')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
    if (!fileName.includes('.')) {
      fileName += contentType.includes('json') ? '.json' : '.md';
    }

    let content = body;
    if (contentType.includes('html')) {
      content = '# ' + parsedUrl.hostname + parsedUrl.pathname + '\n\n'
        + 'Source: ' + url + '\nImported: ' + new Date().toISOString() + '\n\n---\n\n'
        + body
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
      fileName = fileName.replace(/\.html?$/, '') + '.md';
    }

    const destPath = path.join(kbDir, fileName);
    fs.writeFileSync(destPath, content, 'utf-8');
    const stat = fs.statSync(destPath);

    const file: AgentKBFile = {
      name: fileName,
      path: destPath,
      size: stat.size,
      type: 'web',
      source: url,
      addedAt: new Date().toISOString(),
    };
    this.updateKBMeta(agentId, fileName, { type: 'web', source: url, addedAt: file.addedAt });
    this.touchWorkspace(agentId);
    return file;
  }

  removeKnowledgeFile(agentId: string, fileName: string): void {
    // Prevent path traversal
    if (fileName.includes('..')) throw new Error('Invalid file name');
    const filePath = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge', fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    this.touchWorkspace(agentId);
  }

  readKnowledgeFile(agentId: string, fileName: string): string | null {
    if (fileName.includes('..')) return null;
    const filePath = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge', fileName);
    if (!fs.existsSync(filePath)) return null;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 2 * 1024 * 1024) return '[Plik zbyt duzy do podgladu (>2MB)]';
      return fs.readFileSync(filePath, 'utf-8');
    } catch { return null; }
  }

  //  Prompts 

  getPromptSnippets(agentId: string): PromptSnippet[] {
    const snippetsPath = path.join(AGENTS_CREATOR_ROOT, agentId, 'prompts', 'snippets.json');
    if (!fs.existsSync(snippetsPath)) return [];
    try { return JSON.parse(fs.readFileSync(snippetsPath, 'utf-8')); } catch { return []; }
  }

  addPromptSnippet(agentId: string, snippet: PromptSnippet): void {
    const dir = path.join(AGENTS_CREATOR_ROOT, agentId, 'prompts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const snippetsPath = path.join(dir, 'snippets.json');
    const snippets = this.getPromptSnippets(agentId);
    snippets.push(snippet);
    fs.writeFileSync(snippetsPath, JSON.stringify(snippets, null, 2), 'utf-8');
  }

  //  RAG (via CatalogService FTS5) 

  async indexForRag(agentId: string): Promise<{ indexed: number; errors: number }> {
    const kbDir = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge');
    if (!fs.existsSync(kbDir)) return { indexed: 0, errors: 0 };

    const libName = '[AC] ' + agentId;
    const libs = this.catalogService.getLibraries();
    let lib = libs.find(l => l.name === libName);
    if (!lib) {
      lib = this.catalogService.addLibrary(libName, kbDir);
    }

    const result = this.catalogService.indexLibrary(lib.id);
    this.updateConfigField(agentId, 'ragIndexed', true);
    return result;
  }

  searchRag(agentId: string, query: string, limit = 10): Array<{ filePath: string; fileName: string; snippet: string; rank: number }> {
    const libName = '[AC] ' + agentId;
    const libs = this.catalogService.getLibraries();
    const lib = libs.find(l => l.name === libName);
    if (!lib) return [];
    return this.catalogService.search(query, lib.id, limit);
  }

  //  AI Context Generator 

  generatePromptContext(agentId: string): string {
    const ws = this.readWorkspaceConfig(agentId);
    if (!ws) return '';

    const kbFiles = this.getKnowledgeFiles(agentId);
    const snippets = this.getPromptSnippets(agentId);

    let ctx = '# Agent: ' + ws.name + '\n';
    ctx += '**Domena:** ' + ws.domain + ' | **Model:** ' + ws.model + '\n\n';
    ctx += '## System Prompt\n\n' + ws.systemPrompt + '\n\n';
    ctx += '## Knowledge Base (' + kbFiles.length + ' plikow)\n\n';

    for (const f of kbFiles.slice(0, 10)) {
      const content = this.readKnowledgeFile(agentId, f.name);
      if (content) {
        ctx += '### ' + f.name + '\n' + content.substring(0, 500) + '\n\n';
      }
    }

    if (snippets.length > 0) {
      ctx += '## Prompt Snippets\n\n';
      for (const s of snippets) {
        ctx += '- **' + s.name + ':** ' + s.prompt + '\n';
      }
    }

    return ctx;
  }

  //  Templates 

  getDomainTemplates(): DomainTemplate[] {
    return DOMAIN_TEMPLATES;
  }

  //  Private 

  private readWorkspaceConfig(agentId: string): AgentWorkspace | null {
    const configPath = path.join(AGENTS_CREATOR_ROOT, agentId, 'config.json');
    if (!fs.existsSync(configPath)) return null;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.knowledgeFiles = this.countKBFiles(agentId);
      return config;
    } catch { return null; }
  }

  private countKBFiles(agentId: string): number {
    const kbDir = path.join(AGENTS_CREATOR_ROOT, agentId, 'knowledge');
    if (!fs.existsSync(kbDir)) return 0;
    return this.countFilesRecursive(kbDir);
  }

  private countFilesRecursive(dir: string): number {
    let count = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        if (e.isFile()) count++;
        else if (e.isDirectory()) count += this.countFilesRecursive(path.join(dir, e.name));
      }
    } catch { /* skip */ }
    return count;
  }

  private updateKBMeta(agentId: string, fileName: string, meta: { type: string; source?: string; addedAt: string }) {
    const metaPath = path.join(AGENTS_CREATOR_ROOT, agentId, 'kb-meta.json');
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(metaPath)) {
      try { existing = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { /* */ }
    }
    existing[fileName] = meta;
    fs.writeFileSync(metaPath, JSON.stringify(existing, null, 2), 'utf-8');
  }

  private touchWorkspace(agentId: string) {
    this.updateConfigField(agentId, 'updatedAt', new Date().toISOString());
  }

  private updateConfigField(agentId: string, field: string, value: unknown) {
    const configPath = path.join(AGENTS_CREATOR_ROOT, agentId, 'config.json');
    if (!fs.existsSync(configPath)) return;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config[field] = value;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch { /* skip */ }
  }
}
