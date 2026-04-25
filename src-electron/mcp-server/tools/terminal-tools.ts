/**
 * MCP Terminal Tools -- aggregator
 * Delegates to three focused sub-modules:
 *   Terminal_01 -- createExecuteTools()  -> terminal_execute
 *   Terminal_02 -- createNetworkTools()  -> terminal_ping, terminal_dns_lookup
 *   Terminal_03 -- createRouteTools()    -> terminal_traceroute
 */

import type { MCPTool } from '../mcp-server';
import { createExecuteTools } from './Terminal_01';
import { createNetworkTools } from './Terminal_02';
import { createRouteTools }   from './Terminal_03';

export { createExecuteTools, createNetworkTools, createRouteTools };

/** Combined calling method -- preserves the original public API */
export function createTerminalTools(): MCPTool[] {
  return [
    ...createExecuteTools(),
    ...createNetworkTools(),
    ...createRouteTools(),
  ];
}
