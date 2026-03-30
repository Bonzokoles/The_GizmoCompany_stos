/**
 * ZENO Browser MCP Server
 * Exposes browser tools over Model Context Protocol (stdio transport)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { EventEmitter } from 'events';
import * as http from 'http';
import { URL } from 'url';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, ctx: MCPContext) => Promise<unknown>;
}

export interface MCPContext {
  browserManager?: {
    navigate: (tabId: string, url: string) => boolean;
    createTab: (url?: string) => unknown;
    closeTab: (tabId: string) => boolean;
    getTabs: () => unknown[];
    getActiveTab: () => unknown | null;
    goBack: (tabId: string) => boolean;
    goForward: (tabId: string) => boolean;
  };
  mainWindow?: Electron.BrowserWindow | null;
}

export class MCPServer extends EventEmitter {
  private server: Server;
  private tools: Map<string, MCPTool> = new Map();
  private context: MCPContext;
  private running = false;
  private httpServer: http.Server | null = null;
  private sseTransports = new Map<string, SSEServerTransport>();

  constructor(context: MCPContext) {
    super();
    this.context = context;

    this.server = new Server(
      { name: 'zeno-browser-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    this.setupHandlers();
  }

  /** Register a tool */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /** Update context (e.g. after window recreation) */
  updateContext(partial: Partial<MCPContext>): void {
    Object.assign(this.context, partial);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        return {
          content: [{ type: 'text' as const, text: `Tool "${name}" not found` }],
          isError: true,
        };
      }

      try {
        const result = await tool.handler((args ?? {}) as Record<string, unknown>, this.context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error in ${name}: ${msg}` }],
          isError: true,
        };
      }
    });
  }

  /** Start server on stdio transport */
  async start(): Promise<void> {
    if (this.running) return;
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.running = true;
    console.log('🚀 MCP Server started (stdio)');
    this.emit('started');
  }

  /** Stop server */
  async stop(): Promise<void> {
    if (!this.running) return;
    await this.server.close();
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
      this.sseTransports.clear();
    }
    this.running = false;
    console.log('⏹️ MCP Server stopped');
    this.emit('stopped');
  }

  /** Create a fresh SDK Server instance with the same tool handlers (for SSE sessions) */
  private createSDKServer(): Server {
    const sdkServer = new Server(
      { name: 'zeno-browser-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    sdkServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));

    sdkServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        return {
          content: [{ type: 'text' as const, text: `Tool "${name}" not found` }],
          isError: true,
        };
      }

      try {
        const result = await tool.handler((args ?? {}) as Record<string, unknown>, this.context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error in ${name}: ${msg}` }],
          isError: true,
        };
      }
    });

    return sdkServer;
  }

  /** Start server on HTTP/SSE transport (for VS Code MCP client) */
  async startHTTP(port: number = 3847): Promise<void> {
    if (this.httpServer) return;

    this.httpServer = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url!, `http://127.0.0.1:${port}`);

      // SSE endpoint — VS Code connects here
      if (req.method === 'GET' && url.pathname === '/sse') {
        const transport = new SSEServerTransport('/messages', res);
        this.sseTransports.set(transport.sessionId, transport);

        transport.onclose = () => {
          this.sseTransports.delete(transport.sessionId);
          console.log(`🔌 MCP SSE session closed: ${transport.sessionId}`);
        };

        const sdkServer = this.createSDKServer();
        await sdkServer.connect(transport);
        console.log(`🔗 MCP SSE session connected: ${transport.sessionId}`);
        return;
      }

      // Message endpoint — receives JSON-RPC from client
      if (req.method === 'POST' && url.pathname === '/messages') {
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing sessionId');
          return;
        }

        const transport = this.sseTransports.get(sessionId);
        if (!transport) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Session not found');
          return;
        }

        await transport.handlePostMessage(req, res);
        return;
      }

      // Health check
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', tools: this.getToolNames() }));
        return;
      }

      // Root info (friendly hint for browser/manual checks)
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'zeno-browser-mcp',
          endpoints: {
            sse: '/sse',
            messages: '/messages?sessionId=...',
            health: '/health',
          },
          toolsCount: this.getToolNames().length,
        }));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(port, '127.0.0.1', () => {
        this.running = true;
        console.log(`🌐 MCP Server HTTP/SSE on http://127.0.0.1:${port}/sse`);
        this.emit('started');
        resolve();
      });
      this.httpServer!.on('error', reject);
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Execute a tool directly (bypassing stdio transport) */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    return tool.handler(args, this.context);
  }

  /** Get tool schema by name */
  getToolSchema(name: string): { name: string; description: string; inputSchema: Record<string, unknown> } | null {
    const tool = this.tools.get(name);
    if (!tool) return null;
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }
}
