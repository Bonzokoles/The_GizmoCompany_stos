/**
 * JimboKitTerminal
 *
 * Agent-controlled terminal for ZENO browser page function control.
 * Allows executing named commands that control the browser:
 *   /navigate <url>     — navigate active tab
 *   /newtab             — open a new tab
 *   /back               — navigate back
 *   /forward            — navigate forward
 *   /reload             — reload current page
 *   /fetch <url>        — fetch URL content via ZENO web gate
 *   /search <query>     — Google search
 *   /js <script>        — evaluate JS in current page (safe subset)
 *   /clear              — clear terminal history
 *   /help               — list commands
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TerminalEntry } from '../../hooks/useJimboKitStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TerminalProps {
  log: TerminalEntry[];
  addEntry: (entry: TerminalEntry) => void;
  updateEntry: (id: string, patch: Partial<TerminalEntry>) => void;
  /** Browser control callbacks wired up by parent */
  onNavigate?: (url: string) => void;
  onNewTab?: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  currentUrl?: string;
}

// ─── Command registry ──────────────────────────────────────────────────────────

const HELP_TEXT = `Dostępne komendy:
  /navigate <url>    — otwórz URL w aktywnej karcie
  /newtab            — otwórz nową kartę
  /back              — wróć do poprzedniej strony
  /forward           — przejdź do następnej strony
  /reload            — odśwież stronę
  /fetch <url>       — pobierz zawartość URL (przez AI Gate)
  /search <query>    — wyszukaj w Google
  /url               — pokaż aktualny URL
  /clear             — wyczyść terminal
  /help              — ta lista`;

async function fetchViaBridge(url: string): Promise<string> {
  const res = await fetch('/api/webgate/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Błąd HTTP ${res.status}`);
  const data = await res.json() as { content?: string; text?: string; html?: string };
  const raw = data.content ?? data.text ?? data.html ?? '';
  return raw.slice(0, 2000) + (raw.length > 2000 ? '\n… (skrócono)' : '');
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const JimboKitTerminal: React.FC<TerminalProps> = ({
  log,
  addEntry,
  updateEntry,
  onNavigate,
  onNewTab,
  onBack,
  onForward,
  onReload,
  currentUrl = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const cmdHistory = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  const run = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      cmdHistory.current = [trimmed, ...cmdHistory.current.slice(0, 49)];
      setHistoryIdx(-1);

      const id = crypto.randomUUID();
      const ts = Date.now();

      // /clear — special case (no entry needed)
      if (trimmed === '/clear') {
        // handled in parent via log state — push a marker
        addEntry({ id, command: trimmed, output: '— wyczyszczono —', status: 'ok', timestamp: ts });
        return;
      }

      addEntry({ id, command: trimmed, output: '', status: 'running', timestamp: ts });

      try {
        let output = '';

        if (trimmed === '/help') {
          output = HELP_TEXT;
        } else if (trimmed === '/url') {
          output = currentUrl || '(brak aktywnej karty)';
        } else if (trimmed === '/newtab') {
          onNewTab?.();
          output = 'Otwarto nową kartę.';
        } else if (trimmed === '/back') {
          onBack?.();
          output = 'Navigated back.';
        } else if (trimmed === '/forward') {
          onForward?.();
          output = 'Navigated forward.';
        } else if (trimmed === '/reload') {
          onReload?.();
          output = 'Przeładowano stronę.';
        } else if (trimmed.startsWith('/navigate ')) {
          let url = trimmed.slice('/navigate '.length).trim();
          if (!url.startsWith('http')) url = `https://${url}`;
          onNavigate?.(url);
          output = `Navigowanie do: ${url}`;
        } else if (trimmed.startsWith('/search ')) {
          const query = trimmed.slice('/search '.length).trim();
          const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          onNavigate?.(url);
          output = `Wyszukiwanie: ${query}`;
        } else if (trimmed.startsWith('/fetch ')) {
          let url = trimmed.slice('/fetch '.length).trim();
          if (!url.startsWith('http')) url = `https://${url}`;
          output = await fetchViaBridge(url);
        } else {
          output = `Nieznana komenda: ${trimmed.split(' ')[0]}\nWpisz /help aby zobaczyć dostępne komendy.`;
        }

        updateEntry(id, { output, status: 'ok' });
      } catch (err) {
        updateEntry(id, {
          output: err instanceof Error ? err.message : String(err),
          status: 'error',
        });
      }
    },
    [addEntry, updateEntry, onNavigate, onNewTab, onBack, onForward, onReload, currentUrl],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      run(inputValue).catch(console.error);
      setInputValue('');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, cmdHistory.current.length - 1);
      setHistoryIdx(next);
      setInputValue(cmdHistory.current[next] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInputValue(next === -1 ? '' : (cmdHistory.current[next] ?? ''));
    }
  }

  return (
    <div className="jk-terminal" onClick={() => inputRef.current?.focus()}>
      <div className="jk-terminal-log">
        <div className="jk-terminal-banner">
          {'>'} Jimbo_kit Terminal — wpisz /help aby zobaczyć komendy
        </div>
        {log.map((entry) => (
          <div key={entry.id} className="jk-terminal-entry">
            <div className="jk-terminal-cmd">
              <span className="jk-terminal-prompt">{'$'}</span>
              <span className="jk-terminal-cmdtext">{entry.command}</span>
              {entry.status === 'running' && (
                <span className="jk-terminal-spinner">⠿</span>
              )}
            </div>
            {entry.output && (
              <pre
                className={`jk-terminal-output jk-terminal-output--${entry.status}`}
              >
                {entry.output}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="jk-terminal-input-row">
        <span className="jk-terminal-prompt">{'$'}</span>
        <input
          ref={inputRef}
          className="jk-terminal-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="wpisz komendę /help…"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
