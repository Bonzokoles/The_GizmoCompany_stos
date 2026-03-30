# 🎨 UI & SANDBOX INTEGRATION - Developer Prompt

## Mission Statement

> **Modernize ZENO Browser UI with React/TypeScript while maintaining and enhancing security through sandboxed iframes. Replace traditional iframe implementation with permission-based sandbox system.**

---

## Key Objectives

### 1. UI Modernization
- ✅ Build responsive, modern React components
- ✅ Implement dark/light theme system
- ✅ Create floating panel architecture for tools
- ✅ Add smooth animations and transitions
- ✅ Support mobile-first responsive design
- ✅ Maintain accessibility (a11y) standards

### 2. Sandbox Implementation
- ✅ Replace old iframes with `<SandboxPanel>` component
- ✅ Implement permission-based access control
- ✅ Add audit logging for all sandbox activities
- ✅ Ensure secure communication (postMessage with origin checking)
- ✅ Implement resource limits (memory, CPU, network)
- ✅ Create security monitor UI for audit visualization

### 3. Plugin Integration
- ✅ Sandbox all plugins by default
- ✅ Request permissions on plugin install
- ✅ Show permission requests to user
- ✅ Maintain audit trail of plugin activities

---

## Component Development Guide

### Phase 1: Core UI Components

```
Create these components in src/components/:

1. Layout System
   - BrowserLayout.tsx (main container)
   - HeaderBar.tsx
   - TabBar.tsx
   - FooterBar.tsx

2. Navigation & Address
   - AddressBar.tsx
   - NavigationButtons.tsx
   - SearchSuggestions.tsx

3. Content Area
   - WebViewContainer.tsx
   - TabContent.tsx
   - SplitView.tsx (for side panels)

4. Floating Panels (Draggable)
   - FloatingPanel.tsx (base component)
   - AIAssistantPanel.tsx
   - PluginManagerPanel.tsx
   - SecurityMonitorPanel.tsx
   - NetworkInspectorPanel.tsx
   - SettingsPanel.tsx
   - DebugPanel.tsx

5. Sandbox Components
   - SandboxPanel.tsx (wrapper)
   - PermissionRequest.tsx
   - PermissionBadge.tsx
   - AuditLogViewer.tsx

6. UI Elements
   - Button.tsx
   - Input.tsx
   - Modal.tsx
   - Toast.tsx
   - Badge.tsx
   - Icon.tsx

7. Theme System
   - ThemeProvider.tsx
   - useTheme.ts (hook)
   - themes/dark.ts
   - themes/light.ts
```

### Phase 2: Component Implementation

```typescript
// Template: src/components/[ComponentName].tsx

import React, { useState, useEffect } from 'react';
import './[ComponentName].css';

interface [ComponentName]Props {
  // Props here
}

/**
 * [ComponentName] Component
 * 
 * Description of what this component does
 * 
 * @example
 * <[ComponentName] prop1="value" />
 */
export const [ComponentName]: React.FC<[ComponentName]Props> = (props) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div className="[component-name]">
      {/* JSX */}
    </div>
  );
};
```

### Phase 3: Styling Guidelines

```css
/* src/styles/[component].css */

/* Use CSS Variables for consistency */
:root {
  --primary: #00d4ff;
  --secondary: #00ff88;
  --bg-primary: #0f0f1e;
  --bg-secondary: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --border-radius: 8px;
  --shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
  --transition: all 0.3s ease;
}

/* BEM Naming Convention */
.component-name {
  /* styles */
}

.component-name__element {
  /* element styles */
}

.component-name__element--modifier {
  /* modifier styles */
}

/* Dark Mode Support */
[data-theme="dark"] .component-name {
  /* dark styles */
}

[data-theme="light"] .component-name {
  /* light styles */
}

/* Responsive */
@media (max-width: 768px) {
  .component-name {
    /* mobile styles */
  }
}

@media (prefers-reduced-motion: reduce) {
  .component-name {
    animation: none;
    transition: none;
  }
}
```

---

## Sandbox Architecture Details

### Sandbox Lifecycle

```
1. CREATION
   - User opens plugin/tool
   - SandboxPanel mounts
   - Request permissions from user
   - Create iframe with sandbox attrs
   - Set up postMessage listener

2. COMMUNICATION
   - Plugin sends message: postMessage({ action: 'getData' })
   - Parent checks permissions
   - If allowed: execute, if denied: log & notify
   - Send response back

3. MONITORING
   - Audit all actions
   - Log network requests
   - Track resource usage
   - Show in Security Monitor

4. DESTRUCTION
   - User closes panel
   - Unload iframe
   - Clear listeners
   - Cleanup memory
   - Log final audit entry
```

### Permission System

