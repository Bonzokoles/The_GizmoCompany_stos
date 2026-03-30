# 🧠 ZENO Browser - MCP Server Architecture & Search Tools

## 📋 Overview

**MCP (Model Context Protocol) Server** dla ZENO Browser będzie:
- Mostem między AI modelami (Claude, DeepSeek, GPT) a przeglądarką
- Udostępniać tools do wyszukiwania, scrapingu, automatyzacji
- Integrować ApexAgent-style browser extension
- Wspierać workflow chains i agentic automation

---

## 🏗️ Architecture

```
ZENO Browser MCP Server
│
├─ Core MCP Server (Node.js)
│  ├─ Tool Registry
│  ├─ Message Router
│  ├─ Resource Manager
│  └─ State Manager
│
├─ Search Tools
│  ├─ web_search (Bing, Google, Tavily)
│  ├─ site_search (site-specific search)
│  ├─ semantic_search (vector-based)
│  └─ local_search (browser history)
│
├─ Browser Automation
│  ├─ navigate
│  ├─ click / type / scroll
│  ├─ screenshot / pdf
│  ├─ execute_js
│  └─ extract_data
│
├─ Data Extraction
│  ├─ parse_html (Cheerio)
│  ├─ scrape (Puppeteer/Playwright)
│  ├─ extract_tables
│  └─ extract_links
│
├─ Workflow Control
│  ├─ create_workflow
│  ├─ execute_step
│  ├─ run_crawler
│  └─ compose_results
│
└─ Integration Layer
   ├─ Claude Desktop
   ├─ Cursor / Windsurf
   ├─ External LLM APIs
   └─ ZENO Browser UI
```

---

## 🛠️ Core MCP Server Implementation

````typescript
// File: src-electron/mcp-server/core/mcp-server.ts

import Anthropic from "@anthropic-ai/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  StdioServerTransport,
} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
} from "@anthropic-ai/sdk/resources/messages.mjs";
import { EventEmitter } from "events";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (input: any, context: MCPContext) => Promise<any>;
}

export interface MCPContext {
  tabId?: string;
  networkManager?: any;
  crawlerService?: any;
  workflowEngine?: any;
  browserManager?: any;
}

export class MCPServer extends EventEmitter {
  private server: Server;
  private tools: Map<string, MCPTool> = new Map();
  private context: MCPContext;

  constructor(context: MCPContext) {
    super();
    this.context = context;

    this.server = new Server({
      name: "zeno-browser-mcp",
      version: "1.0.0",
    });

    this.setupHandlers();
    this.registerDefaultTools();
  }

  /**
   * Setup MCP message handlers
   */
  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        return {
          content: [
            {
              type: "text",
              text: `Tool "${toolName}" not found`,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await tool.handler(request.params.arguments, this.context);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${toolName}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register tool
   */
  registerTool(tool: MCPTool) {
    this.tools.set(tool.name, tool);
    console.log(`📌 Registered tool: ${tool.name}`);
  }

  /**
   * Register default search & browser tools
   */
  private registerDefaultTools() {
    // Search tools
    this.registerSearchTools();
    // Browser automation
    this.registerBrowserTools();
    // Data extraction
    this.registerExtractionTools();
    // Workflow tools
    this.registerWorkflowTools();
  }

  /**
   * Register search tools
   */
  private registerSearchTools() {
    this.registerTool({
      name: "web_search",
      description: "Search the web using Bing, Google, or Tavily",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          provider: {
            type: "string",
            enum: ["bing", "google", "tavily", "auto"],
            description: "Search provider",
          },
          limit: { type: "number", description: "Max results (default: 10)" },
        },
        required: ["query"],
      },
      handler: async (input: any) => {
        // Implement web search
        return await this.executeWebSearch(input.query, input.provider || "auto", input.limit || 10);
      },
    });

    this.registerTool({
      name: "semantic_search",
      description: "Search using vector embeddings for semantic relevance",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          searchSpace: {
            type: "string",
            enum: ["web", "local", "knowledge-base"],
            description: "Where to search",
          },
          topK: { type: "number", description: "Top K results" },
        },
        required: ["query"],
      },
      handler: async (input: any) => {
        return await this.executeSemanticSearch(input.query, input.searchSpace || "web");
      },
    });

