/**
 * MCP Browser Tools — navigate, tabs, back/forward, screenshot
 */

import type { MCPTool } from '../mcp-server';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function createBrowserTools(): MCPTool[] {
  return [
    {
      name: 'browser_navigate',
      description: 'Navigate the active tab to a URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to' },
          tabId: { type: 'string', description: 'Tab ID (optional, uses active)' },
        },
        required: ['url'],
      },
      handler: async (input, ctx) => {
        const url = str(input.url);
        if (!url) return { error: 'url is required' };

        const bm = ctx.browserManager;
        if (!bm) return { error: 'BrowserManager not available' };

        const tabId = str(input.tabId) || (bm.getActiveTab() as { id?: string })?.id;
        if (!tabId) return { error: 'No active tab' };

        const ok = bm.navigate(tabId, url);
        // Also tell the renderer to load the URL
        if (ok && ctx.mainWindow && !ctx.mainWindow.isDestroyed()) {
          ctx.mainWindow.webContents.send('mcp:navigate', tabId, url);
        }
        return { success: ok, tabId, url };
      },
    },

    {
      name: 'browser_new_tab',
      description: 'Create a new browser tab',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Initial URL (default: about:blank)' },
        },
      },
      handler: async (input, ctx) => {
        const bm = ctx.browserManager;
        if (!bm) return { error: 'BrowserManager not available' };
        const tab = bm.createTab(str(input.url) || undefined);
        return { tab };
      },
    },

    {
      name: 'browser_close_tab',
      description: 'Close a tab by ID',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'string', description: 'Tab ID to close' },
        },
        required: ['tabId'],
      },
      handler: async (input, ctx) => {
        const bm = ctx.browserManager;
        if (!bm) return { error: 'BrowserManager not available' };
        return { closed: bm.closeTab(str(input.tabId)) };
      },
    },

    {
      name: 'browser_get_tabs',
      description: 'List all open tabs',
      inputSchema: { type: 'object', properties: {} },
      handler: async (_input, ctx) => {
        const bm = ctx.browserManager;
        if (!bm) return { error: 'BrowserManager not available' };
        return { tabs: bm.getTabs() };
      },
    },

    {
      name: 'browser_go_back',
      description: 'Navigate back in the active tab',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'string', description: 'Tab ID' },
        },
      },
      handler: async (input, ctx) => {
        const bm = ctx.browserManager;
        if (!bm) return { error: 'BrowserManager not available' };
        const tabId = str(input.tabId) || (bm.getActiveTab() as { id?: string })?.id;
        if (!tabId) return { error: 'No active tab' };
        return { success: bm.goBack(tabId) };
      },
    },

    {
      name: 'browser_go_forward',
      description: 'Navigate forward in the active tab',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'string', description: 'Tab ID' },
        },
      },
      handler: async (input, ctx) => {
        const bm = ctx.browserManager;
        if (!bm) return { error: 'BrowserManager not available' };
        const tabId = str(input.tabId) || (bm.getActiveTab() as { id?: string })?.id;
        if (!tabId) return { error: 'No active tab' };
        return { success: bm.goForward(tabId) };
      },
    },

    {
      name: 'browser_screenshot',
      description: 'Take a screenshot of the main window',
      inputSchema: { type: 'object', properties: {} },
      handler: async (_input, ctx) => {
        const win = ctx.mainWindow;
        if (!win || win.isDestroyed()) return { error: 'No window' };
        const image = await win.webContents.capturePage();
        return { dataUrl: image.toDataURL() };
      },
    },
  ];
}
