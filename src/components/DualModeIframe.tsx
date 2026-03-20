/**
 * DualModeIframe — Dual-mode iframe component
 * Mode 1: Classic <iframe> (default) — full access, standard HTML5
 * Mode 2: Sandboxed <iframe> — restricted permissions, audit-ready
 *
 * Used for: plugin panels, embedded widgets, external content
 */

import { useRef, useState, useCallback } from 'react';

interface DualModeIframeProps {
  src: string;
  id: string;
  sandboxed?: boolean;
  /** HTML sandbox tokens, e.g. ['allow-scripts', 'allow-same-origin'] */
  sandboxTokens?: string[];
  /** HTML allow attribute values, e.g. ['camera', 'microphone', 'geolocation'] */
  allow?: string[];
  title?: string;
  style?: React.CSSProperties;
  onToggleSandbox?: (enabled: boolean) => void;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

const SAFE_SANDBOX_DEFAULTS = [
  'allow-scripts',
  'allow-same-origin',
  'allow-popups',
  'allow-forms',
];

/**
 * Validates URL to prevent dangerous protocols
 */
function isUrlSafe(url: string): boolean {
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return false;
  }
  return true;
}

export function DualModeIframe({
  src,
  id,
  sandboxed = false,
  sandboxTokens = SAFE_SANDBOX_DEFAULTS,
  allow = [],
  title,
  style,
  onToggleSandbox,
  onLoad,
  onError,
}: DualModeIframeProps) {
  const [mode, setMode] = useState<'classic' | 'sandboxed'>(sandboxed ? 'sandboxed' : 'classic');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMode = useCallback(() => {
    const next = mode === 'classic' ? 'sandboxed' : 'classic';
    setMode(next);
    onToggleSandbox?.(next === 'sandboxed');
  }, [mode, onToggleSandbox]);

  const handleLoad = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    onError?.(`Failed to load: ${src}`);
  }, [onError, src]);

  // Block dangerous URLs
  if (!isUrlSafe(src)) {
    return (
      <div className="dual-mode-iframe error" style={{ padding: 16, color: '#ef4444' }}>
        Zablokowany URL: niebezpieczny protokół
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...style,
  };

  const iframeStyle: React.CSSProperties = {
    width: '100%',
    flex: 1,
    border: 'none',
    borderRadius: '4px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: mode === 'sandboxed' ? '#1e293b' : '#0f172a',
    color: '#94a3b8',
    fontSize: '12px',
    borderBottom: '1px solid #334155',
  };

  return (
    <div className={`dual-mode-iframe ${mode}-mode`} style={containerStyle}>
      {title && (
        <div style={headerStyle}>
          <span>
            {mode === 'sandboxed' ? '🔒 ' : '🌐 '}
            {title}
          </span>
          <button
            onClick={toggleMode}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          >
            {mode === 'classic' ? '🔒 Sandbox' : '🔓 Classic'}
          </button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        id={id}
        src={src}
        style={iframeStyle}
        allow={mode === 'classic' ? allow.join('; ') : ''}
        sandbox={mode === 'sandboxed' ? sandboxTokens.join(' ') : undefined}
        title={title || 'Embedded content'}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
