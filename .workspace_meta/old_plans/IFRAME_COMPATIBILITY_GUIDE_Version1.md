# 🔗 IFRAME Compatibility & Support Guide - ZENO Browser

## ⚠️ Critical Requirement

**ZENO Browser MUST support traditional `<iframe>` elements for:**
- Regular web pages with embedded content
- Third-party widgets (YouTube, SoundCloud, Twitch, Google Maps, etc.)
- Plugin-generated panels
- User-created embeds
- External content providers

---

## Architecture: Dual-Mode IFRAME System

```
ZENO Browser IFRAME Handling
│
├─ Mode 1: CLASSIC IFRAME (Default)
│  ├─ Standard HTML5 <iframe> tag
│  ├─ No sandbox restrictions (unless parent specifies)
│  ├─ Full cross-origin support (if CORS allows)
│  ├─ Examples: YouTube embed, Google Maps, Vimeo
│  └─ User Experience: Works exactly like Chrome/Firefox
│
└─ Mode 2: SANDBOXED IFRAME (Opt-in)
   ├─ Custom <SandboxPanel> component
   ├─ Permission-based access control
   ├─ Audit logging
   ├─ Resource limiting
   ├─ Examples: Untrusted plugins, custom code panels
   └─ User Experience: Secure, monitored, explicit permissions
```

---

## Implementation Guide

### Part 1: WebView Container (Main Rendering)

```typescript
// File: src-electron/services/webview-manager.ts

import { BrowserView, ipcMain } from 'electron';

export class WebViewManager {
  private views: Map<string, BrowserView> = new Map();

  /**
   * Create main WebView for tab
   * Supports all iframe types by default
   */
  createWebView(
    parentWindow: BrowserWindow,
    options: {
      tabId: string;
      url: string;
      preload?: string;
      sandbox?: boolean;
    }
  ): BrowserView {
    const webView = new BrowserView({
      webPreferences: {
        preload: options.preload,
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        // Allow iframe by default - only restrict if explicitly sandboxed
        sandbox: options.sandbox ?? false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // Allow iframe nesting
        partition: `persist:${options.tabId}`,
      },
    });

    // Load URL
    webView.webContents.loadURL(options.url);

    // Allow iframe elements in loaded page
    webView.webContents.on('will-attach-webview', (event, webPreferences, params) => {
      // Allow iframe, but keep security
      webPreferences.sandbox = options.sandbox ?? true;
      webPreferences.contextIsolation = true;
      webPreferences.nodeIntegration = false;

      console.log(`[WebView] Allowing iframe: ${params.src}`);
    });

    // Handle navigation
    webView.webContents.on('will-navigate', (event, url) => {
      // Allow navigation in iframe
      console.log(`[Navigation] ${url}`);
    });

    // Handle new windows (target="_blank" in iframe)
    webView.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) {
        return { action: 'allow' };
      }
      return { action: 'deny' };
    });

    this.views.set(options.tabId, webView);
    return webView;
  }

  /**
   * Handle iframe creation within page
   */
  private setupIframeHandling(webContents: WebContents, tabId: string) {
    // Listen for iframe creation
    webContents.on('did-frame-navigate', (event) => {
      console.log(`[IFrame] Frame navigated in tab ${tabId}`);
    });

    // Handle iframe-to-parent communication
    ipcMain.on(`iframe-message:${tabId}`, (event, data) => {
      console.log(`[IFrame Message] Tab ${tabId}:`, data);
    });
  }

  destroyWebView(tabId: string) {
    const view = this.views.get(tabId);
    if (view) {
      view.webContents.destroy();
      this.views.delete(tabId);
    }
  }
}
```

### Part 2: HTML5 IFRAME Support in React

```typescript
// File: src/components/WebViewRenderer.tsx

import React, { useEffect, useRef } from 'react';

interface WebViewRendererProps {
  tabId: string;
  url: string;
  onIframeCreated?: (iframe: HTMLIFrameElement) => void;
}

/**
 * Web View Renderer
 * Displays web content with full iframe support
 */
export const WebViewRenderer: React.FC<WebViewRendererProps> = ({
  tabId,
  url,
  onIframeCreated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // In Electron, webview might be handled by native BrowserView
    // But for web content preview, we can use iframe

    // Option 1: Native Electron BrowserView (preferred)
    if (window.electronAPI) {
      // Signal to main process to create BrowserView
      window.electronAPI.createWebView?.(tabId, url);
    } else {
      // Option 2: Fallback iframe (useful for previewing)
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <iframe
            id="web-view-${tabId}"
            src="${url}"
            style="width: 100%; height: 100%; border: none;"
            allow="accelerometer; camera; microphone; geolocation; gyroscope; magnetometer; payment; usb; xr-spatial-tracking"
            allowFullScreen
          ></iframe>
        `;

        const iframe = containerRef.current.querySelector('iframe');
        if (iframe) {
          onIframeCreated?.(iframe as HTMLIFrameElement);
        }
      }
    }
  }, [tabId, url, onIframeCreated]);

  return (
    <div
      ref={containerRef}
      className="web-view-renderer"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
};
```

### Part 3: Plugin IFRAME Support

```typescript
// File: src/plugin-system/core/plugin-api.ts