```typescript
// Permission Request Flow
export interface PermissionRequest {
  panelId: string;
  permissions: string[];
  reason?: string;
}

export interface PermissionGrant {
  panelId: string;
  permissions: Map<string, boolean>;
  grantedAt: Date;
  expiresAt?: Date; // Optional expiration
}

// User sees:
// "My Plugin" requests:
// ☐ Network Access    - "to fetch API data"
// ☐ Storage Access    - "to save preferences"
// ☐ Clipboard Access  - "to paste links"
// 
// [Deny] [Allow Once] [Allow Always]
```

### Message Protocol

```typescript
// Parent → Sandbox
{
  type: 'REQUEST',
  id: 'req-123',
  action: 'getNetworkData',
  params: { url: '...' }
}

// Sandbox → Parent
{
  type: 'RESPONSE',
  id: 'req-123',
  status: 'SUCCESS' | 'ERROR',
  data: { /* response */ }
}

// Audit Log Entry
{
  timestamp: '2026-03-14T10:30:00Z',
  panelId: 'my-plugin',
  action: 'NETWORK_REQUEST',
  url: 'https://api.example.com',
  status: 'ALLOWED',
  permission: 'network'
}
```

---

## Testing Strategy

### Unit Tests
```bash
npm run test -- SandboxPanel.test.tsx
npm run test -- AIAssistantPanel.test.tsx
```

### Integration Tests
```bash
npm run test:e2e -- sandbox-integration.spec.ts
npm run test:e2e -- iframe-communication.spec.ts
```

### Manual Testing Checklist
- [ ] Load plugin in sandbox
- [ ] Request and deny permissions
- [ ] Verify audit logs
- [ ] Test message communication
- [ ] Check performance (memory, CPU)
- [ ] Test on mobile viewport
- [ ] Test theme switching
- [ ] Test with multiple sandboxes
- [ ] Test error handling
- [ ] Test permission expiration

---

## Performance Optimization

### Memory Management
```typescript
// Lazy load panels
const AIAssistantPanel = lazy(() => import('./AIAssistantPanel'));

// Virtualize lists in audit logs
<VirtualList height={400} itemCount={logs.length} itemSize={35}>
  {AuditLogRow}
</VirtualList>

// Cleanup on unmount
useEffect(() => {
  return () => {
    // Clean up listeners
    // Clear timers
    // Dispose iframe
  };
}, []);
```

### Network Optimization
```typescript
// Cache permission decisions
const permissionCache = new Map<string, PermissionGrant>();

// Batch API calls
const batchedRequests = debounce(sendRequests, 500);

// Lazy load plugin code
const loadPlugin = async (pluginId) => {
  const plugin = await import(`./plugins/${pluginId}`);
  return plugin.default;
};
```

---

## Documentation Requirements

For each component, create:

```
src/components/
├── [ComponentName].tsx
├── [ComponentName].css
├── [ComponentName].test.tsx
├── [ComponentName].stories.tsx (Storybook)
└── [ComponentName].README.md
```

Example README:
```markdown
# AIAssistantPanel Component

## Purpose
Floating panel for AI assistant interaction

## Props
- `onClose: () => void` - Callback when panel closes
- `provider?: string` - AI provider (deepseek, openrouter, etc)

## Usage
<AIAssistantPanel provider="deepseek" />

## Sandbox Permissions
- network: true (to call AI APIs)
- storage: true (to save conversation history)

## Events
- `onMessage` - AI response received
- `onError` - Error occurred

## Accessibility
- Keyboard navigation: Tab, Shift+Tab
- Focus management
- ARIA labels
```

---

## Deployment & CI/CD

### Pre-commit Checks
```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run format        # Prettier
npm run test:unit     # Jest
```

### Pre-push Checks
```bash
npm run build         # Full build
npm run test          # All tests
npm run test:e2e      # E2E tests
```

### GitHub Actions
- Automated testing on PR
- Build artifacts uploaded
- Documentation preview deployed
- Performance benchmarks

---

## Commit Message Convention

```
feat(ui): Add floating panel system
- Draggable panels
- Multi-panel support
- Theme-aware styling

feat(sandbox): Implement permission system
- Permission requests
- Audit logging
- Security monitor

fix(sandbox): Fix postMessage origin validation
- Verify origin before processing messages
- Add CSP headers

docs(ui): Add component documentation
- Storybook stories
- README files
- API docs
```

---

## Success Metrics

- ✅ Zero sandbox security issues
- ✅ <100ms panel open time
- ✅ <2MB memory per panel
- ✅ 95% accessibility score
- ✅ Mobile responsiveness
- ✅ 100% test coverage for sandbox
- ✅ Full audit trail capability
- ✅ Smooth animations (60fps)

---

## Resources & References

- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Web Security](https://owasp.org/www-project-top-ten/)
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [Accessibility (a11y)](https://www.a11y-project.org/)

---

**Good luck with the implementation! 🚀**