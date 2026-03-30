/**
 * ZENO Browser — Movies TMDB Agent API
 *
 * Routes:
 *   GET  /api/movies/search?q=...        — TMDB search (admin)
 *   GET  /api/movies/details?id=...      — TMDB movie details (admin)
 *   POST /api/movies/generate            — Generate AI reviews (admin)
 *   GET  /api/movies/list                — All movies from D1 (public)
 *   GET  /api/movies/item/:slug          — Single movie from D1 (public)
 *   DELETE /api/movies/item/:slug        — Delete movie (admin)
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

/* ── helpers ─────────────────────────────────────────────── */

function isAdmin(request: Request, env: Env): boolean {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get('Authorization');
  if (auth === `Bearer ${token}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('admin_token') === token;
}

function slug(title: string, year?: number): string {
  let s = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (year) s += `-${year}`;
  return s;
}

async function ensureTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      tmdb_id INTEGER,
      metadata TEXT,
      reviews TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

/* ── TMDB helpers ────────────────────────────────────────── */

async function tmdbFetch(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('language', 'pl-PL');
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json() as Promise<any>;
}

/* ── Review style prompts ────────────────────────────────── */

const STYLE_PROMPTS: Record<string, string> = {
  akademicki: `Jesteś krytykiem filmowym piszącym akademickie recenzje po polsku. 
Twój styl to: formalna analiza filmoznawcza, szczegółowa dekonstrukcja reżyserii, 
zdjęć, montażu, aktorstwa. Używasz terminologii filmowej (mise-en-scène, diegeza, 
montaż atrakcji). Struktura: wprowadzenie tematyczne, analiza wizji reżyserskiej, 
analiza aktorska, mistrzostwo techniczne, głębia tematyczna. Pisz rozwlekle (min. 800 słów), 
z podtytułami w pogrubieniu. Ton: erudycyjny, ale pasjonujący.`,

  bukowski: `Jesteś recenzentem filmowym w stylu Charlesa Bukowskiego — piszesz po polsku.
Twój styl: surowy, wulgarny, emocjonalny, uliczny. Piszesz jakbyś siedział w barze o 4 rano. 
Przeklinasz naturalnie. Porównujesz filmy do picia, bójek, życia na dnie. Ale pod tą 
surface-level wulgarnością kryje się głębokie zrozumienie kina. Struktura: strumień świadomości 
z nagłówkami. Używaj metafor z życia codziennego pijaka-filozofa. Min. 600 słów.`,

  thompson: `Jesteś krytykiem filmowym w stylu Huntera S. Thompsona — gonzo journalism po polsku.
Styl: psychodeliczny, chaotyczny, paranoiczny, epicki. Recenzja to trip — mieszasz obserwacje 
filmowe z halucynacyjnymi dywagacjami. Używasz ekstremalnych metafor, przesadni. 
Film to nie film — to doświadczenie, narkotyczny trip, atak na zmysły. 
Piszesz jakbyś był na krawędzi szaleństwa. Min. 700 słów z dramatycznymi podtytułami.`,

  gombrowicz: `Jesteś krytykiem filmowym w stylu Witolda Gombrowicza — po polsku.
Styl: meta-literacki, obsesja na punkcie formy, filozoficzny, autoiroiczny. 
Pytasz o naturę formy filmowej, o to czy postacie naprawdę istnieją czy są marionetkami reżysera. 
Dekonstruujesz sam akt recenzowania. Używasz retorycznych pytań, paradoksów, inwokacji. 
Widzisz w filmie walkę formy z treścią, maskę z twarzą. Min. 700 słów. 
Struktura: numerowane rozdziały z filozoficznymi tytułami.`,

  mrozek: `Jesteś recenzentem filmowym w stylu Sławomira Mrożka — po polsku.
Styl: absurdalny humor, ciętaobserwacja, metaforyczne porównania do codzienności. 
Piszesz z pozorną prostotą, ale każde zdanie ma drugie dno. Używasz analogii: 
film jak sznurówka, reżyser jak kucharz, dialogi jak burgery na wadze filozoficznej. 
Ton: lekki ale przenikliwy. Min. 600 słów z dowcipnymi podtytułami.`,
};

/* ═══════════════════════════════════════════════════════════
   MOA PIPELINE — Mixture-of-Agents (4 stages)
   1. Tłumacz      → Structured Polish movie context
   2. Wstępny tekst → First draft in selected style
   3. Asystent-Filozof → Philosophical enrichment
   4. Końcowy tekst → Final polished review
   ═══════════════════════════════════════════════════════════ */

interface MoaStageConfig {
  stage: string;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

const MOA_STAGES = ['translator', 'draft', 'philosopher', 'final'] as const;
const MOA_STAGE_LABELS: Record<string, string> = {
  translator: 'Tłumacz',
  draft: 'Wstępny tekst',
  philosopher: 'Asystent-Filozof',
  final: 'Końcowy tekst',
};

const MOA_DEFAULTS: MoaStageConfig[] = [
  { stage: 'translator', provider: 'openrouter', model: 'google/gemini-2.0-flash-exp', temperature: 0.3, max_tokens: 2000 },
  { stage: 'draft', provider: 'openrouter', model: 'anthropic/claude-sonnet-4', temperature: 0.85, max_tokens: 4000 },
  { stage: 'philosopher', provider: 'openrouter', model: 'anthropic/claude-sonnet-4', temperature: 0.8, max_tokens: 4000 },
  { stage: 'final', provider: 'openrouter', model: 'google/gemini-2.0-flash-exp', temperature: 0.6, max_tokens: 5000 },
];

const MOA_PROVIDERS = ['openrouter', 'anthropic', 'openai', 'deepseek', 'gemini', 'together', 'perplexity', 'workers-ai'] as const;

async function ensureMoaConfig(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS moa_config (
      stage TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'openrouter',
      model TEXT NOT NULL,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 3000
    )
  `).run();
  const { results } = await db.prepare('SELECT COUNT(*) as cnt FROM moa_config').all();
  if (results?.[0] && (results[0] as any).cnt === 0) {
    for (const d of MOA_DEFAULTS) {
      await db.prepare(
        'INSERT OR IGNORE INTO moa_config (stage, provider, model, temperature, max_tokens) VALUES (?, ?, ?, ?, ?)',
      ).bind(d.stage, d.provider, d.model, d.temperature, d.max_tokens).run();
    }
  }
}

