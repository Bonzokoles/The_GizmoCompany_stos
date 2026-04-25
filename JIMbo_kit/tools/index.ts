import type OpenAI from 'openai';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';
import { fsToolDefinitions, fsToolHandlers } from './fs-tools';
import { sysToolDefinitions, sysToolHandlers } from './sys-tools';
import { podmanToolDefinitions, podmanToolHandlers } from './podman-tools';
import { gitToolDefinitions, gitToolHandlers } from './git-tools';
import { ragToolDefinitions, ragToolHandlers } from './rag-tools';
import { networkToolDefinitions, networkToolHandlers } from './network-tools';
import { hubToolDefinitions, hubToolHandlers } from './hub-tools';
import { pumoToolDefinitions, pumoToolHandlers } from '../../../WWW_Zen_BRo_wser_tool/tools/pumo-dashboard-tool';
import { filePipelineToolDefinitions, filePipelineToolHandlers } from './file-pipeline';

export const jimboToolDefinitions: ToolDefinition[] = [
    ...fsToolDefinitions,
    ...sysToolDefinitions,
    ...podmanToolDefinitions,
    ...gitToolDefinitions,
    ...ragToolDefinitions,
    ...networkToolDefinitions,
    ...hubToolDefinitions,
    ...filePipelineToolDefinitions,
    ...pumoToolDefinitions,
];

export const jimboToolHandlers: Record<string, ToolHandler> = {
    ...fsToolHandlers,
    ...sysToolHandlers,
    ...podmanToolHandlers,
    ...gitToolHandlers,
    ...ragToolHandlers,
    ...networkToolHandlers,
    ...hubToolHandlers,
    ...filePipelineToolHandlers,
    ...pumoToolHandlers,
};

export const jimboOpenAITools: OpenAI.Chat.ChatCompletionTool[] = jimboToolDefinitions.map(
    (tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: Object.fromEntries(
                    Object.entries(tool.parameters).map(([key, value]) => [
                        key,
                        {
                            type: value.type,
                            description: value.description,
                        },
                    ]),
                ),
                required: Object.entries(tool.parameters)
                    .filter(([, value]) => value.required)
                    .map(([key]) => key),
            },
        },
    }),
);

export async function executeJimboTool(
    name: string,
    args: Record<string, unknown>,
): Promise<ToolResult | null> {
    const handler = jimboToolHandlers[name];
    if (!handler) return null;
    return handler(args);
}