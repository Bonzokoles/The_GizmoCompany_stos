/**
 * MCP Workflow Tools — wait, page interaction helpers
 */

import type { MCPTool, MCPContext } from '../mcp-server';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback;
}

async function runInActiveTab(ctx: MCPContext, code: string): Promise<unknown> {
  const win = ctx.mainWindow;
  if (!win || win.isDestroyed()) throw new Error('Main window not available');

  const escaped = JSON.stringify(code);
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

export function createWorkflowTools(): MCPTool[] {
  return [
    {
      name: 'wait',
      description: 'Wait for a specified number of milliseconds',
      inputSchema: {
        type: 'object',
        properties: {
          ms: { type: 'number', description: 'Milliseconds to wait (max 30000)' },
        },
        required: ['ms'],
      },
      handler: async (input) => {
        const ms = Math.min(Math.max(num(input.ms, 1000), 0), 30_000);
        await new Promise((r) => setTimeout(r, ms));
        return { waited: ms };
      },
    },

    {
      name: 'click_element',
      description: 'Click an element on the current page by CSS selector',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of element to click' },
        },
        required: ['selector'],
      },
      handler: async (input, ctx) => {
        const sel = str(input.selector);
        if (!sel) return { error: 'selector required' };
        const js = `
          (() => {
            const el = document.querySelector(${JSON.stringify(sel)});
            if (!el) return { clicked: false, reason: 'element not found' };
            el.click();
            return { clicked: true, tag: el.tagName };
          })()
        `;
        return runInActiveTab(ctx, js);
      },
    },

    {
      name: 'type_text',
      description: 'Type text into an input/textarea by CSS selector',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of input element' },
          text: { type: 'string', description: 'Text to type' },
          clear: { type: 'boolean', description: 'Clear existing value first (default: true)' },
        },
        required: ['selector', 'text'],
      },
      handler: async (input, ctx) => {
        const sel = str(input.selector);
        const text = str(input.text);
        const clear = input.clear !== false;
        if (!sel) return { error: 'selector required' };
        const js = `
          (() => {
            const el = document.querySelector(${JSON.stringify(sel)});
            if (!el) return { typed: false, reason: 'element not found' };
            if (${clear}) el.value = '';
            el.value += ${JSON.stringify(text)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { typed: true };
          })()
        `;
        return runInActiveTab(ctx, js);
      },
    },

    {
      name: 'execute_script',
      description: 'Execute arbitrary JavaScript in the current page and return the result',
      inputSchema: {
        type: 'object',
        properties: {
          script: { type: 'string', description: 'JavaScript code to execute' },
        },
        required: ['script'],
      },
      handler: async (input, ctx) => {
        const script = str(input.script);
        if (!script) return { error: 'script required' };
        const result = await runInActiveTab(ctx, script);
        return { result };
      },
    },
  ];
}
