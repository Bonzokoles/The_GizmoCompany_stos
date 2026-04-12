import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

const HUB_BASE_URL = process.env.HUB_URL ?? 'http://127.0.0.1:4224';

const hubQueryAgent: ToolHandler = async (args): Promise<ToolResult<unknown>> => {
    try {
        const agentId = typeof args.agentId === 'string' ? args.agentId : '';
        const prompt = typeof args.prompt === 'string' ? args.prompt : '';

        if (!agentId || !prompt) {
            return { ok: false, error: 'agentId and prompt are required' };
        }

        const response = await fetch(`${HUB_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent: agentId,
                stream: false,
                messages: [{ role: 'user', content: prompt }],
            }),
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            return { ok: false, error: `Hub query failed: ${response.status}` };
        }

        return { ok: true, data: await response.json() };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const hubListAgents: ToolHandler = async (): Promise<ToolResult<unknown>> => {
    try {
        const response = await fetch(`${HUB_BASE_URL}/agents`, {
            method: 'GET',
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            return { ok: false, error: `Hub list agents failed: ${response.status}` };
        }

        return { ok: true, data: await response.json() };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const hubToolDefinitions: ToolDefinition[] = [
    {
        name: 'hub_query_agent',
        description: 'Query agent via JIMBO_agent_HUB /chat endpoint',
        parameters: {
            agentId: { type: 'string', description: 'Agent identifier', required: true },
            prompt: { type: 'string', description: 'Prompt to send', required: true },
        },
    },
    {
        name: 'hub_list_agents',
        description: 'List agents from JIMBO_agent_HUB',
        parameters: {},
    },
];

export const hubToolHandlers: Record<string, ToolHandler> = {
    hub_query_agent: hubQueryAgent,
    hub_list_agents: hubListAgents,
};