import { execSync } from 'child_process';
import { resolve } from 'path';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

const SAFE_ROOT = resolve(process.cwd());

function resolveRepoPath(repoPath: unknown): string {
    if (typeof repoPath !== 'string' || !repoPath.trim()) {
        throw new Error('repoPath is required');
    }
    const normalized = repoPath.replace(/\\/g, '/');
    if (normalized.includes('../') || normalized.includes('..\\')) {
        throw new Error('Path traversal is not allowed');
    }
    const absolute = resolve(SAFE_ROOT, repoPath);
    if (!absolute.startsWith(SAFE_ROOT)) {
        throw new Error('repoPath outside safe workdir');
    }
    return absolute;
}

function runGit(repoPath: string, command: string): string {
    return execSync(`git -C ${JSON.stringify(repoPath)} ${command}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

const gitStatus: ToolHandler = async (args): Promise<ToolResult<{ output: string }>> => {
    try {
        const repoPath = resolveRepoPath(args.repoPath);
        const output = runGit(repoPath, 'status --short');
        return { ok: true, data: { output } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const gitLog: ToolHandler = async (args): Promise<ToolResult<{ output: string }>> => {
    try {
        const repoPath = resolveRepoPath(args.repoPath);
        const limitRaw = typeof args.limit === 'number' ? args.limit : Number(args.limit ?? 10);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 10;
        const output = runGit(repoPath, `log --oneline -n ${limit}`);
        return { ok: true, data: { output } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const gitDiff: ToolHandler = async (args): Promise<ToolResult<{ output: string }>> => {
    try {
        const repoPath = resolveRepoPath(args.repoPath);
        const file = typeof args.file === 'string' && args.file.trim() ? ` -- ${JSON.stringify(args.file)}` : '';
        const output = runGit(repoPath, `diff HEAD${file}`);
        return { ok: true, data: { output } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const gitToolDefinitions: ToolDefinition[] = [
    {
        name: 'git_status',
        description: 'Run git status --short in repoPath',
        parameters: {
            repoPath: { type: 'string', description: 'Repository path', required: true },
        },
    },
    {
        name: 'git_log',
        description: 'Get latest N git commits (oneline)',
        parameters: {
            repoPath: { type: 'string', description: 'Repository path', required: true },
            limit: { type: 'number', description: 'Maximum number of commits' },
        },
    },
    {
        name: 'git_diff',
        description: 'Show git diff against HEAD',
        parameters: {
            repoPath: { type: 'string', description: 'Repository path', required: true },
            file: { type: 'string', description: 'Optional file path to diff' },
        },
    },
];

export const gitToolHandlers: Record<string, ToolHandler> = {
    git_status: gitStatus,
    git_log: gitLog,
    git_diff: gitDiff,
};