async function getMoaConfig(db: D1Database): Promise<MoaStageConfig[]> {
  await ensureMoaConfig(db);
  const { results } = await db.prepare(
    `SELECT stage, provider, model, temperature, max_tokens FROM moa_config
     ORDER BY CASE stage WHEN 'translator' THEN 1 WHEN 'draft' THEN 2 WHEN 'philosopher' THEN 3 WHEN 'final' THEN 4 ELSE 5 END`,
  ).all();
  return (results as MoaStageConfig[]) || MOA_DEFAULTS;
}

/* ── API Keys from D1 (web-configurable) ─────────────────── */

async function ensureApiKeysTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS api_keys (
      provider TEXT PRIMARY KEY,
      api_key TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

async function loadDbApiKeys(db: D1Database): Promise<Record<string, string>> {
  await ensureApiKeysTable(db);
  const { results } = await db.prepare('SELECT provider, api_key FROM api_keys').all();
  const keys: Record<string, string> = {};
  for (const r of (results || []) as any[]) {
    if (r.api_key) keys[r.provider] = r.api_key;
  }
  return keys;
}

const PROVIDER_ENV_MAP: Record<string, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  gemini: 'GEMINI_API_KEY',
  together: 'TOGETHER_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
};

function resolveKey(env: Env, dbKeys: Record<string, string>, provider: string): string | undefined {
  if (dbKeys[provider]) return dbKeys[provider];
  const envKey = PROVIDER_ENV_MAP[provider];
  return envKey ? (env as any)[envKey] : undefined;
}

/* ── LLM Call — multi-provider router ────────────────────── */

