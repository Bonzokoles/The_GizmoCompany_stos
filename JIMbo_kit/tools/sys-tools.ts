import os from 'os';
import { execSync } from 'child_process';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

const BLOCKED_PATTERNS = ['_SECRET', '_TOKEN', '_KEY'];
const ENV_ALLOWLIST = new Set([
    'PATH',
    'TEMP',
    'TMP',
    'NODE_ENV',
    'JIMBO_PORT',
    'JIMBO_MODEL',
    'JIMBO_TOOL_MODEL',
    'SEARXNG_URL',
    'BUCH_URL',
    'JIMBO_GATEWAY_URL',
    'USERPROFILE',
    'HOMEPATH',
    'SYSTEMROOT',
]);

const sysGetEnv: ToolHandler = async (args): Promise<ToolResult<{ key: string; value: string | null }>> => {
    try {
        const key = typeof args.key === 'string' ? args.key : '';
        if (!key) {
            return { ok: false, error: 'key is required' };
        }

        const normalizedKey = key.toUpperCase();
        const blocked = BLOCKED_PATTERNS.some((pattern) => normalizedKey.includes(pattern));
        if (blocked && !ENV_ALLOWLIST.has(normalizedKey)) {
            return { ok: false, error: 'Access denied' };
        }

        return {
            ok: true,
            data: { key, value: process.env[key] ?? null },
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const sysPlatformInfo: ToolHandler = async (): Promise<ToolResult<{ platform: string; release: string; uptime: number }>> => {
    try {
        return {
            ok: true,
            data: {
                platform: process.platform,
                release: os.release(),
                uptime: os.uptime(),
            },
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const sysProcessList: ToolHandler = async (): Promise<ToolResult<{ output: string }>> => {
    try {
        const command = process.platform === 'win32' ? 'tasklist' : 'ps aux';
        const output = execSync(command, {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { ok: true, data: { output } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const sysToolDefinitions: ToolDefinition[] = [
    {
        name: 'sys_get_env',
        description: 'Get environment variable (with secret filtering)',
        parameters: {
            key: { type: 'string', description: 'Environment variable name', required: true },
        },
    },
    {
        name: 'sys_platform_info',
        description: 'Get platform, OS release and uptime',
        parameters: {},
    },
    {
        name: 'sys_process_list',
        description: 'List running processes (tasklist / ps aux)',
        parameters: {},
    },
];

export const sysToolHandlers: Record<string, ToolHandler> = {
    sys_get_env: sysGetEnv,
    sys_platform_info: sysPlatformInfo,
    sys_process_list: sysProcessList,
};