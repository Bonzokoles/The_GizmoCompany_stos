/**
 * JimboKit Server — standalone AI chat backend dla ZENO Browser
 *
 * Port:  4111 (domyślnie)
 * HTTP endpoints:
 *   GET  /health                        — status serwera
 *   GET  /api/system/info               — info o serwisie
 *   POST /api/chat                      — wyślij wiadomość (streaming via WS)
 *   GET  /api/chat/sessions             — lista sesji
 *   GET  /api/chat/sessions/:key        — historia sesji
 *   DELETE /api/chat/sessions/:key      — usuń sesję
 *   POST /api/webgate/fetch             — fetch URL (dla terminala)
 *
 * WebSocket ws://127.0.0.1:4111/ws:
 *   events: chat:stream, chat:stream_end, chat:message, chat:thinking,
 *            chat:tool_use, sessions:updated, connected
 *
 * Env (z ../.env lub własny .env):
 *   OPENROUTER_API_KEY  — klucz OpenRouter (wymagany)
 *   JIMBO_PORT          — port (domyślnie 4111)
 *   JIMBO_MODEL         — model (domyślnie deepseek/deepseek-r1-0528:free)
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Env (załaduj ../.env lub .env) ────────────────────────────────────────────

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

const PORT   = Number(process.env.JIMBO_PORT   ?? 4111);
const MODEL  = process.env.JIMBO_MODEL  ?? 'deepseek/deepseek-r1-0528:free';
const ORKEY  = process.env.OPENROUTER_API_KEY ?? '';

// ── OpenRouter client ──────────────────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey:  ORKEY || 'MISSING',
  defaultHeaders: {
    'HTTP-Referer': 'https://zenbrowsers.org',
    'X-Title':      'ZENO JimboKit',
  },
});

// ── Session store (in-memory) ─────────────────────────────────────────────────

interface JimboMessage {
  role:       'user' | 'assistant';
  content:    string;
  agent_name?: string;
  task_id?:   string;
  timestamp:  number;
}

interface Session {
  key:      string;
  messages: JimboMessage[];
}

const sessionStore = new Map<string, Session>();

function getOrCreate(key: string): Session {
  if (!sessionStore.has(key)) {
    sessionStore.set(key, { key, messages: [] });
  }
  return sessionStore.get(key)!;
}

function chatIdFromKey(key: string): string {
  const idx = key.indexOf(':');
  return idx !== -1 ? key.slice(idx + 1) : key;
}

// ── WebSocket clients ─────────────────────────────────────────────────────────

const wsClients = new Set<WebSocket>();

function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += String(chunk); });
    req.on('end',  () => resolve(body));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

// ── Chat handler — streaming via WebSocket ────────────────────────────────────

async function handleChat(req: http.IncomingMessage, res: http.ServerResponse) {
  const raw = await readBody(req);
  const body = JSON.parse(raw) as { message?: string; prompt?: string; session_id?: string };

  const message    = body.message ?? body.prompt ?? '';
  const sessionKey = body.session_id ?? `web:${randomUUID()}`;
  const chatId     = chatIdFromKey(sessionKey);
  const task_id    = randomUUID();

  if (!message.trim()) {
    return json(res, 400, { error: 'Empty message' });
  }

  const session = getOrCreate(sessionKey);
  session.messages.push({ role: 'user', content: message, timestamp: Date.now() });

  // Odpowiedź natychmiastowa (openbotx-compatible — frontend zna task_id)
  json(res, 200, { task_id, session_id: sessionKey, content: '' });

  // Streaming async — wyniki przez WebSocket
  setImmediate(async () => {
    if (!ORKEY) {
      broadcast('chat:message', {
        chat_id: chatId, task_id,
        content: [{ type: 'text', text: '⚠ Brak OPENROUTER_API_KEY w konfiguracji serwera.' }],
      });
      return;
    }

    try {
      const contextMessages = session.messages
        .slice(-20)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const stream = await openrouter.chat.completions.create({
        model:      MODEL,
        messages:   contextMessages,
        max_tokens: 2048,
        stream:     true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? '';
        if (token) {
          fullContent += token;
          broadcast('chat:stream', { chat_id: chatId, content: token, task_id });
        }
      }

      broadcast('chat:stream_end', { chat_id: chatId, task_id });

      session.messages.push({
        role:      'assistant',
        content:   fullContent,
        task_id,
        timestamp: Date.now(),
      });

      broadcast('chat:message', {
        chat_id:    chatId,
        task_id,
        content:    [{ type: 'text', text: fullContent }],
        agent_name: 'jimbo',
      });

      broadcast('sessions:updated', {});

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[jimbokit] chat error:', msg);
      broadcast('chat:message', {
        chat_id: chatId, task_id,
        content: [{ type: 'text', text: `⚠ Błąd AI: ${msg}` }],
      });
    }
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const method = req.method ?? 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // ── GET /health ──────────────────────────────────────────────────────────
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json(res, 200, {
        status:   'ok',
        service:  'jimbokit-server',
        port:     PORT,
        model:    MODEL,
        sessions: sessionStore.size,
        clients:  wsClients.size,
        ws:       `ws://127.0.0.1:${PORT}/ws`,
      });
    }

    // ── GET /api/system/info ─────────────────────────────────────────────────
    if (method === 'GET' && url.pathname === '/api/system/info') {
      return json(res, 200, {
        service:  'jimbokit-server',
        version:  '1.0.0',
        port:     PORT,
        model:    MODEL,
        provider: 'openrouter',
        sessions: sessionStore.size,
        clients:  wsClients.size,
        uptime:   process.uptime(),
        nodeVersion: process.version,
        hasApiKey: !!ORKEY,
      });
    }

    // ── POST /api/chat ───────────────────────────────────────────────────────
    if (method === 'POST' && url.pathname === '/api/chat') {
      return await handleChat(req, res);
    }

    // ── GET /api/chat/sessions ───────────────────────────────────────────────
    if (method === 'GET' && url.pathname === '/api/chat/sessions') {
      const list = [...sessionStore.values()].map(s => ({ key: s.key }));
      return json(res, 200, list);
    }

    // ── session/:key ─────────────────────────────────────────────────────────
    const sessionMatch = url.pathname.match(/^\/api\/chat\/sessions\/(.+)$/);
    if (sessionMatch) {
      const key = decodeURIComponent(sessionMatch[1]);

      if (method === 'GET') {
        const s = sessionStore.get(key);
        if (!s) return json(res, 404, { error: 'Session not found' });
        return json(res, 200, { messages: s.messages, live_state: null });
      }

      if (method === 'DELETE') {
        sessionStore.delete(key);
        broadcast('sessions:updated', {});
        return json(res, 200, { ok: true });
      }
    }

    // ── POST /api/webgate/fetch (terminal /fetch command) ────────────────────
    if (method === 'POST' && url.pathname === '/api/webgate/fetch') {
      const body = JSON.parse(await readBody(req)) as { url: string };
      const fetchRes = await fetch(body.url, {
        headers: { 'User-Agent': 'ZENO-JimboKit/1.0' },
        signal:  AbortSignal.timeout(10_000),
      });
      const content     = await fetchRes.text();
      const contentType = fetchRes.headers.get('content-type') ?? 'text/plain';
      return json(res, 200, { content, contentType, status: fetchRes.status });
    }

    json(res, 404, { error: 'Not found', path: url.pathname });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[jimbokit] request error:', msg);
    json(res, 500, { error: msg });
  }
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
  ws.send(JSON.stringify({ event: 'connected', data: { service: 'jimbokit-server', model: MODEL } }));
});

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ JimboKit server  →  http://127.0.0.1:${PORT}`);
  console.log(`   WebSocket        →  ws://127.0.0.1:${PORT}/ws`);
  console.log(`   Model            →  ${MODEL}`);
  if (!ORKEY) {
    console.warn('⚠️  OPENROUTER_API_KEY nie ustawiony — odpowiedzi AI nie będą działać');
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} jest już zajęty`);
    process.exit(1);
  } else {
    console.error('Server error:', err.message);
  }
});