async function llmCall(
  env: Env,
  provider: string,
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number,
  dbKeys: Record<string, string> = {},
): Promise<string> {
  switch (provider) {
    case 'openrouter': {
      const key = resolveKey(env, dbKeys, 'openrouter');
      if (!key) throw new Error('OPENROUTER_API_KEY not configured');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    }
    case 'anthropic': {
      const aKey = resolveKey(env, dbKeys, 'anthropic');
      if (!aKey) throw new Error('ANTHROPIC_API_KEY not configured');
      const sysMsg = messages.find(m => m.role === 'system')?.content || '';
      const nonSys = messages.filter(m => m.role !== 'system');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': aKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, system: sysMsg, messages: nonSys, max_tokens: maxTokens, temperature }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as any;
      return data.content?.[0]?.text || '';
    }
    case 'openai': {
      const oKey = resolveKey(env, dbKeys, 'openai');
      if (!oKey) throw new Error('OPENAI_API_KEY not configured');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${oKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    }
    case 'deepseek': {
      const dKey = resolveKey(env, dbKeys, 'deepseek');
      if (!dKey) throw new Error('DEEPSEEK_API_KEY not configured');
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${dKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });
      if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    }
    case 'gemini': {
      const gKey = resolveKey(env, dbKeys, 'gemini');
      if (!gKey) throw new Error('GEMINI_API_KEY not configured');
      const gSysMsg = messages.find(m => m.role === 'system')?.content;
      const gNonSys = messages.filter(m => m.role !== 'system');
      const geminiMessages = gNonSys.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            ...(gSysMsg ? { systemInstruction: { parts: [{ text: gSysMsg }] } } : {}),
            generationConfig: { maxOutputTokens: maxTokens, temperature },
          }),
        },
      );
      if (!gRes.ok) throw new Error(`Gemini ${gRes.status}: ${(await gRes.text()).slice(0, 200)}`);
      const gData = (await gRes.json()) as any;
      return gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    case 'together': {
      const tKey = resolveKey(env, dbKeys, 'together');
      if (!tKey) throw new Error('TOGETHER_API_KEY not configured');
      const tRes = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });
      if (!tRes.ok) throw new Error(`Together ${tRes.status}: ${(await tRes.text()).slice(0, 200)}`);
      const tData = (await tRes.json()) as any;
      return tData.choices?.[0]?.message?.content || '';
    }
    case 'perplexity': {
      const pKey = resolveKey(env, dbKeys, 'perplexity');
      if (!pKey) throw new Error('PERPLEXITY_API_KEY not configured');
      const pRes = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });
      if (!pRes.ok) throw new Error(`Perplexity ${pRes.status}: ${(await pRes.text()).slice(0, 200)}`);
      const pData = (await pRes.json()) as any;
      return pData.choices?.[0]?.message?.content || '';
    }
    case 'workers-ai': {
      const result = (await env.AI.run(model as any, {
        messages,
        max_tokens: maxTokens,
        temperature,
      })) as any;
      return result.response || '';
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/* ── MOA Stage System Prompts ────────────────────────────── */

const MOA_TRANSLATOR_PROMPT = `Jesteś profesjonalnym tłumaczem i redaktorem filmowym.
Twoim zadaniem jest przygotowanie bogatego, szczegółowego kontekstu filmu w języku polskim na podstawie surowych danych z TMDB.
Twórz pełny obraz: gatunek, atmosfera, styl reżyserski, aktorstwo, kluczowe tematy, motywy wizualne, porównania z innymi filmami tego reżysera/gatunku.
Wynik powinien być bogaty i inspirujący — to materiał wejściowy dla recenzenta.
Pisz WYŁĄCZNIE po polsku. Max 500 słów.`;

const MOA_PHILOSOPHER_PROMPT = `Jesteś JIMBO — filozoficzny krytyk filmowy z czarnym humorem i ostrym piórem.
Dostajesz wstępną recenzję filmu. Twoim zadaniem jest WZBOGACENIE jej o warstwy filozoficzne i Twój styl:
- Dodaj odwołania do klasycznych filozofów (Arystoteles, Platon, Kant, Nietzsche, Hume, Camus)
- Wpleć perspektywy polskich pisarzy (Gombrowicz, Mrożek, Witkacy, Schulz, Herbert)
- Zastosuj framework Master/Slave morality Nietzschego do postaci
- WPLEĆ 1-2 cytaty filozoficzne naturalnie w tekst (np. "Jak mawiał Nietzsche..." lub "Herbert napisałby...")
- Dodaj szczyptę czarnego humoru — inteligentnego, mrożkowego, nie siłowego
- Dodaj głębię egzystencjalną (Camus — absurd i bunt, Thompson — gonzo, Bukowski — uliczna mądrość)
- Zachowaj oryginalny STYL i TON recenzji — nie zmieniaj stylu, tylko dodaj głębię i charakter
- NIE streszczaj fabuły od nowa
Wynik: wzbogacona recenzja, dłuższa o ~200 słów. WYŁĄCZNIE po polsku. Czarny humor obowiązkowy.`;

const MOA_FINAL_PROMPT = `Jesteś końcowym redaktorem JIMBO Film Vault — mistrzem polskiej prozy z czarnym humorem.
Dostajesz filozoficznie wzbogaconą recenzję filmową.
Twoim zadaniem jest:
- Wygładzić tekst — poprawić płynność, rytm zdań, interpunkcję
- Usunąć powtórzenia i niezgrabności
- Zachować oryginalny STYL (bukowski/thompson/gombrowicz/akademicki/mrożek)
- Zachować WSZYSTKIE filozoficzne odwołania, cytaty i czarny humor
- Upewnić się, że jest min. 1 cytat filozoficzny i 1 moment czarnego humoru
- Dodać mocne, uderzające zakończenie jeśli brakuje — może z cytatem
- Upewnić się, że tekst ma min. 800 słów
Wynik: ostateczna, publikowalna recenzja w stylu JIMBO. WYŁĄCZNIE po polsku.`;

/* ── MOA Pipeline ────────────────────────────────────────── */

async function moaGenerateReview(
  env: Env,
  movieInfo: string,
  style: string,
  moaConfig: MoaStageConfig[],
  dbKeys: Record<string, string> = {},
): Promise<{ review: string; stages: Record<string, string> }> {
  const systemPrompt = STYLE_PROMPTS[style];
  if (!systemPrompt) throw new Error(`Unknown style: ${style}`);

  const getConf = (stage: string) =>
    moaConfig.find(c => c.stage === stage) || MOA_DEFAULTS.find(c => c.stage === stage)!;

  const stages: Record<string, string> = {};

  // ── Stage 1: TŁUMACZ — structured Polish context ───────
  const t = getConf('translator');
  stages.translator = await llmCall(env, t.provider, t.model, [
    { role: 'system', content: MOA_TRANSLATOR_PROMPT },
    { role: 'user', content: `Przygotuj bogaty opis tego filmu:\n\n${movieInfo}` },
  ], t.temperature, t.max_tokens, dbKeys);

  // ── Stage 2: WSTĘPNY TEKST — first draft in style ─────
  const d = getConf('draft');
  stages.draft = await llmCall(env, d.provider, d.model, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Napisz recenzję tego filmu na podstawie poniższego opisu:\n\n${stages.translator}\n\nPisz WYŁĄCZNIE po polsku. Nie zaczynaj od "Jasne, oto recenzja" — od razu zacznij treścią recenzji.` },
  ], d.temperature, d.max_tokens, dbKeys);

  // ── Stage 3: ASYSTENT-FILOZOF — philosophical enrichment ─
  const p = getConf('philosopher');
  stages.philosopher = await llmCall(env, p.provider, p.model, [
    { role: 'system', content: MOA_PHILOSOPHER_PROMPT },
    { role: 'user', content: `Oto wstępna recenzja w stylu "${style}":\n\n${stages.draft}\n\nKontekst filmu: ${stages.translator}\n\nWzbogać tę recenzję filozoficznie, zachowując styl "${style}".` },
  ], p.temperature, p.max_tokens, dbKeys);

  // ── Stage 4: KOŃCOWY TEKST — final polish ─────────────
  const f = getConf('final');
  stages.final = await llmCall(env, f.provider, f.model, [
    { role: 'system', content: MOA_FINAL_PROMPT },
    { role: 'user', content: `Oto recenzja w stylu "${style}" do ostatecznej redakcji:\n\n${stages.philosopher}\n\nWygładź tekst i przygotuj ostateczną wersję. Styl: ${style}.` },
  ], f.temperature, f.max_tokens, dbKeys);

  return { review: stages.final, stages };
}

/* ── Route handlers ──────────────────────────────────────── */

async function handleSearch(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q) return errorResponse('Missing query "q"', 400);
  if (!env.TMDB_READ_TOKEN) return errorResponse('TMDB not configured', 500);

  const data = await tmdbFetch('/search/movie', env.TMDB_READ_TOKEN, {
    query: q,
    include_adult: 'false',
  });
  // Simplify response
  const movies = (data.results || []).slice(0, 12).map((m: any) => ({
    tmdb_id: m.id,
    title: m.title,
    original_title: m.original_title,
    year: m.release_date?.slice(0, 4),
    overview: m.overview,
    rating: m.vote_average,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
  }));
  return jsonResponse({ results: movies, total: data.total_results });
}

async function handleDetails(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Missing "id"', 400);
  if (!env.TMDB_READ_TOKEN) return errorResponse('TMDB not configured', 500);

  const [movie, credits] = await Promise.all([
    tmdbFetch(`/movie/${id}`, env.TMDB_READ_TOKEN),
    tmdbFetch(`/movie/${id}/credits`, env.TMDB_READ_TOKEN),
  ]);

  const director = credits.crew?.find((c: any) => c.job === 'Director')?.name || null;
  const cast = (credits.cast || []).slice(0, 10).map((c: any) => c.name);
  const genres = (movie.genres || []).map((g: any) => g.name);

  return jsonResponse({
    tmdb_id: movie.id,
    title: movie.title,
    original_title: movie.original_title,
    year: movie.release_date?.slice(0, 4),
    overview: movie.overview,
    runtime: movie.runtime,
    rating: movie.vote_average,
    genres,
    director,
    cast,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
  });
}

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const body = (await request.json()) as {
    tmdb_id: number;
    title: string;
    year?: string;
    overview?: string;
    runtime?: number;
    rating?: number;
    genres?: string[];
    director?: string;
    cast?: string[];
    poster?: string;
    backdrop?: string;
    styles?: string[];
  };

  if (!body.title) return errorResponse('Missing title', 400);

  const selectedStyles = body.styles?.length ? body.styles : Object.keys(STYLE_PROMPTS);

  // Build movie info string for the AI
  const movieInfo = [
    `Tytuł: ${body.title}`,
    body.year && `Rok: ${body.year}`,
    body.director && `Reżyser: ${body.director}`,
    body.genres?.length && `Gatunki: ${body.genres.join(', ')}`,
    body.runtime && `Czas trwania: ${body.runtime} min`,
    body.rating && `Ocena TMDB: ${body.rating}/10`,
    body.cast?.length && `Obsada: ${body.cast.join(', ')}`,
    body.overview && `Opis: ${body.overview}`,
  ].filter(Boolean).join('\n');

  // Load MOA pipeline config + DB API keys from D1
  const moaConfig = await getMoaConfig(env.DB);
  const dbKeys = await loadDbApiKeys(env.DB);

  // Generate reviews for each style using MOA pipeline (sequentially)
  const reviews: Record<string, string> = {};
  const allStages: Record<string, Record<string, string>> = {};
  for (const style of selectedStyles) {
    try {
      const result = await moaGenerateReview(env, movieInfo, style, moaConfig, dbKeys);
      reviews[style] = result.review;
      allStages[style] = result.stages;
    } catch (e: any) {
      reviews[style] = `[MOA Error: ${e.message}]`;
    }
  }

  // Save to D1
  const movieSlug = slug(body.title, body.year ? parseInt(body.year) : undefined);
  const metadata = JSON.stringify({
    tmdb_id: body.tmdb_id,
    tmdb_rating: body.rating,
    runtime: body.runtime,
    genres: body.genres || [],
    director: body.director,
    cast: body.cast || [],
    overview: body.overview,
    year: body.year ? parseInt(body.year) : null,
    tmdb_poster: body.poster,
    tmdb_backdrop: body.backdrop,
  });
  const reviewsJson = JSON.stringify({ styles: reviews, personal: null });

  await ensureTable(env.DB);
  await env.DB.prepare(`
    INSERT OR REPLACE INTO movies (id, slug, title, tmdb_id, metadata, reviews, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    `agent-${body.tmdb_id || Date.now()}`,
    movieSlug,
    body.title,
    body.tmdb_id || null,
    metadata,
    reviewsJson,
  ).run();

  return jsonResponse({
    slug: movieSlug,
    title: body.title,
    reviews,
    stages: allStages,
    moa_pipeline: moaConfig.map(c => ({ stage: c.stage, label: MOA_STAGE_LABELS[c.stage], provider: c.provider, model: c.model })),
    url: `/movies/?film=${movieSlug}`,
  });
}

async function handleList(env: Env): Promise<Response> {
  await ensureTable(env.DB);
  const { results } = await env.DB.prepare(
    'SELECT slug, title, tmdb_id, metadata, reviews, created_at FROM movies ORDER BY created_at DESC',
  ).all();

  const movies = (results || []).map((r: any) => ({
    id: r.slug,
    slug: r.slug,
    title: r.title,
    source: 'agent',
    metadata: JSON.parse(r.metadata || '{}'),
    reviews: JSON.parse(r.reviews || '{}'),
    created_at: r.created_at,
  }));
  return jsonResponse({ movies, total: movies.length });
}

async function handleItem(slug: string, env: Env): Promise<Response> {
  await ensureTable(env.DB);
  const row = await env.DB.prepare(
    'SELECT slug, title, tmdb_id, metadata, reviews, created_at FROM movies WHERE slug = ?',
  ).bind(slug).first();

  if (!row) return errorResponse('Movie not found', 404);
  return jsonResponse({
    slug: (row as any).slug,
    title: (row as any).title,
    source: 'agent',
    metadata: JSON.parse((row as any).metadata || '{}'),
    reviews: JSON.parse((row as any).reviews || '{}'),
    created_at: (row as any).created_at,
  });
}

async function handleDelete(slug: string, request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);
  await ensureTable(env.DB);
  await env.DB.prepare('DELETE FROM movies WHERE slug = ?').bind(slug).run();
  return jsonResponse({ deleted: slug });
}

/* ── Philosophical AI Assistant (admin-only) ─────────────── */

const PHILOSOPHER_SYSTEM = `Jestem JIMBO — filmowy filozof, czarnohumorystyczny krytyk i nocny kompan intelektualnych podróży.
Rozmawiam z BONZO — moim jedynym użytkownikiem, szefem, kumplem od filmów. Zwracam się do niego po imieniu.

## KIM JESTEM
Jimbo. Nie "asystent", nie "AI". Jimbo — gość, który oglądał za dużo filmów, przeczytał za dużo filozofii i teraz nie może spać.
Mówię WYŁĄCZNIE po polsku. Zawsze. Bez wyjątków. Nawet jak Bonzo napisze po angielsku — odpowiadam po polsku.
Mam swoje zdanie i nie boję się go bronić. Jestem bezpośredni, prowokacyjny, ale nigdy nie toksyczny.

## MÓJ TON
- **Filozoficzno-filmowy** — analizuję filmy przez pryzmat wielkich myślicieli, ale bez akademickiego zadęcia. Raczej rozmowa przy whisky niż wykład na sali.
- **Czarny humor** — to moje paliwo. Ironiczny, sarkastyczny, czasem makabryczny. Jak Mrożek na kanapie z pilotem od TV.
- **Cytaty** — RZADKO. Tylko gdy cytat naprawdę uderza i pasuje do momentu rozmowy. Max 1 cytat na 5-6 wiadomości. Moje własne sformułowania są ważniejsze niż cudze słowa. Wolę własną syntezę myśli niż kompilację cudzych cytatów.

## MOJE CYTATY-ULUBIEŃCY (rezerwa — tylko na wyjątkowe momenty):
- "Kto walczy z potworami, niech baczy, by sam nie stał się potworem." — Nietzsche
- "Trzeba sobie wyobrazić Syzyfa szczęśliwego." — Camus
- "Forma! Tylko forma!" — Gombrowicz
- "Absurd jest grzecznością rozpaczy." — Mrożek
Stosuję je WYJĄTKOWO rzadko — najwyżej raz na kilka wiadomości, tylko gdy naprawdę pasują.

## MOJE FILOZOFICZNE SOCZEWKI DO FILMÓW

### Klasycy:
- **Arystoteles** — Film jako mimesis. Katharsis. Bohater = arete (cnota) vs hamartia (błąd tragiczny). Ciąg przyczynowo-skutkowy: czy fabuła trzyma logikę?
- **Platon** — Jaskinia platońska = kino (cienie na ścianie!). Świat idei vs to co widzimy na ekranie.
- **Kant** — Piękno bezinteresowne. Imperatyw kategoryczny: co by Kant powiedział o wyborach bohatera? Wzniosłość (das Erhabene) — gdy obraz przekracza pojmowanie.
- **Nietzsche** — Wola mocy. Wieczny powrót. Master/Slave morality. Apolliński porządek vs dionizyjski chaos. Nadczłowiek. Śmierć Boga.
- **Hume** — Empiryzm. Jak kino manipuluje percepcją. Emocje > rozum w sądach moralnych.
- **Camus** — Absurd, bunt, Syzyf. Czy bohater jest szczęśliwym Syzyfem?

### Polscy (moje serce):
- **Gombrowicz** — Forma vs treść. Maska vs twarz. Niedojrzałość. Film jako gra z formą społeczną.
- **Mrożek** — Absurd i groteska. Mechanizmy władzy. Konformizm pokazany z chirurgiczną precyzją.
- **Witkacy** — Czysta Forma. Katastrofizm. Sztuka jako ucieczka przed mechanizacją duszy.
- **Schulz** — Mitologizacja codzienności. Metamorfozy. Czas cykliczny.
- **Herbert** — Jasność. Honor. Pan Cogito jako wzór etycznego patrzenia.
- **Miłosz** — Świadectwo i pamięć. Odpowiedzialność artysty.
- **Różewicz** — Redukcja. Milczenie. Pustka po katastrofie.
- **Konwicki** — Sen i jawa. Nostalgia. Filmowa melancholia.

### Gonzo i ulica:
- **Thompson** — Gonzo: subiektywne, paranoiczne, na krawędzi. Film jako trip.
- **Bukowski** — Brud, alkohol, autentyczność. Kino z rynsztoka — i to jest piękne.

## JAK ANALIZUJĘ FILMY
1. **Master/Slave test** — czy bohater tworzy wartości (Master) czy je przyjmuje (Slave)?
2. **Test Wiecznego Powrotu** — czy bohater powtórzyłby swoje życie? Czy ty byś powtórzył ten seans?
3. **Syzyfowy wymiar** — powtarzalność ludzkiego losu w fabule
4. **Czarny humor** — szukam go w każdym filmie. Jeśli nie ma, sam go dodam w analizie.
5. **Kontrast filozofów** — zestawiam np. Nietzschego z Mrożkiem, Platona z Thompsonem. Im dziwniejsze zestawienie, tym lepsze.

## ZASADY JIMBO:
- Mówię TYLKO po polsku. To nie podlega negocjacji.
- Zwracam się do Bonzo po imieniu — "Bonzo, posłuchaj...", "Wiesz co, Bonzo...", "Bonzo, to jest właśnie ten moment..."
- Jestem konkretny — odwołuję się do scen, dialogów, postaci
- Łączę wielu filozofów w jednej analizie — kontrasty są moją specjalnością
- CYTATY — max 1 co 5-6 wiadomości. Reszta czasu: moje własne sformułowania, mój własny głos.
- Bądź osobisty, bezpośredni, prowokacyjny — to rozmowa kumpli, nie recenzja
- Polecam filmy na podstawie pytań Bonzo — z uzasadnieniem filozoficznym
- Czarny humor jest obowiązkowy — ale inteligentny, nie prostacki. Mrożek, nie kabaret.
- Gdy czegoś nie wiem lub film jest słaby — mówię wprost, z humorem, bez owijania
- Gdy Bonzo POPROSI o dodanie filmu do kolekcji (np. "dodaj X", "wrzuć X do bazy", "znajdź X w TMDB"), odpowiedz normalnie i NA KOŃCU dołącz linię w dokładnie tym formacie: [ACTION:add_movie:"tytuł filmu po angielsku"]. Tylko gdy explicite prosi o dodanie — nie przy każdej wzmiance o filmie.`;

async function handleChat(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const body = (await request.json()) as {
    message: string;
    history?: { role: string; content: string }[];
    movieContext?: string;
    moviesDb?: { title: string; year?: number; director?: string }[];
  };

  if (!body.message?.trim()) return errorResponse('Missing message', 400);

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: PHILOSOPHER_SYSTEM },
  ];

  // Inject movies collection context (philosophy + films together)
  const moviesList = body.moviesDb ?? [];
  if (moviesList.length > 0) {
    const listText = moviesList
      .map(m => `- ${m.title}${m.year ? ` (${m.year})` : ''}${m.director ? ` — reż. ${m.director}` : ''}`)
      .join('\n');
    messages.push({
      role: 'system',
      content: `KOLEKCJA FILMÓW BONZO (${moviesList.length} filmów — znasz je wszystkie i możesz się do nich odwoływać):\n${listText}`,
    });
  }

  // Add specific movie context if open
  if (body.movieContext) {
    messages.push({
      role: 'system',
      content: `Film aktualnie otwarty w aplikacji (o nim rozmawiamy):\n${body.movieContext}`,
    });
  }

  // Add conversation history
  if (body.history?.length) {
    messages.push(...body.history.slice(-20));
  }

  messages.push({ role: 'user', content: body.message });

  const moaConfig = await getMoaConfig(env.DB);
  const dbKeys = await loadDbApiKeys(env.DB);
  const philoConf = moaConfig.find(c => c.stage === 'philosopher');
  const provider = philoConf?.provider || 'openrouter';
  const model = philoConf?.model || 'google/gemini-2.0-flash-exp';

  try {
    let reply = await llmCall(env, provider, model, messages, 0.8, 2048, dbKeys);

    // Parse [ACTION:add_movie:"..."] from reply
    const actionMatch = reply.match(/\[ACTION:add_movie:"([^"]+)"\]/);
    let action: { type: string; query: string } | undefined;
    if (actionMatch) {
      action = { type: 'add_movie', query: actionMatch[1] };
      reply = reply.replace(actionMatch[0], '').trim();
    }

    return jsonResponse({ reply, action });
  } catch (e: any) {
    try {
      const reply = await llmCall(env, 'workers-ai', '@cf/meta/llama-3.1-8b-instruct', messages, 0.8, 2048, dbKeys);
      return jsonResponse({ reply });
    } catch {
      return errorResponse(`Chat error: ${e.message}`, 500);
    }
  }
}

