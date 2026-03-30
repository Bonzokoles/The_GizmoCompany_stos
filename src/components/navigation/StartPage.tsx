/**
 * StartPage — Dashboard with sidebar, widgets, search bar, decorative lines
 * Proposal A (Glance-style) + E (tool highlights) + bottom search (SearXNG)
 */

import { useState, useCallback, useEffect, type KeyboardEvent, type CSSProperties } from 'react';

/* ── Search-engine registry ────────────────────────── */
type SearchEngineId = 'searxng' | 'duckduckgo' | 'google' | 'brave' | 'kaggle' | 'perplexity';

interface SearchEngine {
  id: SearchEngineId;
  label: string;
  icon: string;
  buildUrl: (q: string) => string;
  hint: string;
}

const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'searxng',     label: 'SearXNG',     icon: '🔒', buildUrl: q => `http://localhost:8888/search?q=${encodeURIComponent(q)}`,           hint: 'Prywatne · lokalne · bez śledzenia' },
  { id: 'duckduckgo',  label: 'DuckDuckGo',  icon: '🦆', buildUrl: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,                hint: 'Prywatne · bez śledzenia' },
  { id: 'google',      label: 'Google',       icon: '🔍', buildUrl: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,           hint: 'Popularny · szybki' },
  { id: 'brave',       label: 'Brave',        icon: '🦁', buildUrl: q => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,         hint: 'Prywatne · niezależny indeks' },
  { id: 'kaggle',      label: 'Kaggle',       icon: '📊', buildUrl: q => `https://www.kaggle.com/search?q=${encodeURIComponent(q)}`,           hint: 'Datasety · notebooki · modele ML' },
  { id: 'perplexity',  label: 'Perplexity',   icon: '🧠', buildUrl: q => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,       hint: 'AI-powered · podsumowania · źródła' },
];

/** Glance-style live clock — time part (above line) */
function GlanceClockTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = time.getHours().toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const s = time.getSeconds().toString().padStart(2, '0');
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 33, fontWeight: 700, color: '#00d4ff', letterSpacing: 3, fontVariantNumeric: 'tabular-nums', fontFamily: "'Lucida Console', 'Consolas', monospace" }}>{h}:{m}<span style={{ color: '#00d4ff66', fontSize: 24 }}>:{s}</span></div>
    </div>
  );
}

/** Glance-style clock — date part (below line) */
function GlanceClockDate() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const dateStr = time.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  const dayOfYear = Math.ceil((time.getTime() - new Date(time.getFullYear(), 0, 1).getTime()) / 86_400_000);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 15, color: '#667', fontFamily: "'Lucida Console', 'Consolas', monospace", letterSpacing: 1 }}>{dateStr}</div>
      <div style={{ fontSize: 11, color: '#445', marginTop: 2, fontFamily: "'Lucida Console', 'Consolas', monospace" }}>dzień {dayOfYear}/365</div>
    </div>
  );
}

/* ── Dev Quotes widget ── */
const DEV_QUOTES = [
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'Programs must be written for people to read.', author: 'Harold Abelson' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'The best error message is the one that never shows up.', author: 'Thomas Fuchs' },
];

function DevQuotes() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * DEV_QUOTES.length));
  const q = DEV_QUOTES[idx];
  return (
    <div
      onClick={() => setIdx((idx + 1) % DEV_QUOTES.length)}
      style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
      title="Kliknij po następny cytat"
    >
      <div style={{ fontSize: 12, fontStyle: 'italic', color: '#9090aa', lineHeight: 1.5 }}>"{q.text}"</div>
      <div style={{ fontSize: 10, color: '#445', marginTop: 6, textAlign: 'right' }}>— {q.author}</div>
    </div>
  );
}

