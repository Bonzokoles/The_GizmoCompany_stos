/**
 * ZENO Browser — Browser Rendering / Browser Run API
 * Supports both Cloudflare Workers Browser Binding (env.BROWSER.quickAction)
 * and Cloudflare Browser Rendering REST API fallback.
 */
import type { Env } from '../../types';

/* ─── Helpers ─────────────────────────────────────── */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

const CF_BASE = 'https://api.cloudflare.com/client/v4/accounts';

async function cfRender(accountId: string, token: string, endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${CF_BASE}/${accountId}/browser-rendering/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function dispatchBrowserAction(
  env: Env,
  endpoint: string,
  body: Record<string, unknown>
): Promise<Response> {
  const browser = env.BROWSER;
  if (browser?.quickAction) {
    try {
      const qRes = await browser.quickAction(endpoint, body);
      if (qRes) return qRes;
    } catch (e: any) {
      console.warn(`env.BROWSER quickAction fallback to REST: ${e?.message}`);
    }
  }

  const accountId = (env as any).CF_ACCOUNT_ID || '7f490d58a478c6baccb0ae01ea1d87c3';
  const token = (env as any).CF_API_TOKEN || (env as any).CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    return new Response(
      JSON.stringify({
        error: "Cloudflare Browser Run requires either env.BROWSER binding or CF_ACCOUNT_ID and CF_API_TOKEN with 'Browser Rendering - Edit' permission.",
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }

  return cfRender(accountId, token, endpoint, body);
}

/* ─── Route Handler ───────────────────────────────── */

export const onRequest: PagesFunction<Env> = async (ctx) => {
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(ctx.request.url);
  const path = url.pathname.replace('/api/render', '').replace(/^\/+/, '');

  // GET endpoints
  if (ctx.request.method === 'GET') {
    if (path === 'status' || path === '') {
      return json({
        service: 'Browser Run / Browser Rendering',
        status: 'online',
        endpoints: ['screenshot', 'pdf', 'scrape', 'markdown', 'json'],
        engine: ctx.env.BROWSER ? 'Cloudflare Workers Browser Binding' : 'Cloudflare Browser Rendering REST API',
      });
    }
    return err('Use POST for rendering endpoints', 405);
  }

  // POST endpoints
  if (ctx.request.method !== 'POST') {
    return err('Method not allowed', 405);
  }

  let body: any;
  try {
    body = await ctx.request.json();
  } catch {
    return err('Invalid JSON body');
  }

  const targetUrl = body.url?.trim();

  switch (path) {
    /* ── Screenshot ──────────────────────────────── */
    case 'screenshot': {
      if (!targetUrl) return err('url is required');
      const res = await dispatchBrowserAction(ctx.env, 'screenshot', {
        url: targetUrl,
        viewport: body.viewport || { width: 1280, height: 720 },
        gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
      });
      if (!res.ok) {
        const errText = await res.text();
        return err(`Screenshot failed: ${errText}`, res.status);
      }
      const buf = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return json({
        success: true,
        url: targetUrl,
        format: 'png',
        size: buf.byteLength,
        image: `data:image/png;base64,${base64}`,
      });
    }

    /* ── PDF ─────────────────────────────────────── */
    case 'pdf': {
      if (!targetUrl) return err('url is required');
      const res = await dispatchBrowserAction(ctx.env, 'pdf', {
        url: targetUrl,
        pdfOptions: body.pdfOptions || { format: 'a4', printBackground: true },
        gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
      });
      if (!res.ok) {
        const errText = await res.text();
        return err(`PDF generation failed: ${errText}`, res.status);
      }
      const buf = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return json({
        success: true,
        url: targetUrl,
        format: 'pdf',
        size: buf.byteLength,
        data: `data:application/pdf;base64,${base64}`,
      });
    }

    /* ── Scrape ──────────────────────────────────── */
    case 'scrape': {
      if (!targetUrl) return err('url is required');
      const selectors = body.selectors || ['h1', 'h2', 'p', 'a'];
      const elements = selectors.map((s: string) => ({ selector: s }));
      const res = await dispatchBrowserAction(ctx.env, 'scrape', {
        url: targetUrl,
        elements,
        gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
      });
      if (!res.ok) {
        const errText = await res.text();
        return err(`Scrape failed: ${errText}`, res.status);
      }
      const data = (await res.json()) as any;
      return json({
        success: true,
        url: targetUrl,
        selectors,
        result: data.result || data,
      });
    }

    /* ── Markdown ────────────────────────────────── */
    case 'markdown': {
      if (!targetUrl && !body.html) return err('url or html is required');
      const reqBody: Record<string, unknown> = {};
      if (targetUrl) reqBody.url = targetUrl;
      if (body.html) reqBody.html = body.html;
      reqBody.gotoOptions = { waitUntil: 'networkidle0', timeout: 30000 };

      const res = await dispatchBrowserAction(ctx.env, 'markdown', reqBody);
      if (!res.ok) {
        const errText = await res.text();
        return err(`Markdown conversion failed: ${errText}`, res.status);
      }
      const data = (await res.json()) as any;
      return json({
        success: true,
        url: targetUrl || '(html input)',
        markdown: data.result || data.markdown || data,
      });
    }

    /* ── JSON (AI extraction) ───────────────────── */
    case 'json': {
      if (!targetUrl) return err('url is required');
      if (!body.prompt) return err('prompt is required for AI extraction');
      const reqBody: Record<string, unknown> = {
        url: targetUrl,
        prompt: body.prompt,
        gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
      };
      if (body.response_format) {
        reqBody.response_format = body.response_format;
      } else {
        reqBody.response_format = {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'string' },
                  },
                },
              },
            },
          },
        };
      }
      const res = await dispatchBrowserAction(ctx.env, 'json', reqBody);
      if (!res.ok) {
        const errText = await res.text();
        return err(`AI JSON extraction failed: ${errText}`, res.status);
      }
      const data = (await res.json()) as any;
      return json({
        success: true,
        url: targetUrl,
        prompt: body.prompt,
        result: data.result || data,
      });
    }

    default:
      return err(
        `Unknown endpoint: ${path}. Available: screenshot, pdf, scrape, markdown, json`,
        404
      );
  }
};
