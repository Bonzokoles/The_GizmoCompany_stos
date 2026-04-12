import { basename } from 'path';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';
import { prepareFile } from '../lib/file-prepare';
import { pipelineStore } from '../lib/pipeline-store';

type PipelineStatus = 'ready' | 'processing' | 'error';

const filePrepare: ToolHandler = async (args): Promise<ToolResult<{ prepared_id: string; chunks_count: number; size_bytes: number }>> => {
    try {
        const filePath = typeof args.filePath === 'string' ? args.filePath : '';
        if (!filePath) {
            return { ok: false, error: 'filePath is required' };
        }

        const result = await prepareFile(filePath);
        pipelineStore.set(result.preparedFile);

        return {
            ok: true,
            data: {
                prepared_id: result.preparedFile.id,
                chunks_count: result.preparedFile.chunks.length,
                size_bytes: result.sizeBytes,
            },
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const pipelineStatus: ToolHandler = async (args): Promise<ToolResult<{ status: PipelineStatus; error?: string }>> => {
    try {
        const preparedId = typeof args.prepared_id === 'string' ? args.prepared_id : '';
        if (!preparedId) {
            return { ok: false, error: 'prepared_id is required' };
        }

        const item = pipelineStore.get(preparedId);
        if (!item) {
            return { ok: false, error: 'Prepared file not found' };
        }

        return {
            ok: true,
            data: {
                status: item.status,
                error: item.error,
            },
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const fileSendToBuch: ToolHandler = async (args): Promise<ToolResult<{ d1_id: string; r2_key: string }>> => {
    const preparedId = typeof args.prepared_id === 'string' ? args.prepared_id : '';
    const bucketName = typeof args.bucket_name === 'string' && args.bucket_name.trim() ? args.bucket_name : 'zeno-files';

    if (!preparedId) {
        return { ok: false, error: 'prepared_id is required' };
    }

    const item = pipelineStore.get(preparedId);
    if (!item) {
        return { ok: false, error: 'Prepared file not found' };
    }

    const BUCH_URL = process.env.BUCH_URL || 'http://localhost:5180';

    try {
        item.status = 'processing';
        pipelineStore.set(item);

        const r2Payload = {
            key: `${bucketName}/${preparedId}/${basename(item.originalPath)}`,
            content: item.extractedText,
            content_type: 'text/plain; charset=utf-8',
        };

        const r2Response = await fetch(`${BUCH_URL}/api/r2/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(r2Payload),
            signal: AbortSignal.timeout(30_000),
        });

        if (!r2Response.ok) {
            item.status = 'error';
            item.error = `R2 upload failed: ${r2Response.status}`;
            pipelineStore.set(item);
            return { ok: false, error: item.error };
        }

        const r2Result = (await r2Response.json()) as Record<string, unknown>;

        const d1Payload = {
            table: 'file_pipeline_metadata',
            data: {
                prepared_id: preparedId,
                original_path: item.originalPath,
                chunks_count: item.chunks.length,
                created_at: item.createdAt,
                r2_key: String(r2Result.key ?? r2Payload.key),
            },
        };

        const d1QueryResponse = await fetch(`${BUCH_URL}/api/d1/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d1Payload),
            signal: AbortSignal.timeout(30_000),
        });

        let d1Response = d1QueryResponse;
        if (!d1QueryResponse.ok) {
            d1Response = await fetch(`${BUCH_URL}/api/d1/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(d1Payload),
                signal: AbortSignal.timeout(30_000),
            });
        }

        if (!d1Response.ok) {
            item.status = 'error';
            item.error = `D1 save failed: ${d1Response.status}`;
            pipelineStore.set(item);
            return { ok: false, error: item.error };
        }

        const d1Result = (await d1Response.json()) as Record<string, unknown>;
        item.status = 'ready';
        item.error = undefined;
        pipelineStore.set(item);

        return {
            ok: true,
            data: {
                d1_id: String(d1Result.id ?? d1Result.record_id ?? preparedId),
                r2_key: String(r2Result.key ?? r2Payload.key),
            },
        };
    } catch (error) {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : String(error);
        pipelineStore.set(item);
        return { ok: false, error: item.error };
    }
};

const fileSendToMyBonzo: ToolHandler = async (args): Promise<ToolResult<{ mybonzo_id: string }>> => {
    const preparedId = typeof args.prepared_id === 'string' ? args.prepared_id : '';
    const note = typeof args.note === 'string' ? args.note : '';

    if (!preparedId) {
        return { ok: false, error: 'prepared_id is required' };
    }

    const item = pipelineStore.get(preparedId);
    if (!item) {
        return { ok: false, error: 'Prepared file not found' };
    }

    const MYBONZO_URL = process.env.MYBONZO_URL;
    if (!MYBONZO_URL) {
        return { ok: false, error: 'MYBONZO_URL is required in environment' };
    }

    try {
        item.status = 'processing';
        pipelineStore.set(item);

        const response = await fetch(MYBONZO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prepared_id: preparedId,
                file_name: basename(item.originalPath),
                text: item.extractedText,
                chunks: item.chunks,
                note,
            }),
            signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
            item.status = 'error';
            item.error = `MyBonzo request failed: ${response.status}`;
            pipelineStore.set(item);
            return { ok: false, error: item.error };
        }

        const payload = (await response.json()) as Record<string, unknown>;
        item.status = 'ready';
        item.error = undefined;
        pipelineStore.set(item);

        return {
            ok: true,
            data: {
                mybonzo_id: String(payload.id ?? payload.mybonzo_id ?? preparedId),
            },
        };
    } catch (error) {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : String(error);
        pipelineStore.set(item);
        return { ok: false, error: item.error };
    }
};

export const filePipelineToolDefinitions: ToolDefinition[] = [
    {
        name: 'file_prepare',
        description: 'Przygotowuje plik do pipeline — ekstrahuje tekst, dzieli na chunki.',
        parameters: {
            filePath: { type: 'string', description: 'Ścieżka do pliku', required: true },
        },
    },
    {
        name: 'pipeline_status',
        description: 'Sprawdza status przygotowanego pliku.',
        parameters: {
            prepared_id: { type: 'string', description: 'ID przygotowanego pliku', required: true },
        },
    },
    {
        name: 'file_send_to_buch',
        description: 'Wysyła przygotowany plik do BUCH (D1 + R2).',
        parameters: {
            prepared_id: { type: 'string', description: 'ID przygotowanego pliku', required: true },
            bucket_name: { type: 'string', description: 'Docelowy bucket (domyślnie zeno-files)' },
        },
    },
    {
        name: 'file_send_to_mybonzo',
        description: 'Wysyła przygotowany plik do MyBonzo (URL z MYBONZO_URL).',
        parameters: {
            prepared_id: { type: 'string', description: 'ID przygotowanego pliku', required: true },
            note: { type: 'string', description: 'Opcjonalna notatka metadanych' },
        },
    },
];

export const filePipelineToolHandlers: Record<string, ToolHandler> = {
    file_prepare: filePrepare,
    pipeline_status: pipelineStatus,
    file_send_to_buch: fileSendToBuch,
    file_send_to_mybonzo: fileSendToMyBonzo,
};