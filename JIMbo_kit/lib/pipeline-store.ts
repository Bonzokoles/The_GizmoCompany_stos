export interface PreparedFile {
    id: string;
    originalPath: string;
    extractedText: string;
    chunks: string[];
    status: 'ready' | 'processing' | 'error';
    createdAt: number;
    error?: string;
}

class PipelineStore {
    private readonly store = new Map<string, PreparedFile>();
    private readonly maxAgeMs = 60 * 60 * 1000;

    constructor() {
        const timer = setInterval(() => this.cleanup(), 30 * 60 * 1000);
        timer.unref?.();
    }

    set(item: PreparedFile): void {
        this.cleanup();
        this.store.set(item.id, item);
    }

    get(id: string): PreparedFile | undefined {
        this.cleanup();
        return this.store.get(id);
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }

    listAll(): PreparedFile[] {
        this.cleanup();
        return [...this.store.values()];
    }

    cleanup(): void {
        const cutoff = Date.now() - this.maxAgeMs;
        for (const [id, item] of this.store.entries()) {
            if (item.createdAt < cutoff) {
                this.store.delete(id);
            }
        }
    }
}

export const pipelineStore = new PipelineStore();