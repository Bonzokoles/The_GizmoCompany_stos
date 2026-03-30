/**
 * MCP Terminal Tools — execute shell commands for network diagnostics
 * Security: only whitelisted commands allowed, no arbitrary execution
 */

import type { MCPTool } from '../mcp-server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Whitelisted commands — only safe, read-only network diagnostics */
const ALLOWED_COMMANDS: Record<string, { cmd: string; defaultArgs: string[] }> = {
  ping: { cmd: 'ping', defaultArgs: ['-n', '4'] },
  tracert: { cmd: 'tracert', defaultArgs: ['-d'] },
  nslookup: { cmd: 'nslookup', defaultArgs: [] },
  ipconfig: { cmd: 'ipconfig', defaultArgs: ['/all'] },
  netstat: { cmd: 'netstat', defaultArgs: ['-an'] },
  arp: { cmd: 'arp', defaultArgs: ['-a'] },
  route: { cmd: 'route', defaultArgs: ['print'] },
  curl: { cmd: 'curl', defaultArgs: ['-sS', '-o', 'NUL', '-w', '%{http_code} %{time_total}s %{size_download}B'] },
  whoami: { cmd: 'whoami', defaultArgs: [] },
  hostname: { cmd: 'hostname', defaultArgs: [] },
  systeminfo: { cmd: 'systeminfo', defaultArgs: [] },
};

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 64 * 1024; // 64KB

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function createTerminalTools(): MCPTool[] {
  return [
    {
      name: 'terminal_execute',
      description: `Execute a whitelisted network/system command. Allowed: ${Object.keys(ALLOWED_COMMANDS).join(', ')}`,
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: `Command name: ${Object.keys(ALLOWED_COMMANDS).join(', ')}`,
            enum: Object.keys(ALLOWED_COMMANDS),
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional arguments (e.g. hostname for ping)',
          },
        },
        required: ['command'],
      },
      handler: async (input) => {
        const cmdName = str(input.command).toLowerCase();
        const spec = ALLOWED_COMMANDS[cmdName];
        if (!spec) {
          return { error: `Command "${cmdName}" not allowed. Use: ${Object.keys(ALLOWED_COMMANDS).join(', ')}` };
        }

        const userArgs = Array.isArray(input.args)
          ? (input.args as unknown[]).map(a => String(a))
          : [];

        // Validate args — no shell metacharacters
        for (const arg of userArgs) {
          if (/[;&|`$(){}><\r\n]/.test(arg)) {
            return { error: `Invalid characters in argument: "${arg}"` };
          }
        }

        const finalArgs = [...spec.defaultArgs, ...userArgs];

        try {
          const { stdout, stderr } = await execFileAsync(spec.cmd, finalArgs, {
            timeout: TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT,
            windowsHide: true,
          });

          return {
            command: cmdName,
            args: finalArgs,
            stdout: stdout.trim(),
            stderr: stderr.trim() || undefined,
          };
        } catch (error: any) {
          return {
            command: cmdName,
            args: finalArgs,
            error: error.message,
            stdout: error.stdout?.trim() || undefined,
            stderr: error.stderr?.trim() || undefined,
            exitCode: error.code,
          };
        }
      },
    },

    {
      name: 'terminal_ping',
      description: 'Ping a host and return statistics',
      inputSchema: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hostname or IP to ping' },
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
          type: { type: 'string', description: 'Record type: A, AAAA, MX, NS, TXT, CNAME, SOA', enum: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'] },
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

    {
      name: 'terminal_traceroute',
      description: 'Trace route to a host',
      inputSchema: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hostname or IP to trace' },
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
