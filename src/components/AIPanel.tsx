/**
 * AI Assistant Panel — React 19 + typed API + useActionState
 */

import { useState, useCallback, useTransition } from 'react';
import type { AIProvider } from '../types/electron';

interface AIPanelProps {
  onClose: () => void;
}

export function AIPanel({ onClose }: AIPanelProps) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isPending, startTransition] = useTransition();

  const { electronAPI } = window;

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;

    startTransition(() => {
      void (async () => {
        try {
          const result = await electronAPI.ai.execute({
            prompt: input,
            maxTokens: 2048,
            temperature: 0.7,
          });

          if (result.success) {
            setResponse(result.data?.content ?? '');
          } else {
            setResponse(`Błąd: ${result.error}`);
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Nieznany błąd';
          setResponse(`Błąd: ${msg}`);
        }
      })();
    });
  }, [input, electronAPI]);

  const loadProviders = useCallback(async () => {
    try {
      const status = await electronAPI.ai.getProviders();
      setProviders(status);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, [electronAPI]);

  return (
    <div className="ai-panel floating-panel" role="complementary" aria-label="Panel AI">
      <div className="panel-header">
        <h2>🤖 Asystent AI</h2>
        <button className="btn-close" onClick={onClose} aria-label="Zamknij panel AI">
          ×
        </button>
      </div>

      <div className="panel-content">
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

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zadaj pytanie asystentowi AI..."
          disabled={isPending}
          className="ai-input"
          aria-label="Zapytanie AI"
        />

        {/* Response */}
        {response && (
          <div className="ai-response" aria-live="polite">
            <h4>Odpowiedź:</h4>
            <p>{response}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isPending || !input.trim()}
          className="btn-primary"
        >
          {isPending ? 'Przetwarzanie...' : 'Wyślij'}
        </button>
      </div>
    </div>
  );
}