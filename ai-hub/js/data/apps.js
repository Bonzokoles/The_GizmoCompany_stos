/* ═══════════════════════════════════════════════════
   DATA — Applications
   ═══════════════════════════════════════════════════ */

export const APPS = [
  {
    id: 'movie-buch',
    name: '🎬 BONZO Media Hub',
    desc: 'Kolekcja 66 filmów z recenzjami w 5 stylach literackich (akademicki, Bukowski, Thompson, Gombrowicz, Mrożek) + osobiste recenzje. Plakaty TMDB, wyszukiwanie, filtry.',
    url: 'https://bonzo-media-hub.stolarnia-ams.workers.dev/',
    banner_bg: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0a192f 100%)',
    icon: '🎬',
    stats: { movies: 66, reviews: 50, styles: 5 },
  },
  {
    id: 'zeno-ops',
    name: '📊 ZENO Ops Dashboard',
    desc: 'Centralny panel operacyjny — Workers, Content, Analytics, Pipelines, Storage, Databases, Images, MOA, Browser Rendering.',
    url: '../index.html',
    banner_bg: 'linear-gradient(135deg, #0a192f 0%, #112240 50%, #1a365d 100%)',
    icon: '📊',
    stats: { tabs: 11, workers: 14, apis: 14 },
  },
  {
    id: 'moa-pipeline',
    name: '🧬 MOA Pipeline',
    desc: 'Mixture-of-Agents content generator — 5-stage pipeline: Input → Parallel Writing → Critique → Aggregation → Validation. K.R.A.F.T. Framework.',
    url: 'https://moa.mybonzo.com',
    banner_bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    icon: '🧬',
    stats: { stages: 5, criteria: 5 },
  },
  {
    id: 'jimbo-chat',
    name: '◈ BUCH_CHAT',
    desc: 'Multi-provider AI assistant — DeepSeek R1, Claude, OpenRouter, Workers AI. Sesje, biblioteka promptów, baza wiedzy, pamięć lokalna. Pełna wersja BUCH_CHAT.',
    url: 'https://zenonbrowsers.org/?tab=assistant',
    banner_bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
    icon: '◈',
    stats: { providers: 4, modes: 4, storage: 'local' },
  },
  {
    id: 'hf-skills',
    name: '🎓 HuggingFace Skills',
    desc: '11 modułowych skills z HuggingFace — CLI, Gradio, LLM Trainer, Vision Trainer, Datasets API, Transformers.js i więcej. Dodaj do agentów i chatbotów.',
    url: '#',
    banner_bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #b45309 100%)',
    icon: '🎓',
    stats: { skills: 11, categories: 6, source: 'HF' },
    action: 'skills',
  },
  {
    id: 'hf-datasets',
    name: '📚 HuggingFace Datasets',
    desc: 'Przeglądarka 200K+ datasetów z HuggingFace Hub — szukaj po kategorii, języku, zadaniu. Datasety NLP, Vision, Audio, Code i więcej.',
    url: '#',
    banner_bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)',
    icon: '📚',
    stats: { datasets: '200K+', languages: '100+', tasks: '50+' },
    action: 'datasets',
  },
];
