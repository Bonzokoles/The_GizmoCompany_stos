/**
 * MCP Server — barrel export, assembles server + all tool categories
 */

export { MCPServer } from './mcp-server';
export type { MCPTool, MCPContext } from './mcp-server';

import { MCPServer, MCPContext } from './mcp-server';
import { createBrowserTools } from './tools/browser-tools';
import { createSearchTools } from './tools/search-tools';
import { createExtractionTools } from './tools/extraction-tools';
import { createWorkflowTools } from './tools/workflow-tools';
import { createAITools } from './tools/ai-tools';
import { createTerminalTools } from './tools/terminal-tools';
import { createNetworkTools } from './tools/network-tools';
import { createDatabaseTools } from './tools/database-tools';

/**
 * Create a fully-configured MCP server with all tool categories registered.
 */
export function createMCPServer(context: MCPContext): MCPServer {
  const server = new MCPServer(context);

  const allTools = [
    ...createBrowserTools(),
    ...createSearchTools(),
    ...createExtractionTools(),
    ...createWorkflowTools(),
    ...createAITools(),
    ...createTerminalTools(),
    ...createNetworkTools(),
    ...createDatabaseTools(),
  ];

  for (const tool of allTools) {
    server.registerTool(tool);
  }

  console.log(`📦 MCP Server: ${allTools.length} tools registered — ${server.getToolNames().join(', ')}`);
  return server;
}
