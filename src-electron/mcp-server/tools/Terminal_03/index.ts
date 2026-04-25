/**
 * Terminal_03 — Route & Path Tools
 * Provides: terminal_traceroute
 * Calling method: createRouteTools()
 */

import type { MCPTool } from '../../mcp-server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Calling method for Terminal_03 — traceroute and route tools */
export function createRouteTools(): MCPTool[] {
  return [
    {
      name: 'terminal_traceroute',
      description: 'Trace route to a host',
      inputSchema: {
        type: 'object',
        properties: {
          host:    { type: 'string', description: 'Hostname or IP to trace' },
          maxHops: { type: 'number', description: 'Max hops (default: 30)' },
        },
        required: ['host'],
      },
      handler: async (input) => {
        const host = str(input.host);
        if (!host || /[;&|`$(){}><\r\n]/.test(host)) {
          return { error: 'Invalid host' };
        }
        const maxHops = Math.min(Math.max(Number(input.maxHops) || 30, 1), 64);

        try {
          const { stdout } = await execFileAsync('tracert', ['-d', '-h', String(maxHops), host], {
            timeout: 60_000,
            windowsHide: true,
          });
          return { host, maxHops, result: stdout.trim() };
        } catch (error: any) {
          return { host, error: error.message, stdout: error.stdout?.trim() };
        }
      },
    },
  ];
}
