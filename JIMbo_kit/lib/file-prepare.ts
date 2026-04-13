import { randomUUID } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import { extname, resolve } from 'path';
import { type PreparedFile } from './pipeline-store';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const SAFE_ROOT = resolve(process.cwd());
const ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.json', '.ts', '.js', '.py', '.csv']);

export interface PrepareFileResult {
    preparedFile: PreparedFile;
    sizeBytes: number;
}

function resolveSafePath(inputPath: string): string {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('filePath is required');
    }

    const normalized = inputPath.replace(/\\/g, '/');
    if (normalized.includes('../') || normalized.includes('..\\')) {
        throw new Error('Path traversal is not allowed');
    }

    const absolutePath = resolve(SAFE_ROOT, inputPath);
    if (!absolutePath.startsWith(SAFE_ROOT)) {
        throw new Error('Path is outside safe workdir');
    }

    return absolutePath;
}

function chunkText(input: string, chunkSize = 1000, overlap = 100): string[] {
    if (!input) return [];

    const chunks: string[] = [];
    let start = 0;
    while (start < input.length) {
        const end = Math.min(start + chunkSize, input.length);
        chunks.push(input.slice(start, end));
        if (end >= input.length) break;
        start = Math.max(0, end - overlap);
    }
    return chunks;
}

export async function prepareFile(filePath: string): Promise<PrepareFileResult> {
    const absolutePath = resolveSafePath(filePath);

    if (!existsSync(absolutePath)) {
        throw new Error('File does not exist');
    }

    const fileStat = statSync(absolutePath);
    if (!fileStat.isFile()) {
        throw new Error('Path must point to a file');
    }

    if (fileStat.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File exceeds 50MB security limit');
    }

    const extension = extname(absolutePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
        throw new Error(`Unsupported file extension: ${extension}`);
    }

    const rawContent = readFileSync(absolutePath);
    const extractedText =
        extension === '.csv' ? rawContent.toString('utf-8') : readFileSync(absolutePath, 'utf-8');

    const preparedFile: PreparedFile = {
        id: randomUUID(),
        originalPath: absolutePath,
        extractedText,
        chunks: chunkText(extractedText, 1000, 100),
        status: 'ready',
        createdAt: Date.now(),
    };

    return {
        preparedFile,
        sizeBytes: fileStat.size,
    };
}