export interface PluginIframeOptions {
  src: string;
  sandbox?: boolean; // true = SandboxPanel, false = classic iframe
  permissions?: PluginPermission[];
  title?: string;
  width?: string;
  height?: string;
  allow?: string[]; // HTML allow attribute
}

export interface PluginAPI {
  // ... existing methods ...

  /**
   * Create iframe for plugin
   * @param options - IFrame configuration
   * @param sandboxed - Use sandboxed mode (default: false for classic iframe)
   */
  createIframe(options: PluginIframeOptions): Promise<HTMLIFrameElement>;

  /**
   * Create panel with embedded content
   * Can contain iframe or other HTML
   */
  createPanel(options: {
    id: string;
    title: string;
    component?: React.ComponentType;
    iframeUrl?: string;
    iframeSandboxed?: boolean;
  }): Promise<PanelHandle>;

  /**
   * List active iframes
   */
  getActiveIframes(): Array<{
    id: string;
    src: string;
    sandboxed: boolean;
    permissions: string[];
  }>;

  /**
   * Communicate with iframe
   */
  postMessageToIframe(iframeId: string, message: any): void;
}
```

### Part 4: Dual-Mode IFRAME Component

```typescript
// File: src/components/DualModeIframe.tsx

import React, { useRef, useEffect, useState } from 'react';
import { SandboxPanel } from './SandboxPanel';

interface DualModeIframeProps {
  src: string;
  id: string;
  sandboxed?: boolean;
  permissions?: string[];
  allow?: string[];
  title?: string;
  onToggleSandbox?: (enabled: boolean) => void;
}

/**
 * Dual-Mode IFRAME Component
 * Supports both classic and sandboxed modes
 */
export const DualModeIframe: React.FC<DualModeIframeProps> = ({
  src,
  id,
  sandboxed = false,
  permissions = [],
  allow = [],
  title,
  onToggleSandbox,
}) => {
  const [mode, setMode] = useState<'classic' | 'sandboxed'>(sandboxed ? 'sandboxed' : 'classic');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Toggle between modes
  const toggleMode = () => {
    const newMode = mode === 'classic' ? 'sandboxed' : 'classic';
    setMode(newMode);
    onToggleSandbox?.(newMode === 'sandboxed');
  };

  // Mode: Classic IFRAME (no restrictions)
  if (mode === 'classic') {
    return (
      <div className="dual-mode-iframe classic-mode">
        {title && (
          <div className="iframe-header">
            <h3>{title}</h3>
            <button onClick={toggleMode} className="btn-toggle-sandbox">
              🔒 Enable Sandbox
            </button>
          </div>
        )}

        <iframe
          ref={iframeRef}
          id={id}
          src={src}
          style={{
            width: '100%',
            height: 'calc(100% - 40px)',
            border: 'none',
            borderRadius: '8px',
          }}
          allow={allow.join('; ')}
          title={title || 'Embedded content'}
          // Classic mode - no sandbox attribute = full permissions
        />
      </div>
    );
  }

  // Mode: Sandboxed IFRAME (with permissions control)
  return (
    <div className="dual-mode-iframe sandboxed-mode">
      {title && (
        <div className="iframe-header">
          <h3>{title}</h3>
          <button onClick={toggleMode} className="btn-toggle-sandbox">
            🔓 Disable Sandbox
          </button>
        </div>
      )}

      <SandboxPanel
        id={id}
        src={src}
        permissions={permissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {})}
      />
    </div>
  );
};
```

### Part 5: CSP & Security Headers

```typescript
// File: src-electron/main.ts

import { app, BrowserWindow, session } from 'electron';

function setupSecurityHeaders() {
  // Configure CSP to allow iframe but maintain security
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders;

    // Content Security Policy: Allow iframe from trusted origins
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for embedded scripts
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:", // Allow API calls from iframe
      "frame-src 'self' https:", // Allow iframe to load external content
      "media-src 'self' https:", // Allow video/audio from iframe
    ].join('; ');

    // X-Frame-Options: Allow being embedded in ZENO
    headers['X-Frame-Options'] = 'SAMEORIGIN';

    callback({ responseHeaders: headers });
  });
}

app.on('ready', () => {
  setupSecurityHeaders();
  // ... rest of setup
});
```

### Part 6: Test Cases for IFRAME Support

```typescript
// File: src/__tests__/iframe-support.test.ts

