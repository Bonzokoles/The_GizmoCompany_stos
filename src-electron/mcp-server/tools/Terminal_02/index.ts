/**
 * Terminal_02 — Network Host Tools
 * Provides: terminal_ping, terminal_dns_lookup
 * Calling method: createNetworkTools()
 */

import type { MCPTool } from '../../mcp-server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 30_000;

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Calling method for Terminal_02 — ping and DNS lookup tools */
export function createNetworkTools(): MCPTool[] {
  return [
    {
      name: 'terminal_ping',
      description: 'Ping a host and return statistics',
      inputSchema: {
        type: 'object',
        properties: {
          host:  { type: 'string', description: 'Hostname or IP to ping' },
          count: { type: 'number', description: 'Number of pings (default: 4, max: 20)' },
        },
        required: ['host'],
      },
      handler: async (input) => {
        const host = str(input.host);
        if (!host || /[;&|`$(){}><\r\n]/.test(host)) {
          return { error: 'Invalid host' };
        }
        const count = Math.min(Math.max(Number(input.count) || 4, 1), 20);

        try {
          const { stdout } = await execFileAsync('ping', ['-n', String(count), host], {
            timeout: TIMEOUT_MS,
            windowsHide: true,
          });
          return { host, count, result: stdout.trim() };
        } catch (error: any) {
          return { host, error: error.message, stdout: error.stdout?.trim() };
        }
      },
    },

    {
      name: 'terminal_dns_lookup',
      description: 'Perform DNS lookup for a hostname',
      inputSchema: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hostname to resolve' },
          type: {
            type: 'string',
            description: 'Record type: A, AAAA, MX, NS, TXT, CNAME, SOA',
            enum: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'],
          },
        },
        required: ['host'],
      },
      handler: async (input) => {
        const host = str(input.host);
        if (!host || /[;&|`$(){}><\r\n]/.test(host)) {
          return { error: 'Invalid host' };
        }

        const args = [host];
        const recordType = str(input.type).toUpperCase();
        if (recordType) args.push('-type=' + recordType);

        try {
          const { stdout } = await execFileAsync('nslookup', args, {
            timeout: TIMEOUT_MS,
            windowsHide: true,
          });
          return { host, type: recordType || 'A', result: stdout.trim() };
        } catch (error: any) {
          return { host, error: error.message, stdout: error.stdout?.trim() };
        }
      },
    },
  ];
}
