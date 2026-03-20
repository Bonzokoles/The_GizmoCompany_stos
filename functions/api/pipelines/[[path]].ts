/**
 * ZENO Browser — Pipelines API Worker
 * Event streaming & analytics pipeline (LinkedOut-style)
 *
 * Endpoints:
 *   GET  /api/pipelines/status    — Service health
 *   GET  /api/pipelines/list      — List configured pipelines
 *   GET  /api/pipelines/events    — Recent events (from D1)
 *   POST /api/pipelines/ingest    — Ingest new event into pipeline
 *   GET  /api/pipelines/stats     — Pipeline aggregate stats
 *   POST /api/pipelines/query     — Query pipeline data (R2 SQL style)
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

/* ─── Pipeline Definitions ─────────────────────── */

interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  source: string;
  destination: string;
  status: 'active' | 'paused' | 'error';
  eventsPerDay: number;
  category: 'analytics' | 'content' | 'ecommerce' | 'ai' | 'system';
}

const PIPELINES: PipelineConfig[] = [
  {
    id: 'page-analytics',
    name: 'Page Analytics Pipeline',
    description: 'Pageview & visitor events → R2 Data Catalog (Iceberg) → SQL analytics',
    source: 'Umami + sendBeacon()',
    destination: 'R2 Data Catalog → R2 SQL',
    status: 'active',
    eventsPerDay: 5000,
    category: 'analytics',
  },
  {
    id: 'worker-metrics',
    name: 'Workers Metrics Pipeline',
    description: 'Worker invocation metrics & latency tracking',
    source: 'CF Workers (39)',
    destination: 'D1 → Dashboard',
    status: 'active',
    eventsPerDay: 15000,
    category: 'system',
  },
  {
    id: 'content-pipeline',
    name: 'Content Generation Pipeline',
    description: 'MOA content generation events — topic → drafts → critique → final',
    source: 'MOA Pipeline Worker',
    destination: 'D1 + R2 Storage',
    status: 'active',
    eventsPerDay: 200,
    category: 'content',
  },
  {
    id: 'crawler-events',
    name: 'Crawler Detection Pipeline',
    description: 'Bot/crawler detection events with classification',
    source: 'CF Analytics API',
    destination: 'D1 → Crawler Profiles',
    status: 'active',
    eventsPerDay: 3000,
    category: 'analytics',
  },
  {
    id: 'ecommerce-events',
    name: 'E-commerce Event Pipeline',
    description: 'WhiteCat product views, cart events, purchase tracking',
    source: 'WhiteCat API Worker',
    destination: 'D1 + R2 Data Catalog',
    status: 'paused',
    eventsPerDay: 0,
    category: 'ecommerce',
  },
  {
    id: 'ai-usage',
    name: 'AI Usage Pipeline',
    description: 'AI model usage tracking — tokens, latency, cost per request',
    source: 'AI Gateway Worker',
    destination: 'D1 → Cost Dashboard',
    status: 'active',
    eventsPerDay: 800,
    category: 'ai',
  },
  {
    id: 'search-events',
    name: 'Search Analytics Pipeline',
    description: 'Search queries, click-through rates, zero-result queries',
    source: 'Search Worker + MeiliSearch',
    destination: 'D1 → Search Quality Reports',
    status: 'active',
    eventsPerDay: 1200,
    category: 'analytics',
  },
];

/* ─── Event Schema ─────────────────────────────── */

interface PipelineEvent {
  id: string;
  pipeline_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  source: string;
  timestamp: string;
}

/* ─── Handlers ─────────────────────────────────── */

function handleList(request: Request): Response {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');

  let filtered = [...PIPELINES];
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (status) filtered = filtered.filter((p) => p.status === status);

  const categories = PIPELINES.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalEventsPerDay = PIPELINES.filter((p) => p.status === 'active').reduce((sum, p) => sum + p.eventsPerDay, 0);

  return jsonResponse({
    pipelines: filtered,
    total: PIPELINES.length,
    filtered: filtered.length,
    active: PIPELINES.filter((p) => p.status === 'active').length,
    categories,
    totalEventsPerDay,
  });
}

async function handleEvents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get('pipeline') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  try {
    let query = 'SELECT * FROM pipeline_events';
    const params: string[] = [];

    if (pipelineId !== 'all') {
      query += ' WHERE pipeline_id = ?';
      params.push(pipelineId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(String(limit));

    const result = await env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      events: result.results?.map((row: any) => ({
        ...row,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      })) || [],
      total: result.results?.length || 0,
      pipeline: pipelineId,
    });
  } catch (err: any) {
    // Table may not exist yet — return empty with setup instructions
    if (err.message?.includes('no such table')) {
      return jsonResponse({
        events: [],
        total: 0,
        pipeline: pipelineId,
        setup: {
          message: 'Pipeline events table not yet created. Run the migration below.',
          migration: `CREATE TABLE IF NOT EXISTS pipeline_events (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  source TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  processed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_pipeline ON pipeline_events(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_timestamp ON pipeline_events(timestamp DESC);`,
        },
      });
    }
    return errorResponse(`Database error: ${err.message}`, 500);
  }
}