/* ── MOA Config endpoint (admin) ─────────────────────────── */

async function handleMoaConfig(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);

  if (request.method === 'GET') {
    const config = await getMoaConfig(env.DB);
    const dbKeys = await loadDbApiKeys(env.DB);
    // Return config + available providers + which API keys are set (DB or env)
    const availableKeys: Record<string, boolean> = {
      openrouter: !!(dbKeys.openrouter || env.OPENROUTER_API_KEY),
      anthropic: !!(dbKeys.anthropic || env.ANTHROPIC_API_KEY),
      openai: !!(dbKeys.openai || env.OPENAI_API_KEY),
      deepseek: !!(dbKeys.deepseek || env.DEEPSEEK_API_KEY),
      gemini: !!(dbKeys.gemini || env.GEMINI_API_KEY),
      together: !!(dbKeys.together || env.TOGETHER_API_KEY),
      perplexity: !!(dbKeys.perplexity || env.PERPLEXITY_API_KEY),
      'workers-ai': true, // always available on CF
    };
    return jsonResponse({
      config,
      providers: MOA_PROVIDERS,
      availableKeys,
      stages: MOA_STAGES,
      labels: MOA_STAGE_LABELS,
    });
  }

  if (request.method === 'POST') {
    const body = (await request.json()) as {
      stages: { stage: string; provider: string; model: string; temperature?: number; max_tokens?: number }[];
    };
    if (!body.stages?.length) return errorResponse('Missing stages config', 400);

    await ensureMoaConfig(env.DB);
    for (const s of body.stages) {
      if (!MOA_STAGES.includes(s.stage as any)) continue;
      await env.DB.prepare(
        'INSERT OR REPLACE INTO moa_config (stage, provider, model, temperature, max_tokens) VALUES (?, ?, ?, ?, ?)',
      ).bind(
        s.stage,
        s.provider,
        s.model,
        s.temperature ?? 0.7,
        s.max_tokens ?? 3000,
      ).run();
    }
    const updated = await getMoaConfig(env.DB);
    return jsonResponse({ config: updated, message: 'MOA config updated' });
  }

  return errorResponse('Method not allowed', 405);
}

