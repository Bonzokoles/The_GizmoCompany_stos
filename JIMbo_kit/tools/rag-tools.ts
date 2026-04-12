import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

interface RagChunk {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    vector: Map<string, number>;
}

const ragStore: RagChunk[] = [];

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
}

function buildVector(text: string): Map<string, number> {
    const vector = new Map<string, number>();
    for (const token of tokenize(text)) {
        vector.set(token, (vector.get(token) ?? 0) + 1);
    }
    return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let aNorm = 0;
    let bNorm = 0;

    for (const value of a.values()) {
        aNorm += value * value;
    }
    for (const value of b.values()) {
        bNorm += value * value;
    }
    for (const [key, value] of a.entries()) {
        const bValue = b.get(key) ?? 0;
        dot += value * bValue;
    }

    if (aNorm === 0 || bNorm === 0) return 0;
    return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

const ragStoreText: ToolHandler = async (args): Promise<ToolResult<{ id: string }>> => {
    try {
        const content = typeof args.content === 'string' ? args.content : '';
        const metadataRaw = args.metadata;
        const metadata =
            metadataRaw && typeof metadataRaw === 'object' && !Array.isArray(metadataRaw)
                ? (metadataRaw as Record<string, unknown>)
                : {};

        if (!content.trim()) {
            return { ok: false, error: 'content is required' };
        }

        const id = `chunk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        ragStore.push({
            id,
            content,
            metadata,
            vector: buildVector(content),
        });

        return { ok: true, data: { id } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const ragQuery: ToolHandler = async (args): Promise<ToolResult<Array<{ id: string; score: number; content: string; metadata: Record<string, unknown> }>>> => {
    try {
        const query = typeof args.query === 'string' ? args.query : '';
        const topKRaw = typeof args.topK === 'number' ? args.topK : Number(args.topK ?? 5);
        const topK = Number.isFinite(topKRaw) ? Math.max(1, Math.min(50, Math.floor(topKRaw))) : 5;

        if (!query.trim()) {
            return { ok: false, error: 'query is required' };
        }

        const queryVector = buildVector(query);
        const scored = ragStore
            .map((chunk) => ({
                id: chunk.id,
                score: cosineSimilarity(queryVector, chunk.vector),
                content: chunk.content,
                metadata: chunk.metadata,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        return { ok: true, data: scored };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const ragListChunks: ToolHandler = async (args): Promise<ToolResult<Array<{ id: string; content: string; metadata: Record<string, unknown> }>>> => {
    try {
        const filterRaw =
            args.filter && typeof args.filter === 'object' && !Array.isArray(args.filter)
                ? (args.filter as Record<string, unknown>)
                : null;

        const data = ragStore
            .filter((chunk) => {
                if (!filterRaw) return true;
                return Object.entries(filterRaw).every(
                    ([key, value]) => chunk.metadata[key] === value,
                );
            })
            .map((chunk) => ({
                id: chunk.id,
                content: chunk.content,
                metadata: chunk.metadata,
            }));

        return { ok: true, data };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const ragClearStore: ToolHandler = async (): Promise<ToolResult<{ cleared: number }>> => {
    try {
        const cleared = ragStore.length;
        ragStore.length = 0;
        return { ok: true, data: { cleared } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const ragToolDefinitions: ToolDefinition[] = [
    {
        name: 'rag_store_text',
        description: 'Store text chunk in in-memory RAG store',
        parameters: {
            content: { type: 'string', description: 'Text content', required: true },
            metadata: { type: 'object', description: 'Optional metadata object' },
        },
    },
    {
        name: 'rag_query',
        description: 'Semantic query against in-memory RAG store (cosine similarity)',
        parameters: {
            query: { type: 'string', description: 'Search query', required: true },
            topK: { type: 'number', description: 'Top K results (default 5)' },
        },
    },
    {
        name: 'rag_list_chunks',
        description: 'List chunks from in-memory store with optional metadata filter',
        parameters: {
            filter: { type: 'object', description: 'Optional metadata filter object' },
        },
    },
    {
        name: 'rag_clear_store',
        description: 'Clear in-memory RAG store',
        parameters: {},
    },
];

export const ragToolHandlers: Record<string, ToolHandler> = {
    rag_store_text: ragStoreText,
    rag_query: ragQuery,
    rag_list_chunks: ragListChunks,
    rag_clear_store: ragClearStore,
};