async function handleIngest(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    pipeline_id?: string;
    event_type?: string;
    payload?: Record<string, unknown>;
    source?: string;
  } | null;

  if (!body?.pipeline_id || !body?.event_type) {
    return errorResponse('Missing required fields: pipeline_id, event_type', 400);
  }

  // Validate pipeline exists
  const pipeline = PIPELINES.find((p) => p.id === body.pipeline_id);
  if (!pipeline) {
    return errorResponse(`Unknown pipeline: ${body.pipeline_id}. Valid: ${PIPELINES.map((p) => p.id).join(', ')}`, 400);
  }

  if (pipeline.status === 'paused') {
    return errorResponse(`Pipeline ${body.pipeline_id} is paused`, 409);
  }

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO pipeline_events (id, pipeline_id, event_type, payload, source, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        eventId,
        body.pipeline_id,
        body.event_type,
        JSON.stringify(body.payload || {}),
        body.source || 'api',
        timestamp
      )
      .run();

    return jsonResponse({
      success: true,
      eventId,
      pipeline: body.pipeline_id,
      timestamp,
    }, 201);
  } catch (err: any) {
    if (err.message?.includes('no such table')) {
      return errorResponse('Pipeline events table not created. GET /api/pipelines/events for migration SQL.', 500);
    }
    return errorResponse(`Ingest error: ${err.message}`, 500);
  }
}

async function handleStats(env: Env): Promise<Response> {
  const pipelineStats = PIPELINES.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    status: p.status,
    eventsPerDay: p.eventsPerDay,
  }));

  let dbStats = null;
  try {
    const countResult = await env.DB.prepare(
      `SELECT pipeline_id, COUNT(*) as count, 
              MAX(timestamp) as last_event,
              MIN(timestamp) as first_event
       FROM pipeline_events 
       GROUP BY pipeline_id`
    ).all();

    dbStats = countResult.results || [];
  } catch {
    // Table may not exist
  }

  const totalEventsPerDay = PIPELINES.filter((p) => p.status === 'active').reduce((sum, p) => sum + p.eventsPerDay, 0);

  return jsonResponse({
    pipelines: pipelineStats,
    dbStats,
    summary: {
      totalPipelines: PIPELINES.length,
      active: PIPELINES.filter((p) => p.status === 'active').length,
      paused: PIPELINES.filter((p) => p.status === 'paused').length,
      totalEventsPerDay,
      estimatedMonthly: totalEventsPerDay * 30,
    },
    dataFlow: {
      sources: [...new Set(PIPELINES.map((p) => p.source))],
      destinations: [...new Set(PIPELINES.map((p) => p.destination))],
      architecture: 'Event Source → CF Worker → D1 (events) → R2 Data Catalog (Iceberg) → R2 SQL',
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleQuery(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    pipeline_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    group_by?: 'hour' | 'day' | 'event_type' | 'source';
    limit?: number;
  } | null;

  if (!body) return errorResponse('Missing request body', 400);

  const conditions: string[] = [];
  const params: string[] = [];

  if (body.pipeline_id) {
    conditions.push('pipeline_id = ?');
    params.push(body.pipeline_id);
  }
  if (body.event_type) {
    conditions.push('event_type = ?');
    params.push(body.event_type);
  }
  if (body.start_date) {
    conditions.push('timestamp >= ?');
    params.push(body.start_date);
  }
  if (body.end_date) {
    conditions.push('timestamp <= ?');
    params.push(body.end_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(body.limit || 100, 500);

  try {
    let query: string;
    if (body.group_by === 'hour') {
      query = `SELECT strftime('%Y-%m-%d %H:00', timestamp) as period, COUNT(*) as count
               FROM pipeline_events ${where} GROUP BY period ORDER BY period DESC LIMIT ?`;
    } else if (body.group_by === 'day') {
      query = `SELECT strftime('%Y-%m-%d', timestamp) as period, COUNT(*) as count
               FROM pipeline_events ${where} GROUP BY period ORDER BY period DESC LIMIT ?`;
    } else if (body.group_by === 'event_type') {
      query = `SELECT event_type, COUNT(*) as count
               FROM pipeline_events ${where} GROUP BY event_type ORDER BY count DESC LIMIT ?`;
    } else if (body.group_by === 'source') {
      query = `SELECT source, COUNT(*) as count
               FROM pipeline_events ${where} GROUP BY source ORDER BY count DESC LIMIT ?`;
    } else {
      query = `SELECT * FROM pipeline_events ${where} ORDER BY timestamp DESC LIMIT ?`;
    }

    params.push(String(limit));
    const result = await env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      results: result.results || [],
      count: result.results?.length || 0,
      query: {
        pipeline: body.pipeline_id || 'all',
        eventType: body.event_type || 'all',
        groupBy: body.group_by || 'none',
        dateRange: { start: body.start_date, end: body.end_date },
      },
    });
  } catch (err: any) {
    if (err.message?.includes('no such table')) {
      return jsonResponse({ results: [], count: 0, setup: 'Run migration from GET /api/pipelines/events' });
    }
    return errorResponse(`Query error: ${err.message}`, 500);
  }
}

/* ─── Router ───────────────────────────────────── */

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/pipelines', '').replace(/^\/+/, '');

  switch (path) {
    case 'list':
      return handleList(context.request);
    case 'events':
      return handleEvents(context.request, context.env);
    case 'ingest':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleIngest(context.request, context.env);
    case 'stats':
      return handleStats(context.env);
    case 'query':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleQuery(context.request, context.env);
    case 'status':
      return jsonResponse({
        service: 'pipelines-api',
        status: 'operational',
        totalPipelines: PIPELINES.length,
        activePipelines: PIPELINES.filter((p) => p.status === 'active').length,
        architecture: 'LinkedOut-style: Event → Pipeline → R2 Data Catalog (Iceberg) → R2 SQL',
        features: ['list', 'events', 'ingest', 'stats', 'query'],
        timestamp: new Date().toISOString(),
      });
    default:
      return errorResponse(`Unknown endpoint: /api/pipelines/${path}`, 404);
  }
};
