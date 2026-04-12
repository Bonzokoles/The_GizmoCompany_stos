import { existsSync, lstatSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

const SAFE_ROOT = resolve(process.cwd());

function resolveSafePath(inputPath: unknown): string {
    if (typeof inputPath !== 'string' || !inputPath.trim()) {
        throw new Error('Invalid path');
    }

    const normalized = inputPath.replace(/\\/g, '/');
    if (normalized.includes('../') || normalized.includes('..\\')) {
        throw new Error('Path traversal is not allowed');
    }

    const absolute = resolve(SAFE_ROOT, inputPath);
    if (!absolute.startsWith(SAFE_ROOT)) {
        throw new Error('Path is outside safe workdir');
    }

    return absolute;
}

const fsReadFile: ToolHandler = async (args): Promise<ToolResult<string>> => {
    try {
        const filePath = resolveSafePath(args.path);
        if (!existsSync(filePath)) {
            return { ok: false, error: 'File does not exist' };
        }
        return { ok: true, data: readFileSync(filePath, 'utf-8') };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const fsWriteFile: ToolHandler = async (args): Promise<ToolResult<{ path: string }>> => {
    try {
        const filePath = resolveSafePath(args.path);
        if (typeof args.content !== 'string') {
            return { ok: false, error: 'content must be a string' };
        }
        const parentDir = dirname(filePath);
        if (!existsSync(parentDir)) {
            return { ok: false, error: 'Parent directory does not exist' };
        }
        writeFileSync(filePath, args.content, 'utf-8');
        return { ok: true, data: { path: filePath } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const fsListDir: ToolHandler = async (args): Promise<ToolResult<Array<{ name: string; type: string }>>> => {
    try {
        const dirPath = resolveSafePath(args.path);
        if (!existsSync(dirPath)) {
            return { ok: false, error: 'Directory does not exist' };
        }

        const entries = readdirSync(dirPath).map((name) => {
            const fullPath = resolve(dirPath, name);
            const st = lstatSync(fullPath);
            if (st.isSymbolicLink()) {
                return { name, type: 'symlink-skipped' };
            }
            if (st.isDirectory()) {
                return { name, type: 'directory' };
            }
            return { name, type: 'file' };
        });

        return { ok: true, data: entries };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const fsFileExists: ToolHandler = async (args): Promise<ToolResult<{ exists: boolean }>> => {
    try {
        const filePath = resolveSafePath(args.path);
        return { ok: true, data: { exists: existsSync(filePath) } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const fsDeleteFile: ToolHandler = async (args): Promise<ToolResult<{ deleted: boolean }>> => {
    try {
        const filePath = resolveSafePath(args.path);
        if (!existsSync(filePath)) {
            return { ok: false, error: 'File does not exist' };
        }
        if (lstatSync(filePath).isDirectory()) {
            return { ok: false, error: 'Path points to a directory, not a file' };
        }
        unlinkSync(filePath);
        return { ok: true, data: { deleted: true } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const fsToolDefinitions: ToolDefinition[] = [
    {
        name: 'fs_read_file',
        description: 'Read a file from local filesystem (path traversal blocked)',
        parameters: {
            path: { type: 'string', description: 'Path to file', required: true },
        },
    },
    {
        name: 'fs_write_file',
        description: 'Write a file in safe workdir (path traversal blocked)',
        parameters: {
            path: { type: 'string', description: 'Path to file', required: true },
            content: { type: 'string', description: 'File content', required: true },
        },
    },
    {
        name: 'fs_list_dir',
        description: 'List directory entries without traversing symlinks',
        parameters: {
            path: { type: 'string', description: 'Path to directory', required: true },
        },
    },
    {
        name: 'fs_file_exists',
        description: 'Check whether a path exists',
        parameters: {
            path: { type: 'string', description: 'Path to check', required: true },
        },
    },
    {
        name: 'fs_delete_file',
        description: 'Delete a file in safe workdir (path traversal blocked)',
        parameters: {
            path: { type: 'string', description: 'Path to file', required: true },
        },
    },
];

export const fsToolHandlers: Record<string, ToolHandler> = {
    fs_read_file: fsReadFile,
    fs_write_file: fsWriteFile,
    fs_list_dir: fsListDir,
    fs_file_exists: fsFileExists,
    fs_delete_file: fsDeleteFile,
};