/* ── Mini Calendar widget ── */
function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  return (
    <div style={{ padding: '6px 8px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8888aa', textAlign: 'center', marginBottom: 6, textTransform: 'capitalize' }}>{monthName}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
        {dayLabels.map(d => (
          <div key={d} style={{ fontSize: 9, color: '#445', fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            style={{
              fontSize: 10,
              padding: '3px 0',
              color: d === today ? '#c0c0d8' : d ? '#7878aa' : 'transparent',
              background: d === today ? '#c0c0d815' : 'transparent',
              fontWeight: d === today ? 700 : 400,
              borderRadius: 2,
            }}
          >
            {d ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface Resource {
  name: string;
  url: string;
}

export interface Category {
  id: string;
  title: string;
  color: string;
  items: Resource[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'ai-tools',
    title: 'AI Tools',
    color: '#a855f7',
    items: [
      { name: 'ChatGPT', url: 'https://chat.openai.com' },
      { name: 'Claude', url: 'https://claude.ai' },
      { name: 'Gemini', url: 'https://gemini.google.com' },
      { name: 'Perplexity', url: 'https://perplexity.ai' },
      { name: 'Hugging Face', url: 'https://huggingface.co' },
      { name: 'LM Studio', url: 'https://lmstudio.ai' },
      { name: 'Replicate', url: 'https://replicate.com' },
      { name: 'Together AI', url: 'https://together.ai' },
      { name: 'OpenRouter', url: 'https://openrouter.ai' },
    ],
  },
  {
    id: 'ai-coding',
    title: 'AI Coding',
    color: '#3b82f6',
    items: [
      { name: 'GitHub Copilot', url: 'https://github.com/features/copilot' },
      { name: 'Cursor', url: 'https://cursor.sh' },
      { name: 'Codeium', url: 'https://codeium.com' },
      { name: 'Tabnine', url: 'https://tabnine.com' },
      { name: 'Replit', url: 'https://replit.com' },
      { name: 'v0.dev', url: 'https://v0.dev' },
      { name: 'Bolt.new', url: 'https://bolt.new' },
      { name: 'Lovable', url: 'https://lovable.dev' },
    ],
  },
  {
    id: 'dev-tools',
    title: 'Dev Tools',
    color: '#f59e0b',
    items: [
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'GitLab', url: 'https://gitlab.com' },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { name: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { name: 'DevDocs', url: 'https://devdocs.io' },
      { name: 'CodePen', url: 'https://codepen.io' },
      { name: 'JSFiddle', url: 'https://jsfiddle.net' },
      { name: 'RegExr', url: 'https://regexr.com' },
      { name: 'JSON Formatter', url: 'https://jsonformatter.org' },
      { name: 'Can I Use', url: 'https://caniuse.com' },
    ],
  },
  {
    id: 'learning',
    title: 'Nauka',
    color: '#10b981',
    items: [
      { name: 'freeCodeCamp', url: 'https://freecodecamp.org' },
      { name: 'The Odin Project', url: 'https://theodinproject.com' },
      { name: 'Exercism', url: 'https://exercism.org' },
      { name: 'LeetCode', url: 'https://leetcode.com' },
      { name: 'Fireship', url: 'https://fireship.io' },
      { name: 'Egghead', url: 'https://egghead.io' },
      { name: 'Frontend Masters', url: 'https://frontendmasters.com' },
      { name: 'Roadmap.sh', url: 'https://roadmap.sh' },
    ],
  },
  {
    id: 'frameworks',
    title: 'Frameworki',
    color: '#06b6d4',
    items: [
      { name: 'React', url: 'https://react.dev' },
      { name: 'Next.js', url: 'https://nextjs.org' },
      { name: 'Vue.js', url: 'https://vuejs.org' },
      { name: 'Svelte', url: 'https://svelte.dev' },
      { name: 'Astro', url: 'https://astro.build' },
      { name: 'Tailwind CSS', url: 'https://tailwindcss.com' },
      { name: 'Electron', url: 'https://electronjs.org' },
      { name: 'Bun', url: 'https://bun.sh' },
    ],
  },
  {
    id: 'design',
    title: 'Design / UI',
    color: '#ec4899',
    items: [
      { name: 'Figma', url: 'https://figma.com' },
      { name: 'Dribbble', url: 'https://dribbble.com' },
      { name: 'Unsplash', url: 'https://unsplash.com' },
      { name: 'Iconify', url: 'https://iconify.design' },
      { name: 'Lucide', url: 'https://lucide.dev' },
      { name: 'Coolors', url: 'https://coolors.co' },
      { name: 'Shadcn/ui', url: 'https://ui.shadcn.com' },
      { name: 'Radix UI', url: 'https://radix-ui.com' },
    ],
  },
  {
    id: 'devops',
    title: 'Cloud / DevOps',
    color: '#6366f1',
    items: [
      { name: 'Vercel', url: 'https://vercel.com' },
      { name: 'Netlify', url: 'https://netlify.com' },
      { name: 'Cloudflare', url: 'https://cloudflare.com' },
      { name: 'Railway', url: 'https://railway.app' },
      { name: 'Supabase', url: 'https://supabase.com' },
      { name: 'PlanetScale', url: 'https://planetscale.com' },
      { name: 'Podman Desktop', url: 'https://podman-desktop.io' },
      { name: 'Grafana', url: 'https://grafana.com' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    color: '#ef4444',
    items: [
      { name: 'OWASP', url: 'https://owasp.org' },
      { name: 'Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { name: 'SSL Labs', url: 'https://ssllabs.com' },
      { name: 'Security Headers', url: 'https://securityheaders.com' },
      { name: 'VirusTotal', url: 'https://virustotal.com' },
      { name: 'CyberChef', url: 'https://gchq.github.io/CyberChef' },
    ],
  },
  {
    id: 'communities',
    title: 'Spolecznosci',
    color: '#f97316',
    items: [
      { name: 'Hacker News', url: 'https://news.ycombinator.com' },
      { name: 'Reddit r/programming', url: 'https://reddit.com/r/programming' },
      { name: 'DEV.to', url: 'https://dev.to' },
      { name: 'Hashnode', url: 'https://hashnode.com' },
      { name: 'Product Hunt', url: 'https://producthunt.com' },
      { name: 'Indie Hackers', url: 'https://indiehackers.com' },
      { name: 'Lobsters', url: 'https://lobste.rs' },
    ],
  },
  {
    id: 'productivity',
    title: 'Produktywnosc',
    color: '#14b8a6',
    items: [
      { name: 'Notion', url: 'https://notion.so' },
      { name: 'Linear', url: 'https://linear.app' },
      { name: 'Excalidraw', url: 'https://excalidraw.com' },
      { name: 'Mermaid Live', url: 'https://mermaid.live' },
      { name: 'Obsidian', url: 'https://obsidian.md' },
      { name: 'Raycast', url: 'https://raycast.com' },
    ],
  },
  {
    id: 'terminal',
    title: 'Terminal / CLI',
    color: '#22d3ee',
    items: [
      { name: 'Oh My Zsh', url: 'https://ohmyz.sh' },
      { name: 'Starship Prompt', url: 'https://starship.rs' },
      { name: 'Warp Terminal', url: 'https://warp.dev' },
      { name: 'Hyper', url: 'https://hyper.is' },
      { name: 'Fig', url: 'https://fig.io' },
      { name: 'Nushell', url: 'https://nushell.sh' },
      { name: 'Zellij', url: 'https://zellij.dev' },
      { name: 'tmux cheatsheet', url: 'https://tmuxcheatsheet.com' },
    ],
  },
  {
    id: 'network-api',
    title: 'Network / API',
    color: '#f472b6',
    items: [
      { name: 'Postman', url: 'https://postman.com' },
      { name: 'Hoppscotch', url: 'https://hoppscotch.io' },
      { name: 'Insomnia', url: 'https://insomnia.rest' },
      { name: 'Swagger Editor', url: 'https://editor.swagger.io' },
      { name: 'HTTPie', url: 'https://httpie.io' },
      { name: 'RapidAPI', url: 'https://rapidapi.com' },
      { name: 'Reqbin', url: 'https://reqbin.com' },
      { name: 'Webhook.site', url: 'https://webhook.site' },
    ],
  },
  {
    id: 'databases',
    title: 'Bazy danych',
    color: '#a78bfa',
    items: [
      { name: 'Supabase', url: 'https://supabase.com' },
      { name: 'Firebase', url: 'https://firebase.google.com' },
      { name: 'MongoDB Atlas', url: 'https://cloud.mongodb.com' },
      { name: 'Neon', url: 'https://neon.tech' },
      { name: 'Turso', url: 'https://turso.tech' },
      { name: 'Prisma', url: 'https://prisma.io' },
      { name: 'Drizzle ORM', url: 'https://orm.drizzle.team' },
      { name: 'DB Fiddle', url: 'https://www.db-fiddle.com' },
    ],
  },
  {
    id: 'media',
    title: 'Media / Content',
    color: '#fb923c',
    items: [
      { name: 'Canva', url: 'https://canva.com' },
      { name: 'Remove.bg', url: 'https://remove.bg' },
      { name: 'TinyPNG', url: 'https://tinypng.com' },
      { name: 'Lottie Files', url: 'https://lottiefiles.com' },
      { name: 'Pexels', url: 'https://pexels.com' },
      { name: 'Squoosh', url: 'https://squoosh.app' },
      { name: 'Clipdrop', url: 'https://clipdrop.co' },
      { name: 'Runway ML', url: 'https://runwayml.com' },
    ],
  },
  {
    id: 'docs',
    title: 'Dokumentacja',
    color: '#4ade80',
    items: [
      { name: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { name: 'TypeScript Docs', url: 'https://typescriptlang.org/docs' },
      { name: 'Node.js Docs', url: 'https://nodejs.org/docs/latest/api' },
      { name: 'Electron Docs', url: 'https://electronjs.org/docs' },
      { name: 'React Docs', url: 'https://react.dev/reference' },
      { name: 'Vite Docs', url: 'https://vite.dev/guide' },
      { name: 'Tailwind Docs', url: 'https://tailwindcss.com/docs' },
      { name: 'W3Schools', url: 'https://w3schools.com' },
    ],
  },
];

/* ── Priority tools from TOOLS_CATALOG ─────────────── */
const TOOL_HIGHLIGHTS = [
  { icon: '📊', name: 'Glance', desc: 'Dashboard & monitoring', url: 'https://github.com/glanceapp/glance' },
  { icon: '📰', name: 'daily.dev', desc: 'Developer news feed', url: 'https://daily.dev' },
  { icon: '🧠', name: 'Leon AI', desc: 'Personal AI assistant', url: 'https://getleon.ai' },
  { icon: '🔍', name: 'Qdrant', desc: 'Vector search engine', url: 'https://qdrant.tech' },
  { icon: '📦', name: 'Weaviate', desc: 'Hybrid vector DB', url: 'https://weaviate.io' },
  { icon: '⚡', name: 'txtai', desc: 'RAG pipeline AI', url: 'https://github.com/neuml/txtai' },
  { icon: '📈', name: 'PostHog', desc: 'Product analytics', url: 'https://posthog.com' },
  { icon: '🔒', name: 'Plausible', desc: 'Privacy analytics', url: 'https://plausible.io' },
];

const QUICK_LINKS = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'AI Hub', url: 'https://zenbrowsers.org/ai-hub/' },
  { label: 'BONZO Media Hub', url: 'https://bonzo-media-hub.pages.dev/' },
  { label: 'ChatGPT', url: 'https://chat.openai.com' },
  { label: 'Claude', url: 'https://claude.ai' },
  { label: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { label: 'MDN Docs', url: 'https://developer.mozilla.org' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
];

/* ── Component ─────────────────────────────────────── */

interface StartPageProps {
  onNavigate: (url: string) => void;
}

export function StartPage({ onNavigate }: StartPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [includeLocal, setIncludeLocal] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const [openWidget, setOpenWidget] = useState<string | null>(null);
  const [searchEngine, setSearchEngine] = useState<SearchEngineId>('searxng');

  const handleLinkClick = useCallback(
    (url: string) => { onNavigate(url); },
    [onNavigate],
  );

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const engine = SEARCH_ENGINES.find(e => e.id === searchEngine) ?? SEARCH_ENGINES[0];
    onNavigate(engine.buildUrl(q));
  }, [searchQuery, searchEngine, onNavigate]);

  const onSearchKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); },
    [handleSearch],
  );

  return (
    <div style={S.root}>
      <style>{`
        .sp-btn:active { transform: scale(0.97); }
        .sp-chip:active { transform: scale(0.96); }
        .sp-item:active { transform: scale(0.97); }
        @keyframes spWidgetEnter {
          from { opacity: 0; transform: translateY(-4px) scaleY(0.97); }
          to   { opacity: 1; transform: translateY(0)  scaleY(1); }
        }
        @keyframes spOverlayEnter {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spPanelEnter {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
      {/* ── Decorative lines ─────────────────────── */}
      <div style={S.lineV} />
      <div style={S.lineH} />

      {/* ── Sidebar ──────────────────────────────── */}
      <div style={S.sidebar}>
        <div style={S.brand}>THE_Zenon_browser</div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 10px 36px', textAlign: 'center' }}>
          <GlanceClockTime />
        </div>
      </div>

      {/* ── Date below horizontal line ── */}
      <div style={{ position: 'absolute' as const, bottom: 4, left: 0, width: 220, zIndex: 3, pointerEvents: 'none' as const }}>
        <GlanceClockDate />
      </div>

      {/* ── Content area ─────────────── */}
      <div style={S.content}>
        {/* ── Widgets — top of content ── */}
        <div style={S.widgetBar}>
          {[
            { id: 'quotes', label: '💬 Cytaty' },
            { id: 'calendar', label: '📅 Kalendarz' },
            { id: 'trending', label: '🔥 Trending' },
            { id: 'devfeed', label: '📰 Dev Feed' },
            { id: 'bookmarks', label: '⭐ Zakładki' },
            { id: 'monitor', label: '📊 Monitor' },
          ].map(w => (
            <button
              key={w.id}
              className="sp-btn"
              onClick={() => setOpenWidget(openWidget === w.id ? null : w.id)}
              style={{
                ...S.widgetBarBtn,
                background: openWidget === w.id ? '#0c0c1e' : 'transparent',
                color: openWidget === w.id ? '#b0b0c8' : '#556',
                borderBottomColor: openWidget === w.id ? '#888' : 'transparent',
              }}
            >{w.label}</button>
          ))}
        </div>
        {openWidget && (
          <div style={{ ...S.widgetContent, animation: 'spWidgetEnter 150ms ease-out' }}>
            {openWidget === 'quotes' && <DevQuotes />}
            {openWidget === 'calendar' && <MiniCalendar />}
            {openWidget === 'trending' && (
              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { icon: '🤖', label: 'AI/ML News', url: 'https://news.ycombinator.com' },
                  { icon: '⚡', label: 'Vite Blog', url: 'https://vite.dev/blog' },
                  { icon: '🦀', label: 'r/rust', url: 'https://reddit.com/r/rust' },
                  { icon: '📱', label: 'React Blog', url: 'https://react.dev/blog' },
                ].map(t => (
                  <button key={t.url} className="sp-btn" onClick={() => handleLinkClick(t.url)} style={S.trendingItem}>
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            )}
            {openWidget === 'devfeed' && (
              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { t: 'Hacker News', u: 'https://news.ycombinator.com' },
                  { t: 'Lobste.rs', u: 'https://lobste.rs' },
                  { t: 'DEV.to', u: 'https://dev.to' },
                  { t: 'daily.dev', u: 'https://daily.dev' },
                ].map(f => (
                  <button key={f.u} className="sp-btn" onClick={() => handleLinkClick(f.u)} style={S.trendingItem}>{f.t}</button>
                ))}
              </div>
            )}
            {openWidget === 'bookmarks' && (
              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { t: 'GitHub', u: 'https://github.com' },
                  { t: 'ChatGPT', u: 'https://chat.openai.com' },
                  { t: 'Claude', u: 'https://claude.ai' },
                  { t: 'Vercel', u: 'https://vercel.com' },
                ].map(b => (
                  <button key={b.u} className="sp-btn" onClick={() => handleLinkClick(b.u)} style={S.trendingItem}>{b.t}</button>
                ))}
              </div>
            )}
            {openWidget === 'monitor' && (
              <div style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#667' }}>
                  <span>Karty: —</span>
                  <span>Pamięć: —</span>
                </div>
                <div style={{ marginTop: 6, height: 4, background: '#111128', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: '#00d4ff55', borderRadius: 2 }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spacer pushes bottom content down */}
        <div style={{ flex: 1 }} />

        {/* Search bar + engine selector */}
        <div style={S.searchWrap}>
          <div style={S.searchBar}>
            <span style={S.searchIcon}>⌕</span>
            <input
              style={S.searchInput}
              type="text"
              placeholder="Szukaj..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={onSearchKey}
              spellCheck={false}
            />
            <button
              onClick={() => setIncludeLocal(prev => !prev)}
              style={{
                ...S.localToggle,
                background: includeLocal ? '#00d4ff18' : 'transparent',
                color: includeLocal ? '#00d4ff' : '#445',
                borderColor: includeLocal ? '#00d4ff44' : '#14142e',
              }}
              title={includeLocal ? 'Lokalne zasoby: WŁĄCZONE' : 'Lokalne zasoby: wyłączone'}
            >
              📚
            </button>
            {searchQuery && (
              <button style={S.searchGo} onClick={handleSearch}>↵</button>
            )}
          </div>

          {/* Engine selector chips */}
          <div style={S.engineRow}>
            {SEARCH_ENGINES.map(eng => (
              <button
                key={eng.id}
                onClick={() => setSearchEngine(eng.id)}
                style={{
                  ...S.engineChip,
                  background: searchEngine === eng.id ? '#0c0c22' : 'transparent',
                  color: searchEngine === eng.id ? '#c0c0d8' : '#445',
                  borderColor: searchEngine === eng.id ? '#00d4ff44' : 'transparent',
                }}
                title={eng.hint}
              >
                <span style={{ fontSize: 11 }}>{eng.icon}</span> {eng.label}
              </button>
            ))}
          </div>

          <span style={S.searchHint}>
            {(SEARCH_ENGINES.find(e => e.id === searchEngine) ?? SEARCH_ENGINES[0]).hint}
            {includeLocal && <span style={{ color: '#00d4ff88' }}> + biblioteka lokalna</span>}
          </span>
        </div>

        {/* Tools button — bottom right at line level */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            className="sp-btn"
            onClick={() => setShowAllTools(true)}
            style={S.allToolsBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#888'; (e.currentTarget as HTMLElement).style.color = '#c0c0d8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1a2e'; (e.currentTarget as HTMLElement).style.color = '#7878aa'; }}
          >
            🛠 Wszystkie narzędzia →
          </button>
        </div>
      </div>

      {/* ── All Tools overlay (subpage) ──── */}
      {showAllTools && (
        <div style={{ ...S.allToolsBackdrop, animation: 'spOverlayEnter 150ms ease-out' }} onClick={e => { if (e.target === e.currentTarget) setShowAllTools(false); }}>
          <div style={{ ...S.allToolsPanel, animation: 'spPanelEnter 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
            <div style={S.allToolsHeader}>
              <h2 style={S.allToolsTitle}>🛠 Wszystkie Narzędzia</h2>
              <button onClick={() => setShowAllTools(false)} style={S.allToolsCloseBtn}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00d4ff44'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#12122a'; }}
              >✕ Zamknij</button>
            </div>
            <div style={S.allToolsBody}>
              {/* Priority tools */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={S.allToolsCatTitle}>⭐ Narzędzia Priorytet</h3>
                <div style={S.allToolsChips}>
                  {TOOL_HIGHLIGHTS.map(t => (
                    <button key={t.name} className="sp-item" onClick={() => handleLinkClick(t.url)} style={S.allToolsItem}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00d4ff44'; (e.currentTarget as HTMLElement).style.background = '#0c0c22'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#10102a'; (e.currentTarget as HTMLElement).style.background = '#070716'; }}
                    >
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#b0b0cc' }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: '#445' }}>{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Quick links */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={S.allToolsCatTitle}>⚡ Szybkie Linki</h3>
                <div style={S.allToolsChips}>
                  {QUICK_LINKS.map(l => (
                    <button key={l.url} className="sp-chip" onClick={() => handleLinkClick(l.url)} style={S.allToolsChip}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00d4ff44'; (e.currentTarget as HTMLElement).style.color = '#e0e0f0'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#10102a'; (e.currentTarget as HTMLElement).style.color = '#9090aa'; }}
                    >{l.label}</button>
                  ))}
                </div>
              </div>
              {/* All categories */}
              {CATEGORIES.map(cat => (
                <div key={cat.id} style={{ marginBottom: 16 }}>
                  <h3 style={{ ...S.allToolsCatTitle, color: cat.color }}>{cat.title}</h3>
                  <div style={S.allToolsChips}>
                    {cat.items.map(item => (
                      <button key={item.url} className="sp-chip" onClick={() => handleLinkClick(item.url)}
                        style={{ ...S.allToolsChip, borderColor: cat.color + '25' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = cat.color; (e.currentTarget as HTMLElement).style.background = cat.color + '15'; (e.currentTarget as HTMLElement).style.color = '#e0e0f0'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = cat.color + '25'; (e.currentTarget as HTMLElement).style.background = '#0a0a1e'; (e.currentTarget as HTMLElement).style.color = '#9090aa'; }}
                      >{item.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ────────────────────────────────────────── */

const LINE_COLOR = '#00d4ff';

const S: Record<string, CSSProperties> = {
  /* Root container — very dark */
  root: {
    width: '100%',
    height: '100%',
    background: '#040410',
    color: '#b0b0c8',
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    position: 'relative',
    display: 'flex',
    overflow: 'hidden',
  },

  /* ── Decorative lines ──────────────────────────── */
  lineV: {
    position: 'absolute',
    left: 219,
    top: 0,
    bottom: 32,
    width: 1,
    background: `linear-gradient(to bottom, ${LINE_COLOR}00, ${LINE_COLOR}55 8%, ${LINE_COLOR}88 50%, ${LINE_COLOR}55 92%, ${LINE_COLOR}00)`,
    boxShadow: `0 0 6px ${LINE_COLOR}30, 0 0 18px ${LINE_COLOR}15`,
    zIndex: 2,
    pointerEvents: 'none',
  },
  lineH: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    height: 1,
    background: `linear-gradient(to right, ${LINE_COLOR}00, ${LINE_COLOR}55 8%, ${LINE_COLOR}88 50%, ${LINE_COLOR}55 92%, ${LINE_COLOR}00)`,
    boxShadow: `0 0 6px ${LINE_COLOR}30, 0 0 18px ${LINE_COLOR}15`,
    zIndex: 2,
    pointerEvents: 'none',
  },

  /* ── Sidebar ───────────────────────────────────── */
  sidebar: {
    width: 220,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '12px 0',
    overflowY: 'auto' as const,
    background: '#050512',
    zIndex: 1,
  },
  /* Glance-style widgets */
  glanceSection: {
    padding: '0 10px 6px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  glanceWidget: {
    background: '#08081a',
    border: '1px solid #12122a',
    borderRadius: 0,
    overflow: 'hidden',
  },
  glanceWidgetHeader: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: '#556',
    padding: '5px 8px',
    borderBottom: '1px solid #12122a',
    background: '#06060f',
  },
  glanceWidgetBody: {
    padding: '6px 8px',
  },
  glanceFeedItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    fontSize: 11,
    color: '#7878aa',
    background: 'transparent',
    border: 'none',
    padding: '3px 0',
    cursor: 'pointer',
    transition: 'color 150ms ease-out, transform 150ms ease-out',
    fontFamily: 'inherit',
  },
  /* Inline expanded items */
  inlineItems: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    padding: '4px 10px 8px 20px',
  },
  inlineItemBtn: {
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 500,
    color: '#9090aa',
    background: '#0a0a1e',
    border: '1px solid #14143a',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
  },
  brand: {
    fontSize: 13,
    fontWeight: 700,
    color: '#00d4ff',
    padding: '8px 14px 16px',
    letterSpacing: 0.5,
  },
  catBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    padding: '7px 14px',
    fontSize: 12.5,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'background 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
    whiteSpace: 'nowrap' as const,
  },

  /* ── Right content area ────────────────────────── */
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px 24px 36px 24px',
    overflowY: 'auto' as const,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    color: '#445',
    marginBottom: 8,
  },

  /* ── Widget bar — top of content, monochrome ── */
  widgetBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #1a1a2e',
    marginBottom: 0,
  },
  widgetBarBtn: {
    padding: '8px 14px',
    fontSize: 11,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'background 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
    fontFamily: 'inherit',
    color: '#556',
    letterSpacing: 0.3,
  },
  widgetContent: {
    background: '#08081a',
    border: '1px solid #14142e',
    borderTop: 'none',
    maxWidth: 320,
    marginBottom: 12,
  },
  trendingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#7878aa',
    background: 'transparent',
    border: 'none',
    padding: '3px 0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    transition: 'color 150ms ease-out, transform 150ms ease-out',
  },

  /* All tools button */
  allToolsBtn: {
    background: 'none',
    border: '1px solid #1a1a2e',
    color: '#7878aa',
    fontSize: 11,
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
    fontFamily: 'inherit',
    letterSpacing: 0.3,
  },

  /* Search bar — bottom, shifted left */
  searchWrap: {
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#080818',
    border: '1px solid #14142e',
    padding: '0 12px',
    height: 36,
    transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
  },
  searchIcon: {
    fontSize: 15,
    color: '#445',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#c0c0d8',
    fontSize: 13,
    outline: 'none',
    padding: '8px 0',
    fontFamily: 'inherit',
  },
  localToggle: {
    fontSize: 14,
    border: '1px solid #14142e',
    borderRadius: 0,
    padding: '3px 7px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: 1,
    flexShrink: 0,
  },
  searchGo: {
    background: 'none',
    border: 'none',
    color: '#00d4ff',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  searchHint: {
    fontSize: 10,
    color: '#334',
    letterSpacing: 0.3,
    paddingLeft: 2,
  },

  /* Engine selector row */
  engineRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginTop: 2,
  },
  engineChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 10,
    padding: '2px 8px',
    border: '1px solid transparent',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },

  /* ── All Tools overlay ── */
  allToolsBackdrop: {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 100,
    background: '#040410ee',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  allToolsPanel: {
    width: '100%',
    maxWidth: 900,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  allToolsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    borderBottom: '1px solid #12122a',
    background: '#06060f',
    flexShrink: 0,
  },
  allToolsTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#00d4ff',
    margin: 0,
    letterSpacing: 0.5,
  },
  allToolsCloseBtn: {
    background: 'none',
    border: '1px solid #12122a',
    color: '#7878aa',
    fontSize: 12,
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.12s',
  },
  allToolsBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 24px',
  },
  allToolsCatTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#00d4ff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  allToolsChips: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  allToolsItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    background: '#070716',
    border: '1px solid #10102a',
    cursor: 'pointer',
    color: '#8888aa',
    fontSize: 12,
    fontFamily: 'inherit',
    transition: 'all 0.12s',
    textAlign: 'left' as const,
  },
  allToolsChip: {
    padding: '5px 12px',
    fontSize: 12,
    color: '#9090aa',
    background: '#0a0a1e',
    border: '1px solid #10102a',
    cursor: 'pointer',
    transition: 'all 0.12s',
    fontFamily: 'inherit',
  },
};
