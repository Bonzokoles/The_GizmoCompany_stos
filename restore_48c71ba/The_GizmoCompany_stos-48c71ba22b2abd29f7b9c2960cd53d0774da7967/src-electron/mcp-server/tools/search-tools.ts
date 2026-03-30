/**
 * MCP Search Tools — web search, site search
 */

import type { MCPTool } from '../mcp-server';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback;
}

export function createSearchTools(): MCPTool[] {
  return [
    {
      name: 'web_search',
      description: 'Search the web (opens results in browser)',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          engine: {
            type: 'string',
            enum: ['google', 'duckduckgo', 'bing'],
            description: 'Search engine (default: google)',
          },
        },
        required: ['query'],
      },
      handler: async (input, ctx) => {
        const query = str(input.query);
        if (!query) return { error: 'query is required' };

        const engine = str(input.engine) || 'google';
        const urls: Record<string, string> = {
          google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        };

        const url = urls[engine] ?? urls.google;
        const bm = ctx.browserManager;
        if (bm) {
          const tab = bm.getActiveTab() as any;
          if (tab) {
            bm.navigate(tab.id, url);
            if (ctx.mainWindow && !ctx.mainWindow.isDestroyed()) {
              ctx.mainWindow.webContents.send('mcp:navigate', tab.id, url);
            }
          }
        }

        return { engine, query, url };
      },
    },

    {
      name: 'site_search',
      description: 'Search within a specific website using Google site: operator',
      inputSchema: {
        type: 'object',
        properties: {
          site: { type: 'string', description: 'Website domain (e.g. github.com)' },
          query: { type: 'string', description: 'Search query' },
        },
        required: ['site', 'query'],
      },
      handler: async (input, ctx) => {
        const site = str(input.site);
        const query = str(input.query);
        if (!site || !query) return { error: 'site and query required' };

        const url = `https://www.google.com/search?q=site:${encodeURIComponent(site)}+${encodeURIComponent(query)}`;

        const bm = ctx.browserManager;
        if (bm) {
          const tab = bm.getActiveTab() as any;
          if (tab) {
            bm.navigate(tab.id, url);
            if (ctx.mainWindow && !ctx.mainWindow.isDestroyed()) {
              ctx.mainWindow.webContents.send('mcp:navigate', tab.id, url);
            }
          }
        }

        return { site, query, url };
      },
    },
  ];
}
