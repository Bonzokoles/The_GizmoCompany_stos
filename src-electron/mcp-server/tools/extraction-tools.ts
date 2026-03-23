/**
 * MCP Extraction Tools — extract data, tables, links from pages
 */

import type { MCPTool, MCPContext } from '../mcp-server';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Run JS in the active tab's webContents and return result.
 *  Uses mainWindow.webContents to run wrapper code in the React renderer
 *  which then calls webview.executeJavaScript() inside the loaded page.
 */
async function runInActiveTab(ctx: MCPContext, code: string): Promise<unknown> {
  const win = ctx.mainWindow;
  if (!win || win.isDestroyed()) throw new Error('Main window not available');

  // Escape the user script for embedding in a string literal
  const escaped = JSON.stringify(code);

  // Run inside the renderer — the renderer has access to the <webview> DOM element
  const wrapperCode = `
    (async () => {
      const wv = document.querySelector('webview');
      if (!wv) return JSON.stringify({ __error: 'No webview found in renderer' });
      try {
        const result = await wv.executeJavaScript(${escaped});
        return JSON.stringify({ __result: result });
      } catch (e) {
        return JSON.stringify({ __error: e && e.message ? e.message : String(e) });
      }
    })()
  `;

  const jsonStr = await win.webContents.executeJavaScript(wrapperCode) as string;
  let parsed: { __result?: unknown; __error?: string };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse script result: ' + jsonStr);
  }
  if (parsed.__error) throw new Error(parsed.__error);
  return parsed.__result;
}

export function createExtractionTools(): MCPTool[] {
  return [
    {
      name: 'extract_links',
      description: 'Extract all links from the current page',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector scope (default: body)',
          },
        },
      },
      handler: async (input, ctx) => {
        const sel = str(input.selector) || 'body';
        const js = `
          (() => {
            const scope = document.querySelector(${JSON.stringify(sel)}) || document.body;
            return Array.from(scope.querySelectorAll('a[href]')).map(a => ({
              text: a.textContent?.trim().slice(0, 200) || '',
              href: a.href,
            }));
          })()
        `;
        const links = await runInActiveTab(ctx, js);
        return { links };
      },
    },

    {
      name: 'extract_text',
      description: 'Extract text content from the current page',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector (default: body)',
          },
          maxLength: {
            type: 'number',
            description: 'Max characters to return (default: 5000)',
          },
        },
      },
      handler: async (input, ctx) => {
        const sel = str(input.selector) || 'body';
        const max = typeof input.maxLength === 'number' ? input.maxLength : 5000;
        const js = `
          (() => {
            const el = document.querySelector(${JSON.stringify(sel)});
            if (!el) return '';
            return (el.innerText || el.textContent || '').slice(0, ${max});
          })()
        `;
        const text = await runInActiveTab(ctx, js);
        return { text };
      },
    },

    {
      name: 'extract_table',
      description: 'Extract an HTML table as JSON rows',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for <table> (default: table)',
          },
        },
      },
      handler: async (input, ctx) => {
        const sel = str(input.selector) || 'table';
        const js = `
          (() => {
            const tbl = document.querySelector(${JSON.stringify(sel)});
            if (!tbl) return [];
            const rows = Array.from(tbl.querySelectorAll('tr'));
            const hdrs = Array.from(rows[0]?.querySelectorAll('th,td') || []).map(c => c.textContent?.trim() || '');
            return rows.slice(1).map(tr => {
              const cells = Array.from(tr.querySelectorAll('td')).map(c => c.textContent?.trim() || '');
              const obj = {};
              hdrs.forEach((h, i) => { obj[h || 'col' + i] = cells[i] || ''; });
              return obj;
            });
          })()
        `;
        const rows = await runInActiveTab(ctx, js);
        return { rows };
      },
    },

    {
      name: 'extract_metadata',
      description: 'Extract page title, description, og tags and other metadata',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (_input, ctx) => {
        const js = `
          (() => {
            const meta = {};
            meta.title = document.title;
            meta.url = location.href;
            const desc = document.querySelector('meta[name="description"]');
            meta.description = desc ? desc.getAttribute('content') : '';
            const metas = Array.from(document.querySelectorAll('meta[property^="og:"]'));
            meta.og = {};
            metas.forEach(m => {
              meta.og[m.getAttribute('property')] = m.getAttribute('content');
            });
            return meta;
          })()
        `;
        const metadata = await runInActiveTab(ctx, js);
        return { metadata };
      },
    },
  ];
}