    this.registerTool({
      name: "site_search",
      description: "Search within a specific website",
      inputSchema: {
        type: "object",
        properties: {
          site: { type: "string", description: "Website domain" },
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results" },
        },
        required: ["site", "query"],
      },
      handler: async (input: any) => {
        return await this.executeSiteSearch(input.site, input.query);
      },
    });
  }

  /**
   * Register browser automation tools
   */
  private registerBrowserTools() {
    this.registerTool({
      name: "navigate",
      description: "Navigate to a URL",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to navigate" },
          tabId: { type: "string", description: "Tab ID (optional)" },
          waitForLoad: { type: "boolean", description: "Wait for page load" },
        },
        required: ["url"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.navigate(input.url, {
          tabId: input.tabId,
          waitForLoad: input.waitForLoad ?? true,
        });
      },
    });

    this.registerTool({
      name: "click",
      description: "Click an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector" },
          tabId: { type: "string", description: "Tab ID" },
        },
        required: ["selector"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.click(input.selector, input.tabId);
      },
    });

    this.registerTool({
      name: "type",
      description: "Type text into an element",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector" },
          text: { type: "string", description: "Text to type" },
          tabId: { type: "string", description: "Tab ID" },
        },
        required: ["selector", "text"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.type(input.selector, input.text, input.tabId);
      },
    });

    this.registerTool({
      name: "screenshot",
      description: "Take a screenshot of current tab",
      inputSchema: {
        type: "object",
        properties: {
          tabId: { type: "string", description: "Tab ID" },
          fullPage: { type: "boolean", description: "Full page screenshot" },
        },
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.screenshot(input.tabId, {
          fullPage: input.fullPage ?? false,
        });
      },
    });

    this.registerTool({
      name: "execute_script",
      description: "Execute JavaScript on the page",
      inputSchema: {
        type: "object",
        properties: {
          script: { type: "string", description: "JavaScript code" },
          tabId: { type: "string", description: "Tab ID" },
        },
        required: ["script"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.executeScript(input.script, input.tabId);
      },
    });
  }

  /**
   * Register data extraction tools
   */
  private registerExtractionTools() {
    this.registerTool({
      name: "extract_data",
      description: "Extract structured data from page using CSS selectors",
      inputSchema: {
        type: "object",
        properties: {
          selectors: {
            type: "object",
            description: "Map of field names to CSS selectors",
          },
          tabId: { type: "string", description: "Tab ID" },
        },
        required: ["selectors"],
      },
      handler: async (input: any, ctx) => {
        const data: any = {};
        for (const [field, selector] of Object.entries(input.selectors)) {
          data[field] = await ctx.browserManager?.extractText(selector, input.tabId);
        }
        return data;
      },
    });

    this.registerTool({
      name: "extract_table",
      description: "Extract table data from page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Table CSS selector" },
          tabId: { type: "string", description: "Tab ID" },
        },
        required: ["selector"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.extractTable(input.selector, input.tabId);
      },
    });

    this.registerTool({
      name: "extract_links",
      description: "Extract all links from page",
      inputSchema: {
        type: "object",
        properties: {
          tabId: { type: "string", description: "Tab ID" },
          filter: { type: "string", description: "Optional regex filter" },
        },
      },
      handler: async (input: any, ctx) => {
        return await ctx.browserManager?.extractLinks(input.tabId, input.filter);
      },
    });
  }

  /**
   * Register workflow tools
   */
  private registerWorkflowTools() {
    this.registerTool({
      name: "start_workflow",
      description: "Start a workflow chain",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: { type: "string", description: "Workflow ID" },
          input: { type: "object", description: "Input data" },
        },
        required: ["workflowId"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.workflowEngine?.executeWorkflow(input.workflowId, input.input);
      },
    });

    this.registerTool({
      name: "crawl",
      description: "Start a web crawler with configuration",
      inputSchema: {
        type: "object",
        properties: {
          startUrl: { type: "string", description: "Starting URL" },
          maxPages: { type: "number", description: "Max pages to crawl" },
          selector: { type: "string", description: "Data selector" },
          followLinks: { type: "boolean", description: "Follow links" },
        },
        required: ["startUrl"],
      },
      handler: async (input: any, ctx) => {
        return await ctx.crawlerService?.startCrawl({
          startUrls: [input.startUrl],
          maxPages: input.maxPages || 10,
          dataSelector: input.selector,
          followLinks: input.followLinks ?? true,
        });
      },
    });

    this.registerTool({
      name: "wait",
      description: "Wait for specified duration",
      inputSchema: {
        type: "object",
        properties: {
          duration: { type: "number", description: "Duration in milliseconds" },
        },
        required: ["duration"],
      },
      handler: async (input: any) => {
        await new Promise(resolve => setTimeout(resolve, input.duration));
        return { waited: input.duration };
      },
    });
  }

  /**
   * Execute web search
   */
  private async executeWebSearch(query: string, provider: string, limit: number) {
    // Implementation with Bing/Google/Tavily
    console.log(`🔍 Searching: ${query} (${provider})`);
    // Return mock results for now
    return [
      { title: "Result 1", url: "https://example.com", snippet: "Sample result" },
      { title: "Result 2", url: "https://example.com", snippet: "Another result" },
    ];
  }

  /**
   * Execute semantic search
   */
  private async executeSemanticSearch(query: string, searchSpace: string) {
    console.log(`🧠 Semantic search: ${query} in ${searchSpace}`);
    return { results: [], embeddings: [] };
  }

  /**
   * Execute site search
   */
  private async executeSiteSearch(site: string, query: string) {
    console.log(`🔎 Site search: ${query} on ${site}`);
    return { site, query, results: [] };
  }

  /**
   * Start MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("🚀 MCP Server started and listening for connections");
  }
}