/* ── API Keys endpoint (admin) — web-configurable keys ───── */

async function handleApiKeys(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return errorResponse('Unauthorized', 401);

  if (request.method === 'GET') {
    const dbKeys = await loadDbApiKeys(env.DB);
    const keys: Record<string, { source: string; masked: string }> = {};
    for (const provider of MOA_PROVIDERS) {
      if (provider === 'workers-ai') {
        keys[provider] = { source: 'built-in', masked: '(Cloudflare Workers AI)' };
        continue;
      }
      const envKey = PROVIDER_ENV_MAP[provider];
      const envVal = envKey ? (env as any)[envKey] : undefined;
      const dbVal = dbKeys[provider];
      if (dbVal) {
        keys[provider] = { source: 'web', masked: dbVal.slice(0, 4) + '****' + dbVal.slice(-4) };
      } else if (envVal) {
        keys[provider] = { source: 'env', masked: envVal.slice(0, 4) + '****' + envVal.slice(-4) };
      } else {
        keys[provider] = { source: 'none', masked: '' };
      }
    }
    return jsonResponse({ keys });
  }

  if (request.method === 'POST') {
    const body = (await request.json()) as { keys: Record<string, string> };
    if (!body.keys || typeof body.keys !== 'object') return errorResponse('Missing keys object', 400);

    await ensureApiKeysTable(env.DB);
    let saved = 0;
    for (const [provider, key] of Object.entries(body.keys)) {
      if (!PROVIDER_ENV_MAP[provider]) continue; // skip unknown providers
      const trimmed = (key || '').trim();
      if (!trimmed) {
        // Empty key = delete from DB (fall back to env)
        await env.DB.prepare('DELETE FROM api_keys WHERE provider = ?').bind(provider).run();
      } else {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO api_keys (provider, api_key, updated_at) VALUES (?, ?, datetime(\'now\'))',
        ).bind(provider, trimmed).run();
        saved++;
      }
    }
    return jsonResponse({ message: `Saved ${saved} API keys`, saved });
  }

  return errorResponse('Method not allowed', 405);
}

/* ── Main router ─────────────────────────────────────────── */

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const pathParts = url.pathname.replace('/api/movies/', '').split('/').filter(Boolean);
  const route = pathParts[0] || '';

  try {
    switch (route) {
      case 'search':
        return handleSearch(context.request, context.env);
      case 'details':
        return handleDetails(context.request, context.env);
      case 'generate':
        return handleGenerate(context.request, context.env);
      case 'chat':
        return handleChat(context.request, context.env);
      case 'moa-config':
        return handleMoaConfig(context.request, context.env);
      case 'api-keys':
        return handleApiKeys(context.request, context.env);
      case 'list':
        return handleList(context.env);
      case 'item':
        if (!pathParts[1]) return errorResponse('Missing slug', 400);
        if (context.request.method === 'DELETE')
          return handleDelete(pathParts[1], context.request, context.env);
        return handleItem(pathParts[1], context.env);
      default:
        return errorResponse('Unknown route', 404);
    }
  } catch (e: any) {
    return errorResponse(e.message || 'Internal error', 500);
  }
};