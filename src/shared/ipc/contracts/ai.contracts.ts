export interface AiChatRequest {
    prompt: string;
    model?: string;
    maxTokens?: number;
}

export interface AiChatResponse {
    response: string;
    tokensUsed?: number;
}

export interface AiStreamRequest {
    prompt: string;
    model?: string;
}

export interface AiStreamChunk {
    delta: string;
    done: boolean;
}