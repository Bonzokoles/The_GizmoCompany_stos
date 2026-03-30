/**
 * MCP AI Tools — Claude API integration via Anthropic SDK
 * Provides AI chat/completion capabilities to MCP clients
 */

import type { MCPTool } from '../mcp-server';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaudeAPI(
  messages: ClaudeMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
  } = {},
): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }

  const body: Record<string, unknown> = {
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 4096,
    messages,
  };

  if (options.systemPrompt) {
    body.system = options.systemPrompt;
  }

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  return (await response.json()) as ClaudeResponse;
}

export function createAITools(): MCPTool[] {
  return [
    {
      name: 'claude_chat',
      description:
        'Send a message to Claude (Anthropic) and get an AI response. Supports system prompts, temperature, and model selection.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'User message to send to Claude' },
          systemPrompt: {
            type: 'string',
            description: 'Optional system prompt for context/instructions',
          },
          model: {
            type: 'string',
            enum: [
              'claude-sonnet-4-20250514',
              'claude-haiku-3-20240307',
              'claude-opus-4-20250514',
            ],
            description: 'Claude model to use (default: claude-sonnet-4-20250514)',
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum tokens in response (default: 4096)',
          },
          temperature: {
            type: 'number',
            description: 'Temperature 0-1 (default: model default)',
          },
        },
        required: ['message'],
      },
      handler: async (input) => {
        const message = str(input.message);
        if (!message) return { error: 'message is required' };

        const result = await callClaudeAPI(
          [{ role: 'user', content: message }],
          {
            model: str(input.model) || undefined,
            maxTokens: num(input.maxTokens, 4096),
            systemPrompt: str(input.systemPrompt) || undefined,
            temperature: input.temperature !== undefined ? num(input.temperature, 0.7) : undefined,
          },
        );

        return {
          response: result.content.map((c) => c.text).join('\n'),
          model: result.model,
          usage: result.usage,
        };
      },
    },

    {
      name: 'claude_analyze_page',
      description:
        'Use Claude to analyze the content of the currently active browser tab. Extracts page text and sends it for AI analysis.',
      inputSchema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'What to analyze about the page (e.g. "summarize", "extract key points")',
          },
          maxContentLength: {
            type: 'number',
            description: 'Max characters of page content to send (default: 8000)',
          },
        },
        required: ['question'],
      },
      handler: async (input, ctx) => {
        const question = str(input.question);
        if (!question) return { error: 'question is required' };

        const bm = ctx.browserManager;
        if (!bm) return { error: 'browserManager unavailable' };

        const tab = bm.getActiveTab() as { url?: string; webContents?: Electron.WebContents };
        if (!tab?.webContents) return { error: 'No active tab with webContents' };

        // Extract page content
        const pageContent = await tab.webContents.executeJavaScript(`
          (() => {
            const body = document.body;
            if (!body) return '';
            // Remove scripts and styles
            const clone = body.cloneNode(true);
            clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            return clone.innerText.substring(0, ${num(input.maxContentLength, 8000)});
          })()
        `);

        if (!pageContent) return { error: 'Could not extract page content' };

        const result = await callClaudeAPI(
          [
            {
              role: 'user',
              content: `Analyze this webpage content and answer the question.\n\nPage content:\n${pageContent}\n\nQuestion: ${question}`,
            },
          ],
          {
            systemPrompt:
              'You are a helpful assistant analyzing webpage content. Be concise and accurate. Respond in the same language as the question.',
            maxTokens: 2048,
          },
        );

        return {
          analysis: result.content.map((c) => c.text).join('\n'),
          pageLength: pageContent.length,
          model: result.model,
          usage: result.usage,
        };
      },
    },

    {
      name: 'claude_translate',
      description: 'Translate text using Claude. Supports any language pair.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to translate' },
          targetLanguage: {
            type: 'string',
            description: 'Target language (e.g. "Polish", "English", "German")',
          },
          sourceLanguage: {
            type: 'string',
            description: 'Source language (optional, auto-detected if omitted)',
          },
        },
        required: ['text', 'targetLanguage'],
      },
      handler: async (input) => {
        const text = str(input.text);
        const target = str(input.targetLanguage);
        if (!text || !target) return { error: 'text and targetLanguage are required' };

        const source = str(input.sourceLanguage);
        const prompt = source
          ? `Translate the following text from ${source} to ${target}. Return ONLY the translation, nothing else.\n\n${text}`
          : `Translate the following text to ${target}. Return ONLY the translation, nothing else.\n\n${text}`;

        const result = await callClaudeAPI(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are a professional translator. Output ONLY the translated text.',
            maxTokens: 4096,
            temperature: 0.3,
          },
        );

        return {
          translation: result.content.map((c) => c.text).join('\n'),
          targetLanguage: target,
          sourceLanguage: source || 'auto-detected',
          usage: result.usage,
        };
      },
    },

    {
      name: 'claude_summarize',
      description: 'Summarize text using Claude AI. Great for long articles or documents.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to summarize' },
          style: {
            type: 'string',
            enum: ['brief', 'detailed', 'bullet-points'],
            description: 'Summary style (default: brief)',
          },
          language: {
            type: 'string',
            description: 'Output language (default: same as input)',
          },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const text = str(input.text);
        if (!text) return { error: 'text is required' };

        const style = str(input.style) || 'brief';
        const language = str(input.language);

        const stylePrompts: Record<string, string> = {
          brief: 'Provide a concise 2-3 sentence summary.',
          detailed: 'Provide a comprehensive summary covering all key points.',
          'bullet-points': 'Summarize as a bullet-point list of key points.',
        };

        let prompt = `${stylePrompts[style] || stylePrompts.brief}\n\nText to summarize:\n${text}`;
        if (language) {
          prompt += `\n\nRespond in ${language}.`;
        }

        const result = await callClaudeAPI(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are a summarization expert. Be accurate and concise.',
            maxTokens: 2048,
            temperature: 0.3,
          },
        );

        return {
          summary: result.content.map((c) => c.text).join('\n'),
          style,
          inputLength: text.length,
          usage: result.usage,
        };
      },
    },
  ];
}
