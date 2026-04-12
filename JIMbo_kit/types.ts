export interface ToolResult<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<
        string,
        {
            type: string;
            description: string;
            required?: boolean;
        }
    >;
}

export type ToolHandler = (
    args: Record<string, unknown>,
) => Promise<ToolResult>;