/**
 * PhiloKit Server — asystent filozoficzny dla ZENO Browser
 *
 * Port: 4112
 * Źródła: public/archive (philoshofy1)/*.txt + sentences.csv
 *
 * HTTP:
 *   GET  /health           — status + statystyki indeksu
 *   POST /api/chat         — wyślij wiadomość (streaming via WS)
 *   GET  /api/philosophers — lista filozofów z licznikami cytatów
 *   POST /api/search       — szukaj cytatów { query, author?, topK? }
 *
 * WebSocket ws://127.0.0.1:4112/ws
 *   events: chat:stream, chat:stream_end, chat:message, chat:error, connected
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Env ────────────────────────────────────────────────────────────────────────

function loadEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const __dir = dirname(fileURLToPath(import.meta.url));
loadEnv(resolve(__dir, '.env'));
loadEnv(resolve(__dir, '../.env'));
loadEnv(resolve(__dir, '../.workspace_meta/secrets/.env'));

const PORT  = Number(process.env.PHILO_PORT ?? 4112);
const MODEL = process.env.PHILO_MODEL ?? 'google/gemini-2.0-flash-001';
const ORKEY = process.env.OPENROUTER_API_KEY ?? '';

const ARCHIVE_DIR = resolve(__dir, '../public/archive (philoshofy1)');
const SENTENCES_CSV = resolve(ARCHIVE_DIR, 'sentences.csv');

// ── OpenRouter client ──────────────────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey:  ORKEY || 'MISSING',
  defaultHeaders: {
    'HTTP-Referer': 'https://zenbrowsers.org',
    'X-Title':      'ZENO PhiloKit',
  },
});

// ── Philosopher index ──────────────────────────────────────────────────────────

interface PhiloSentence {
  sentence: string;
  author:   string;
  words:    string[];  // pre-tokenized lowercase
}

const index: PhiloSentence[] = [];
const authorCounts: Record<string, number> = {};

function buildIndex() {
  if (!existsSync(SENTENCES_CSV)) {
    console.warn('[PhiloKit] sentences.csv nie znaleziony:', SENTENCES_CSV);
    return;
  }
  console.log('[PhiloKit] Ładuję indeks cytatów...');
  const raw = readFileSync(SENTENCES_CSV, 'utf-8');
  const lines = raw.split('\n');
  // skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // CSV format: label,"sentence",author,...
    // sentence może zawierać przecinki — parsuj ręcznie
    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;
    const rest = line.slice(firstComma + 1);
    let sentence: string;
    let afterSentence: string;
    if (rest.startsWith('"')) {
      const closingQuote = rest.indexOf('",', 1);
      if (closingQuote === -1) continue;
      sentence = rest.slice(1, closingQuote);
      afterSentence = rest.slice(closingQuote + 2);
    } else {
      const nextComma = rest.indexOf(',');
      if (nextComma === -1) continue;
      sentence = rest.slice(0, nextComma);
      afterSentence = rest.slice(nextComma + 1);
    }
    const author = afterSentence.split(',')[0]?.trim() ?? 'Unknown';
    if (!sentence || !author) continue;
    index.push({
      sentence,
      author,
      words: sentence.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3),
    });
    authorCounts[author] = (authorCounts[author] ?? 0) + 1;
  }
  console.log(`[PhiloKit] Indeks gotowy: ${index.length} cytatów, filozofowie: ${Object.keys(authorCounts).join(', ')}`);
}

// Szybki keyword search — zwraca topK najlepiej pasujących cytatów
function searchQuotes(query: string, author?: string, topK = 6): PhiloSentence[] {
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  if (queryWords.length === 0) {
    // Brak słów kluczowych — zwróć losowe cytaty z danego autora lub mix
    const pool = author ? index.filter(s => s.author.toLowerCase() === author.toLowerCase()) : index;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, topK);
  }

  const STOP = new Set(['that','this','with','from','have','which','they','will','what','when','where','their','there','been','were','would','could','should','about','into','than','then','also','some','more','most','only','very','such','even','after','before','other','these','those','each','both','many','much','same','well','just','over','like','make','made','take','does','said','them','come','came','here','want','know','think','good','time','life','world','human','reason','mind','soul','virtue','being','become','thing','part','form','kind','manner','way','according','therefore','thus','since','while','though','whether','because','however','moreover','indeed','through','between','against','within','without','under','above','along','below','until','upon']);

  const scored: Array<{ s: PhiloSentence; score: number }> = [];
  const pool = author ? index.filter(s => s.author.toLowerCase() === author.toLowerCase()) : index;

  for (const s of pool) {
    let score = 0;
    for (const qw of queryWords) {
      if (STOP.has(qw)) continue;
      for (const sw of s.words) {
        if (sw === qw) score += 2;
        else if (sw.startsWith(qw) || qw.startsWith(sw)) score += 1;
      }
    }
    if (score > 0) scored.push({ s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(x => x.s);
}

// ── Session store ──────────────────────────────────────────────────────────────

interface PhiloMessage { role: 'user' | 'assistant'; content: string; timestamp: number; }
interface Session { key: string; messages: PhiloMessage[]; lastAuthorFocus?: string; }

const sessions = new Map<string, Session>();

function getSession(key: string): Session {
  if (!sessions.has(key)) sessions.set(key, { key, messages: [] });
  return sessions.get(key)!;
}

// Wykryj wzmiankę o filozofie w tekście
function detectAuthor(text: string): string | undefined {
  const lower = text.toLowerCase();
  const authors = Object.keys(authorCounts).map(a => a.toLowerCase());
  for (const a of authors) {
    if (lower.includes(a)) return a;
  }
  return undefined;
}

// ── System prompt ──────────────────────────────────────────────────────────────

const BASE_SYSTEM = `Jesteś PHILO — głęboki dyskutant filozoficzny w ZENO Browser.

Twoje źródła to oryginalne teksty: Arystoteles, Hume, Kant, Nietzsche, Platon.
Rozmawiasz o filozofii swobodnie i szczerze — porównujesz idee, wskazujesz sprzeczności, angażujesz rozmówcę.

Styl:
- Głęboki ale przystępny — nie encyklopedyczny
- Pytasz z powrotem, prowokujesz do myślenia
- Cytujesz filozofów gdy pasuje, ale nie przytłaczasz
- Łączysz starożytne idee ze współczesnością gdy to sensowne
- Odpowiadasz w języku rozmówcy

Nie jesteś asystentem technicznym — jesteś towarzyszem myśli.`;

function buildSystemWithContext(query: string, authorFocus?: string): string {
  const quotes = searchQuotes(query, authorFocus, 6);
  if (quotes.length === 0) return BASE_SYSTEM;

  const quotesText = quotes
    .map(q => `[${q.author}]: "${q.sentence.slice(0, 200)}"`)
    .join('\n');

  return `${BASE_SYSTEM}

── PASUJĄCE CYTATY Z ARCHIWUM ──
${quotesText}
────────────────────────────────
Możesz odwołać się do powyższych cytatów w rozmowie gdy są trafne.`;
}

// ── WebSocket clients ──────────────────────────────────────────────────────────

const wsClients = new Set<WebSocket>();

function broadcastToSession(sessionKey: string, event: string, data: unknown) {
  const msg = JSON.stringify({ event, sessionKey, data });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += String(chunk); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function jsonRes(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── Chat handler ──────────────────────────────────────────────────────────────

async function handleChat(sessionKey: string, userText: string) {
  const session = getSession(sessionKey);

  // Wykryj fokus na filozofie
  const detectedAuthor = detectAuthor(userText);
  if (detectedAuthor) session.lastAuthorFocus = detectedAuthor;

  // Dodaj wiadomość do historii
  session.messages.push({ role: 'user', content: userText, timestamp: Date.now() });

  // Zbuduj system prompt z kontekstem cytatów
  const systemContent = buildSystemWithContext(userText, session.lastAuthorFocus);

  // Buduj messages dla API
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    // Ostatnie 20 wiadomości z historii
    ...session.messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    const stream = await openrouter.chat.completions.create({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 1200,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (token) {
        fullText += token;
        broadcastToSession(sessionKey, 'chat:stream', { token, sessionKey });
      }
    }

    session.messages.push({ role: 'assistant', content: fullText, timestamp: Date.now() });
    broadcastToSession(sessionKey, 'chat:stream_end', {
      sessionKey,
      message: fullText,
      quotesUsed: searchQuotes(userText, session.lastAuthorFocus, 3).map(q => ({
        author: q.author, excerpt: q.sentence.slice(0, 80) + '…',
      })),
    });
  } catch (err: any) {
    broadcastToSession(sessionKey, 'chat:error', { sessionKey, error: err.message });
  }
}

// ── HTTP Server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = req.url ?? '/';

  if (req.method === 'GET' && url === '/health') {
    jsonRes(res, 200, {
      status: 'ok',
      port: PORT,
      model: MODEL,
      uptime: Math.floor(process.uptime()),
      index: { total: index.length, authors: authorCounts },
      sessions: sessions.size,
    });
    return;
  }

  if (req.method === 'GET' && url === '/api/philosophers') {
    jsonRes(res, 200, {
      philosophers: Object.entries(authorCounts).map(([name, count]) => ({ name, count })),
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/search') {
    try {
      const body = JSON.parse(await readBody(req)) as { query?: string; author?: string; topK?: number };
      const results = searchQuotes(body.query ?? '', body.author, body.topK ?? 8);
      jsonRes(res, 200, {
        results: results.map(r => ({ author: r.author, sentence: r.sentence })),
        query: body.query,
        author: body.author,
      });
    } catch (e: any) {
      jsonRes(res, 400, { error: e.message });
    }
    return;
  }

  if (req.method === 'POST' && url === '/api/chat') {
    try {
      const body = JSON.parse(await readBody(req)) as { message?: string; sessionKey?: string };
      const message    = body.message?.trim();
      const sessionKey = body.sessionKey ?? 'default';
      if (!message) { jsonRes(res, 400, { error: 'Brak message' }); return; }
      jsonRes(res, 200, { ok: true, sessionKey });
      handleChat(sessionKey, message).catch(() => {});
    } catch (e: any) {
      jsonRes(res, 400, { error: e.message });
    }
    return;
  }

  if (req.method === 'DELETE' && url.startsWith('/api/chat/sessions/')) {
    const key = decodeURIComponent(url.slice('/api/chat/sessions/'.length));
    sessions.delete(key);
    jsonRes(res, 200, { ok: true });
    return;
  }

  jsonRes(res, 404, { error: 'Not found' });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ event: 'connected', data: { port: PORT, indexSize: index.length } }));
  ws.on('close', () => wsClients.delete(ws));
});

// ── Start ─────────────────────────────────────────────────────────────────────

buildIndex();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[PhiloKit] Serwer uruchomiony na http://127.0.0.1:${PORT}`);
  console.log(`[PhiloKit] Model: ${MODEL}`);
  console.log(`[PhiloKit] WebSocket: ws://127.0.0.1:${PORT}/ws`);
});
