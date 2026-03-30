# 🎯 ANTIGRAVITY TEAM - Complete Instructions

## 📦 PHASE 1: Code Deployment & Setup

### Step 1: Extract & Organize
```bash

# 1. Sprawdź strukturę
ls -la
tree scripts/ website/ src-electron/ .github/

# 3. Skopiuj pliki do odpowiednich folderów
cp -r scripts/* zen-bro-wser.org/scripts/
cp -r website/* zen-bro-wser.org/website/
cp -r src-electron/* zen-bro-wser.org/src-electron/
cp -r .github/* zen-bro-wser.org/.github/
```

### Step 2: Environment Setup
```bash
cd zen-bro-wser.org

# Utwórz .env.local (jeśli nie istnieje)
cat > .env.local << EOF
# Required
DEEPSEEK_API_KEY=sk-your-key
OPENROUTER_API_KEY=sk-or-your-key
EDENAI_API_KEY=ed-your-key

# Cloudflare
CF_TUNNEL_TOKEN=eyJh...
CF_ACCOUNT_ID=your-account-id

# Optional (Windows/Mac code signing)
WIN_CERT_FILE=/path/to/cert.pfx
WIN_CERT_PASSWORD=password
APPLE_ID=your@apple.com
APPLE_ID_PASSWORD=password

# GitHub Release
GITHUB_TOKEN=ghp_your_token
EOF

chmod 600 .env.local
```

### Step 3: Dependencies & Build
```bash
# Install
npm ci

# Type check
npm run type-check

# Lint
npm run lint:fix

# Build
npm run build

# Test
npm run test:unit --passWithNoTests
```

### Step 4: Version Control
```bash
# Create feature branch
git checkout -b feature/installer-ui-sandbox

# Stage all new files
git add -A

# Commit with descriptive message
git commit -m "feat(full): Implement KROK 8-10, UI improvements, and sandboxed iframes

- [installer] Add NSIS (Windows), DMG (macOS), AppImage (Linux)
- [deploy] Setup GitHub Actions for auto-build & release
- [auto-update] Implement delta updates with electron-updater
- [docs] Add Docusaurus website with guides & API reference
- [UI] Redesign with modern components and theme support
- [sandbox] Replace traditional iframes with sandboxed panels
- [plugin] Full plugin system with marketplace integration
- [podman] Add Podman support alongside Docker
- [security] Enhanced context isolation and audit logging

Closes: #11, #12, #13"

# Push to remote
git push origin feature/installer-ui-sandbox
```

### Step 5: Create Pull Request
```bash
# Create PR via GitHub CLI
gh pr create \
  --title "feat: Complete ZENO Browser v0.2.0 - Installers, Docs, Sandbox UI" \
  --body "## Summary
  
Complete implementation of KROK 8-10 with UI improvements and sandboxed iframes.

## Changes
- ✅ Multi-platform installers
- ✅ CI/CD automation
- ✅ Auto-update system
- ✅ Complete documentation
- ✅ Modern UI with React components
- ✅ Sandboxed iframe integration
- ✅ Plugin system
- ✅ Podman/Docker support

## Testing
- [ ] Windows installer tested
- [ ] macOS DMG tested
- [ ] Linux AppImage tested
- [ ] UI responsive on desktop & mobile
- [ ] Sandboxed iframes secure
- [ ] Auto-update working
- [ ] Docs build successful
" \
  --base main
```

### Step 6: CI/CD Pipeline
```bash
# Trigger GitHub Actions (automatic on push)
# Monitor: https://github.com/Bonzokoles/zen-bro-wser.org/actions

# After merge to main:
# - Tests run
# - Build creates installers
# - Docs deploy to Netlify
# - Release created with auto-upload
```

---

## 🎨 PHASE 2: UI Improvements & Modern Design

### Architecture Overview

```
ZENO Browser v0.2.0 UI Architecture
│
├─ Main Window (Electron)
│  ├─ Header Bar
│  │  ├─ Navigation (back/forward/reload)
│  │  ├─ Address Bar
│  │  └─ Quick Actions (menu, notifications)
│  │
│  ├─ Tab Bar
│  │  ├─ Tab Manager
│  │  └─ New Tab Button
│  │
│  ├─ Content Area
│  │  ├─ Web View (sandboxed rendering)
│  │  └─ Floating Panels
│  │     ├─ AI Assistant
│  │     ├─ Plugin Manager
│  │     ├─ Security Monitor
│  │     ├─ Network Inspector
│  │     └─ Settings Panel
│  │
│  └─ Footer Bar
│     ├─ Status Indicators
│     └─ Security Status
```

