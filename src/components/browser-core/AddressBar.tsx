/**
 * Address Bar Component — React 19 + URL validation (CR-006 fix)
 */

import { useState, useEffect, useCallback, useOptimistic, useDeferredValue } from 'react';
import { BLOCKED_PROTOCOLS } from '../../types/security-constants';

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  loading: boolean;
}

function sanitizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // CR-006: Block dangerous protocols
  const lower = trimmed.toLowerCase();
  if (BLOCKED_PROTOCOLS.some(p => lower.startsWith(p))) {
    console.warn(`❌ Blocked unsafe protocol in URL: ${trimmed}`);
    return null;
  }

  // Add https:// if missing protocol
  let finalUrl = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    finalUrl = `https://${trimmed}`;
  }

  // CR-006: Validate URL format with URL constructor
  try {
    new URL(finalUrl);
    return finalUrl;
  } catch (e) {
    console.warn(`❌ Invalid URL format: ${finalUrl}`);
    return null;
  }
}

export function AddressBar({ url, onNavigate, loading }: AddressBarProps) {
  const [input, setInput] = useState(url);
  
  // React 19: useOptimistic for instant URL display feedback
  const [optimisticUrl, setOptimisticUrl] = useOptimistic(url);
  
  // React 19: useDeferredValue for non-urgent validation feedback
  const deferredInput = useDeferredValue(input);

  useEffect(() => {
    setInput(url);
  }, [url]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeUrl(input);
    if (sanitized) {
      // Set optimistic state immediately for instant feedback
      setOptimisticUrl(sanitized);
      onNavigate(sanitized);
    }
  }, [input, onNavigate, setOptimisticUrl]);

  // Validate deferred input for visual feedback (non-blocking)
  const isValid = deferredInput.trim() ? sanitizeUrl(deferredInput) !== null : true;

  return (
    <form className="address-bar" onSubmit={handleSubmit} role="search">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Wpisz adres URL lub szukaj..."
        disabled={loading}
        className={`address-input ${!isValid ? 'invalid' : ''}`}
        aria-label="Pasek adresu"
        aria-invalid={!isValid}
      />
      <button type="submit" disabled={loading || !isValid} className="btn-navigate" aria-label={loading ? 'Ładowanie' : 'Przejdź'}>
        {loading ? '⟳' : '→'}
      </button>
    </form>
  );
}