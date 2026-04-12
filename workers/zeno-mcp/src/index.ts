/**
 * ZENO Browser — MCP Server Entry Point
 *
 * Eksponuje ZenoMCP jako Cloudflare Worker.
 * Endpointy:
 *   GET  /       — health check
 *   ALL  /mcp    — MCP StreamableHTTP + SSE (dla Claude Desktop / Cursor)
 */

import { ZenoMCPv2, ZenoMCP } from './mcp';
import type { Env } from './mcp';

// Both exported: ZenoMCP (legacy, being deleted in v2 migration) + ZenoMCPv2 (new SQLite class)
export { ZenoMCP, ZenoMCPv2 };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({
          name: 'zeno-browser-mcp',
          version: '1.0.0',
          description: 'ZENO Browser MCP Server — narzędzia dla Claude Desktop / Cursor',
          mcp_endpoint: `${url.origin}/mcp`,
          tools: [
            'zeno_project_info',
            'query_zeno_db',
            'search_knowledge_base',
            'list_api_endpoints',
            'ask_ai',
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    if (url.pathname === '/mcp') {
      return ZenoMCPv2.serve('/mcp').fetch(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
