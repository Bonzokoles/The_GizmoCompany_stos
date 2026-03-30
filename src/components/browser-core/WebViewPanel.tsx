/**
 * WebViewPanel — Dual-mode page renderer
 * Mode 1: Electron <webview> tag (full browser, default in Electron)
 * Mode 2: Classic <iframe> fallback (non-Electron or explicit override)
 */

/// <reference types="electron" />

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

/** Check if Electron webview tag is available */
const hasWebviewSupport = typeof window !== 'undefined' && !!window.electronAPI;

interface WebViewPanelProps {
  url: string;
  /** Force iframe mode even inside Electron */
  forceIframe?: boolean;
  onNavigate?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onLoadStart?: () => void;
  onLoadStop?: () => void;
  onFaviconChange?: (favicons: string[]) => void;
}

export interface WebViewPanelHandle {
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  reload: () => void;
}

/** Block dangerous protocols */
function isSafeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const WebViewPanel = forwardRef<WebViewPanelHandle, WebViewPanelProps>(
  function WebViewPanel(
    { url, forceIframe, onNavigate, onTitleChange, onLoadStart, onLoadStop, onFaviconChange },
    ref,
  ) {
    const useWebview = hasWebviewSupport && !forceIframe;

    // ── Webview mode refs ──────────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);
    const webviewRef = useRef<Electron.WebviewTag | null>(null);

    // ── Iframe mode refs ───────────────────────────────────
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Shared
    const lastLoadedUrl = useRef<string>('');

    // ── Imperative handle ──────────────────────────────────
    useImperativeHandle(ref, () => ({
      goBack: () => {
        if (useWebview) {
          webviewRef.current?.goBack();
        } else {
          try { iframeRef.current?.contentWindow?.history.back(); } catch { /* cross-origin */ }
        }
      },
      goForward: () => {
        if (useWebview) {
          webviewRef.current?.goForward();
        } else {
          try { iframeRef.current?.contentWindow?.history.forward(); } catch { /* cross-origin */ }
        }
      },
      canGoBack: () => {
        if (useWebview) return webviewRef.current?.canGoBack() ?? false;
        return true; // iframe can't reliably report this cross-origin
      },
      canGoForward: () => {
        if (useWebview) return webviewRef.current?.canGoForward() ?? false;
        return true;
      },
      reload: () => {
        if (useWebview) {
          webviewRef.current?.reload();
        } else {
          try { iframeRef.current?.contentWindow?.location.reload(); } catch {
            // cross-origin fallback: re-set src
            // eslint-disable-next-line no-self-assign
            if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; // force reload
          }
        }
      },
    }));

    // ════════════════════════════════════════════════════════
    // WEBVIEW MODE (Electron)
    // ════════════════════════════════════════════════════════

    // Create webview element imperatively (React doesn't handle custom elements well)
    useEffect(() => {
      if (!useWebview) return;
      const container = containerRef.current;
      if (!container) return;

      const wv = document.createElement('webview') as Electron.WebviewTag;
      wv.style.width = '100%';
      wv.style.height = '100%';
      wv.style.border = 'none';
      wv.setAttribute('allowpopups', '');
      // Security: disable plugins & remote module
      wv.setAttribute('disablewebsecurity', 'false');
      wv.setAttribute('plugins', 'false');
      // Set initial src via attribute
      wv.setAttribute('src', 'about:blank');

      container.appendChild(wv);
      webviewRef.current = wv;

      return () => {
        webviewRef.current = null;
        container.innerHTML = '';
      };
    }, [useWebview]);

    // Attach webview event listeners
    useEffect(() => {
      if (!useWebview) return;
      const wv = webviewRef.current;
      if (!wv) return;

      const handleDidNavigate = (e: Electron.DidNavigateEvent) => {
        lastLoadedUrl.current = e.url;
        onNavigate?.(e.url);
      };

      const handleDidNavigateInPage = (e: Electron.DidNavigateInPageEvent) => {
        if (e.isMainFrame) {
          lastLoadedUrl.current = e.url;
          onNavigate?.(e.url);
        }
      };

      const handleTitleUpdated = (e: Electron.PageTitleUpdatedEvent) => {
        onTitleChange?.(e.title);
      };

      const handleLoadStart = () => onLoadStart?.();
      const handleLoadStop = () => onLoadStop?.();

      const handleFaviconUpdated = (e: Electron.PageFaviconUpdatedEvent) => {
        onFaviconChange?.(e.favicons);
      };

      const handleNewWindow = (e: Event & { url: string }) => {
        e.preventDefault();
        // Block dangerous protocols in new-window
        if (!isSafeUrl(e.url)) return;
        wv.setAttribute('src', e.url);
      };

      const handleDidFailLoad = (e: Event & { errorCode: number; errorDescription: string; validatedURL: string }) => {
        console.warn(`[webview] Load failed: ${e.errorDescription} (${e.errorCode}) for ${e.validatedURL}`);
        onLoadStop?.();
      };

      wv.addEventListener('did-navigate', handleDidNavigate as any);
      wv.addEventListener('did-navigate-in-page', handleDidNavigateInPage as any);
      wv.addEventListener('page-title-updated', handleTitleUpdated as any);
      wv.addEventListener('did-start-loading', handleLoadStart);
      wv.addEventListener('did-stop-loading', handleLoadStop);
      wv.addEventListener('page-favicon-updated', handleFaviconUpdated as any);
      wv.addEventListener('new-window', handleNewWindow as any);
      wv.addEventListener('did-fail-load', handleDidFailLoad as any);

      return () => {
        wv.removeEventListener('did-navigate', handleDidNavigate as any);
        wv.removeEventListener('did-navigate-in-page', handleDidNavigateInPage as any);
        wv.removeEventListener('page-title-updated', handleTitleUpdated as any);
        wv.removeEventListener('did-start-loading', handleLoadStart);
        wv.removeEventListener('did-stop-loading', handleLoadStop);
        wv.removeEventListener('page-favicon-updated', handleFaviconUpdated as any);
        wv.removeEventListener('new-window', handleNewWindow as any);
        wv.removeEventListener('did-fail-load', handleDidFailLoad as any);
      };
    }, [useWebview, onNavigate, onTitleChange, onLoadStart, onLoadStop, onFaviconChange]);

    // Load URL when it changes externally (webview mode)
    useEffect(() => {
      if (!useWebview) return;
      const wv = webviewRef.current;
      if (!wv || !url) return;
      if (url === lastLoadedUrl.current) return;
      if (url === 'about:blank') return;

      if (!isSafeUrl(url)) return;

      lastLoadedUrl.current = url;
      wv.setAttribute('src', url);
    }, [useWebview, url]);

    // ════════════════════════════════════════════════════════
    // IFRAME MODE (fallback / forced)
    // ════════════════════════════════════════════════════════

    // Load URL when it changes (iframe mode)
    useEffect(() => {
      if (useWebview) return;
      const iframe = iframeRef.current;
      if (!iframe || !url) return;
      if (url === lastLoadedUrl.current) return;
      if (url === 'about:blank') {
        iframe.src = 'about:blank';
        return;
      }

      if (!isSafeUrl(url)) return;

      lastLoadedUrl.current = url;
      iframe.src = url;
    }, [useWebview, url]);

    useEffect(() => {
      if (useWebview) return;
      const iframe = iframeRef.current;
      if (!iframe) return;

      const onLoad = () => onLoadStop?.();
      iframe.addEventListener('load', onLoad);

      return () => {
        iframe.removeEventListener('load', onLoad);
      };
    }, [useWebview, onLoadStop]);

    const handleIframeLoad = useCallback(() => {
      onLoadStop?.();
      // Try to read title from same-origin iframe
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.title) onTitleChange?.(doc.title);
      } catch {
        // cross-origin — expected
      }
    }, [onLoadStop, onTitleChange]);

    // ── RENDER ─────────────────────────────────────────────

    if (useWebview) {
      return (
        <div
          ref={containerRef}
          className="webview-container"
          style={{ width: '100%', height: '100%', flex: 1 }}
        />
      );
    }

    // Iframe fallback
    return (
      <iframe
        ref={iframeRef}
        className="webview-container iframe-fallback"
        style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
        src="about:blank"
        title="Web content"
        allow="accelerometer; camera; microphone; geolocation; gyroscope; payment; fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleIframeLoad}
        onLoadStart={() => onLoadStart?.()}
      />
    );
  },
);