### Component Structure

```typescript
// File: src/components/Layout.tsx
export const BrowserLayout: React.FC = () => {
  return (
    <div className="browser-container">
      <HeaderBar />
      <TabBar />
      <main className="browser-content">
        <WebViewContainer />
        <FloatingPanelsContainer>
          <AIAssistantPanel />
          <PluginManagerPanel />
          <SecurityMonitorPanel />
          <NetworkInspectorPanel />
        </FloatingPanelsContainer>
      </main>
      <FooterBar />
    </div>
  );
};
```

### Styling & Theme

```css
/* CSS Variables for Theme Support */
:root {
  --color-primary: #00d4ff;
  --color-secondary: #00ff88;
  --color-background: #0f0f1e;
  --color-surface: #1a1a2e;
  --color-text: #ffffff;
  --color-error: #ff4d4d;
  --radius: 8px;
  --shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
}

/* Dark Mode (Default) */
[data-theme="dark"] {
  --color-background: #0f0f1e;
  --color-surface: #1a1a2e;
  --color-text: #ffffff;
}

/* Light Mode */
[data-theme="light"] {
  --color-background: #ffffff;
  --color-surface: #f5f5f5;
  --color-text: #000000;
}

/* Responsive */
@media (max-width: 768px) {
  .browser-container {
    flex-direction: column;
  }
  
  .floating-panels {
    position: fixed;
    bottom: 0;
    width: 100%;
    height: 50vh;
  }
}
```

### Key Components to Update

1. **HeaderBar.tsx** - Navigation & search
2. **TabBar.tsx** - Tab management with drag-drop
3. **AddressBar.tsx** - URL input with suggestions
4. **WebViewContainer.tsx** - Main rendering area
5. **AIAssistantPanel.tsx** - Floating AI panel
6. **PluginManagerPanel.tsx** - Plugin discovery & install
7. **SecurityMonitorPanel.tsx** - Audit logs & status
8. **NetworkInspectorPanel.tsx** - Network requests
9. **SettingsPanel.tsx** - User preferences

---

## 🔒 PHASE 3: Sandboxed IFRAME Integration

### New Sandbox Architecture

```
Traditional IFRAME → Sandboxed Panel System
     |
     ├─ Old: <iframe src="https://example.com" />
     │  ❌ Limited control
     │  ❌ No permission system
     │  ❌ No audit logging
     │
     └─ New: <SandboxPanel>
        ✅ Full permission control
        ✅ Audit logging
        ✅ Resource limits
        ✅ Communication bridge
```

### Implementation

```typescript
// File: src/components/SandboxPanel.tsx

interface SandboxPermissions {
  network?: boolean;
  storage?: boolean;
  clipboard?: boolean;
  camera?: boolean;
  microphone?: boolean;
  geolocation?: boolean;
  payment?: boolean;
}

interface SandboxPanelProps {
  id: string;
  src: string;
  permissions?: SandboxPermissions;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  isolated?: boolean; // Full isolation mode
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({
  id,
  src,
  permissions = {},
  onMessage,
  onError,
  isolated = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Build sandbox attribute
  const buildSandboxAttr = (): string => {
    const attrs = ['allow-scripts'];
    
    if (permissions.network) attrs.push('allow-same-origin');
    if (!isolated) attrs.push('allow-popups');
    
    return attrs.join(' ');
  };

  // Build allow attribute
  const buildAllowAttr = (): string => {
    const allows = [];
    
    if (permissions.camera) allows.push('camera');
    if (permissions.microphone) allows.push('microphone');
    if (permissions.geolocation) allows.push('geolocation');
    if (permissions.payment) allows.push('payment');
    
    return allows.join('; ');
  };

  // Message communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== new URL(src).origin) return;
      
      onMessage?.(event.data);
      
      // Log to audit
      logAuditEvent({
        type: 'IFRAME_MESSAGE',
        panelId: id,
        data: event.data,
        timestamp: new Date(),
      });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, src, onMessage]);

  return (
    <div className="sandbox-panel" data-id={id}>
      <div className="sandbox-header">
        <h3>{id}</h3>
        <div className="permissions-badge">
          {Object.entries(permissions)
            .filter(([_, enabled]) => enabled)
            .map(([perm]) => (
              <span key={perm} className="permission-pill">
                {perm}
              </span>
            ))}
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={src}
        sandbox={buildSandboxAttr()}
        allow={buildAllowAttr()}
        title={`Sandboxed Panel: ${id}`}
        className="sandbox-iframe"
        onLoad={() => setIsReady(true)}
        onError={(e) => onError?.(new Error(`Sandbox load failed: ${id}`))}
      />

      {!isReady && <div className="sandbox-loading">Loading...</div>}
    </div>
  );
};
```