describe('IFRAME Support in ZENO Browser', () => {
  // Test classic iframe
  test('should render YouTube embed', async () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const element = render(
      <DualModeIframe src={url} id="youtube" sandboxed={false} />
    );

    const iframe = element.container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', url);
  });

  test('should render Google Maps', async () => {
    const url = 'https://www.google.com/maps/embed?pb=...';
    const element = render(
      <DualModeIframe src={url} id="maps" sandboxed={false} />
    );

    const iframe = element.container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });

  test('should support plugin-created iframe', async () => {
    const pluginApi = createMockPluginApi();
    const iframe = await pluginApi.createIframe({
      src: 'https://example.com/widget',
      sandbox: false,
    });

    expect(iframe).toBeDefined();
    expect(iframe.src).toContain('example.com');
  });

  test('should toggle between classic and sandboxed modes', async () => {
    const { getByText, container } = render(
      <DualModeIframe src="https://example.com" id="test" />
    );

    // Start in classic mode
    let iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();

    // Toggle to sandbox
    fireEvent.click(getByText('🔒 Enable Sandbox'));

    // Should render SandboxPanel instead
    const sandboxPanel = container.querySelector('.sandbox-panel');
    expect(sandboxPanel).toBeInTheDocument();
  });

  test('should respect allow attribute for browser features', async () => {
    const element = render(
      <DualModeIframe
        src="https://example.com"
        id="test"
        allow={['camera', 'microphone', 'geolocation']}
      />
    );

    const iframe = element.container.querySelector('iframe');
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('camera'));
  });

  test('should handle sandboxed iframe with permissions', async () => {
    const element = render(
      <DualModeIframe
        src="https://untrusted.com/widget"
        id="test"
        sandboxed={true}
        permissions={['network', 'storage']}
      />
    );

    const sandboxPanel = element.container.querySelector('.sandbox-panel');
    expect(sandboxPanel).toBeInTheDocument();

    const permissionBadges = sandboxPanel?.querySelectorAll('.permission-pill');
    expect(permissionBadges?.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Part 7: Documentation for Users

```markdown
# IFRAME Support in ZENO Browser

## Classic Mode (Default)
Most web content just works, including:
- ✅ YouTube, Vimeo, SoundCloud embeds
- ✅ Google Maps, calendars
- ✅ Social media widgets (Twitter, Facebook)
- ✅ Payment forms (Stripe, PayPal)
- ✅ Chatbots and live chat widgets
- ✅ Analytics code
- ✅ External content providers

**Usage:**
```html
<iframe src="https://example.com/widget" width="100%" height="500"></iframe>
```

## Sandboxed Mode (Opt-in)
For untrusted or custom code that needs monitoring:
- 🔒 Permission-based access control
- 📋 Audit logging of all actions
- 🛡️ Resource limiting
- ✋ Can be toggled on/off

**Usage:**
```tsx
<DualModeIframe
  src="https://untrusted.com/plugin"
  id="my-plugin"
  sandboxed={true}
  permissions={['network', 'storage']}
/>
```

## For Plugin Developers

```typescript
// Create classic iframe
const iframe = await api.createIframe({
  src: 'https://example.com/widget',
  sandbox: false, // Classic mode
});

// Create sandboxed iframe
const secureIframe = await api.createIframe({
  src: 'https://custom-code.com/panel',
  sandbox: true,
  permissions: ['network'],
});

// Communicate with iframe
api.postMessageToIframe('my-iframe', {
  action: 'getData',
  params: { id: 123 }
});
```
```

---

## ✅ Compatibility Checklist

**Before deployment, verify:**

- [ ] YouTube embeds work perfectly
- [ ] SoundCloud embeds work
- [ ] Twitch embeds work
- [ ] Google Maps embeds work
- [ ] Vimeo embeds work
- [ ] Social media widgets (Twitter, Instagram, TikTok)
- [ ] Payment forms (Stripe, PayPal)
- [ ] Live chat widgets
- [ ] Custom HTML with iframe works
- [ ] Plugin-created iframe works in both modes
- [ ] Classic mode shows no security warnings
- [ ] Sandboxed mode shows permission requests
- [ ] Switching between modes doesn't break content
- [ ] Cross-origin requests work (CORS)
- [ ] File uploads in iframe work
- [ ] localStorage works in classic iframe
- [ ] Multiple nested iframe levels work
- [ ] Mobile responsiveness maintained
- [ ] No console errors in DevTools
- [ ] Performance is acceptable (<2s load time)

---

## Common Issues & Troubleshooting

### Issue: "iframe X-Frame-Options: DENY"
**Solution:** This is a security feature. Some sites don't allow embedding. Use proxy or iframe-unblocker tools.

### Issue: "Mixed content: https from http iframe"
**Solution:** Ensure iframe src is HTTPS if main page is HTTPS.

### Issue: "Sandbox token error"
**Solution:** Make sure SandboxPanel permissions match iframe requirements.

### Issue: "iframe not loading"
**Solution:** 
1. Check CORS headers
2. Verify URL is accessible
3. Check CSP policy
4. Try classic mode vs sandboxed

---

**Remember:** ZENO Browser should work like Chrome for iframe content – minimal friction, maximum compatibility! 🚀