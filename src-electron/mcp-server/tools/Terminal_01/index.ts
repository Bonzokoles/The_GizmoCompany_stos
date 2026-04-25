/**
 * Terminal_01 — General Command Executor
 * Provides: terminal_execute
 * Calling method: createExecuteTools()
 */

import type { MCPTool } from '../../mcp-server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Whitelisted commands — only safe, read-only network/system diagnostics */
const ALLOWED_COMMANDS: Record<string, { cmd: string; defaultArgs: string[] }> = {
  ping:       { cmd: 'ping',       defaultArgs: ['-n', '4'] },
  tracert:    { cmd: 'tracert',    defaultArgs: ['-d'] },
  nslookup:   { cmd: 'nslookup',   defaultArgs: [] },
  ipconfig:   { cmd: 'ipconfig',   defaultArgs: ['/all'] },
  netstat:    { cmd: 'netstat',    defaultArgs: ['-an'] },
  arp:        { cmd: 'arp',        defaultArgs: ['-a'] },
  route:      { cmd: 'route',      defaultArgs: ['print'] },
  curl:       { cmd: 'curl',       defaultArgs: ['-sS', '-o', 'NUL', '-w', '%{http_code} %{time_total}s %{size_download}B'] },
  whoami:     { cmd: 'whoami',     defaultArgs: [] },
  hostname:   { cmd: 'hostname',   defaultArgs: [] },
  systeminfo: { cmd: 'systeminfo', defaultArgs: [] },
};

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT  = 64 * 1024; // 64 KB

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Calling method for Terminal_01 — general whitelisted command executor */
export function createExecuteTools(): MCPTool[] {
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
  ];
}