### Usage Examples

```typescript
// Example 1: Simple Plugin Panel
<SandboxPanel
  id="my-plugin"
  src="https://plugins.zeno-browser.io/my-plugin/index.html"
  permissions={{ network: true, storage: true }}
  onMessage={(data) => console.log('Plugin message:', data)}
/>

// Example 2: Isolated Third-party Widget
<SandboxPanel
  id="third-party-widget"
  src="https://external.com/widget"
  permissions={{ network: true }}
  isolated={true}
/>

// Example 3: AI Assistant with Full Access
<SandboxPanel
  id="ai-assistant"
  src={`http://localhost:3000/ai-panel`}
  permissions={{
    network: true,
    storage: true,
    clipboard: true,
  }}
/>
```

### CSS for Sandboxed Panels

```css
.sandbox-panel {
  border: 2px solid var(--color-primary);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--color-surface);
  box-shadow: var(--shadow);
}

.sandbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-bottom: 1px solid var(--color-primary);
}

.sandbox-header h3 {
  margin: 0;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
}

.permissions-badge {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.permission-pill {
  background: rgba(0, 212, 255, 0.1);
  color: var(--color-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.sandbox-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.sandbox-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text);
  font-style: italic;
}

/* Floating Panels */
.floating-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 600px;
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow);
  z-index: 9000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(500px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .floating-panel {
    width: 90vw;
    height: 70vh;
    bottom: 10px;
    right: 10px;
  }
}
```

---

## 🔐 Security & Audit Logging

```typescript
// File: src/services/sandbox-auditor.ts

interface AuditLog {
  id: string;
  timestamp: Date;
  panelId: string;
  action: 'CREATED' | 'MESSAGE' | 'ERROR' | 'PERMISSION_DENIED';
  details: any;
  severity: 'INFO' | 'WARN' | 'ERROR';
}

export class SandboxAuditor {
  private logs: AuditLog[] = [];

  logAction(panelId: string, action: string, details: any) {
    const log: AuditLog = {
      id: generateId(),
      timestamp: new Date(),
      panelId,
      action: action as any,
      details,
      severity: 'INFO',
    };

    this.logs.push(log);
    console.log(`[AUDIT] ${panelId}: ${action}`, details);
  }

  logError(panelId: string, error: Error) {
    this.logAction(panelId, 'ERROR', { message: error.message });
  }

  logPermissionDenied(panelId: string, permission: string) {
    this.logAction(panelId, 'PERMISSION_DENIED', { permission });
  }

  getLogs(panelId?: string): AuditLog[] {
    if (!panelId) return this.logs;
    return this.logs.filter(log => log.panelId === panelId);
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'panelId', 'action', 'severity', 'details'];
    const rows = this.logs.map(log => [
      log.timestamp,
      log.panelId,
      log.action,
      log.severity,
      JSON.stringify(log.details),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const sandboxAuditor = new SandboxAuditor();
```

---

## ✅ Quality Checklist

- [ ] All files committed to feature branch
- [ ] npm run build completes without errors
- [ ] npm run test passes
- [ ] npm run lint passes
- [ ] UI looks good on desktop & mobile
- [ ] Sandboxed iframes work securely
- [ ] Auto-update tested on all platforms
- [ ] Documentation builds successfully
- [ ] CI/CD pipeline passes
- [ ] PR created with detailed description
- [ ] Code review completed
- [ ] Ready to merge to main

---

## 📚 Reference Docs

- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Sandbox Attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

---

**Powodzenia Antigravity Team! 🚀**

Wszystkie instrukcje, prompty i zasady powyżej. Jeśli coś nie jasne — pytak! 📝