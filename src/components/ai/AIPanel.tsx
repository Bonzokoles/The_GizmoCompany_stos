/**
 * AI Assistant Panel — React 19 + typed API + useActionState
 */

import { useState, useCallback, useActionState } from 'react';
import type { AIProvider } from '../../types/electron';
import { PROMPT_CATEGORIES, PROMPT_LIBRARY, type PromptCategory } from '../../data/promptLibrary';
import { ErrorBoundary } from '../browser-core/ErrorBoundary';

interface AIPanelProps {
  onClose: () => void;
}

interface ResponseState {
  content: string;
  error: string | null;
}

export function AIPanel({ onClose }: AIPanelProps) {
  const [input, setInput] = useState('');
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [promptCategory, setPromptCategory] = useState<'all' | PromptCategory>('all');

  const { electronAPI } = window;

  const [responseState, submitPrompt, isPending] = useActionState<ResponseState, void>(
    async (prevState): Promise<ResponseState> => {
      if (!input.trim()) return prevState;

      try {
        const result = await electronAPI.ai.execute({
          prompt: input,
          maxTokens: 2048,
          temperature: 0.7,
        });

        return result.success
          ? { content: result.data?.content ?? '', error: null }
          : { content: '', error: result.error ?? 'Nieznany błąd' };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Nieznany błąd';
        return { content: '', error: msg };
      }
    },
    { content: '', error: null }
  );

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt();
  }, [submitPrompt]);

  const loadProviders = useCallback(async () => {
    try {
      const status = await electronAPI.ai.getProviders();
      setProviders(status);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, [electronAPI]);

  const visiblePrompts = promptCategory === 'all'
    ? PROMPT_LIBRARY
    : PROMPT_LIBRARY.filter((p) => p.category === promptCategory);

  return (
    <ErrorBoundary>
      <div className="ai-panel floating-panel" role="complementary" aria-label="Panel AI">
        <div className="panel-header">
          <h2>🤖 Asystent AI</h2>
          <button className="btn-close" onClick={onClose} aria-label="Zamknij panel AI">
            ×
          </button>
        </div>

      <div className="panel-content">
        {/* Prompt Library */}
        <div className="providers-list" style={{ marginBottom: 12 }}>
          <h3>Biblioteka promptów:</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <select
              value={promptCategory}
              onChange={(e) => setPromptCategory(e.target.value as 'all' | PromptCategory)}
              className="btn-small"
              aria-label="Filtr kategorii promptów"
            >
              <option value="all">Wszystkie</option>
              {PROMPT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, opacity: 0.75 }}>{visiblePrompts.length} szablonów</span>
          </div>
          <div style={{ display: 'grid', gap: 6, maxHeight: 170, overflowY: 'auto' }}>
            {visiblePrompts.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="btn-small"
                onClick={() => setInput(tpl.prompt)}
                title={tpl.prompt}
                style={{ textAlign: 'left' }}
              >
                {tpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Status */}
        <div className="providers-list">
          <h3>Aktywni dostawcy:</h3>
          {providers.length === 0 ? (
            <button onClick={loadProviders} className="btn-small">
              Załaduj dostawców
            </button>
          ) : (
            <ul>
              {providers.map((p) => (
                <li key={p.name} className={p.enabled ? 'active' : 'disabled'}>
                  {p.displayName} (#{p.priority})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zadaj pytanie asystentowi AI..."
            disabled={isPending}
            className="ai-input"
            aria-label="Zapytanie AI"
          />

          {/* Response */}
          {responseState.error ? (
            <div className="ai-error" role="alert" aria-live="assertive">
              <h4>Błąd:</h4>
              <p>{responseState.error}</p>
            </div>
          ) : responseState.content ? (
            <div className="ai-response" aria-live="polite">
              <h4>Odpowiedź:</h4>
              <p>{responseState.content}</p>
            </div>
          ) : null}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="btn-primary"
          >
            {isPending ? 'Przetwarzanie...' : 'Wyślij'}
          </button>
        </form>
      </div>
      </div>
    </ErrorBoundary>
  );
}