/**
 * Address Bar Component — React 19 + URL validation (CR-006 fix)
 */

import { useState, useEffect, useCallback } from 'react';

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  loading: boolean;
}

const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];

function sanitizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (BLOCKED_PROTOCOLS.some(p => lower.startsWith(p))) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function AddressBar({ url, onNavigate, loading }: AddressBarProps) {
  const [input, setInput] = useState(url);

  useEffect(() => {
    setInput(url);
  }, [url]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeUrl(input);
    if (sanitized) {
      onNavigate(sanitized);
    }
  }, [input, onNavigate]);

  return (
    <form className="address-bar" onSubmit={handleSubmit} role="search">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Wpisz adres URL lub szukaj..."
        disabled={loading}
        className="address-input"
        aria-label="Pasek adresu"
      />
      <button type="submit" disabled={loading} className="btn-navigate" aria-label={loading ? 'Ładowanie' : 'Przejdź'}>
        {loading ? '⟳' : '→'}
      </button>
    </form>
  );
}