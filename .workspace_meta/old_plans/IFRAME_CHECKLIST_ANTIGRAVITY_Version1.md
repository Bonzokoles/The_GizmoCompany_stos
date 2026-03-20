# ✅ IFRAME Support - Antigravity Implementation Checklist

## Pre-Implementation

- [ ] Review `IFRAME_COMPATIBILITY_GUIDE.md`
- [ ] Understand dual-mode architecture (classic vs sandboxed)
- [ ] Check existing code for iframe handling
- [ ] Plan integration with existing WebView setup

## Implementation Tasks

### Phase 1: WebView Manager
- [ ] Create `src-electron/services/webview-manager.ts`
- [ ] Implement `createWebView()` with full iframe support
- [ ] Setup iframe event handlers
- [ ] Handle window.open() from iframe (target="_blank")
- [ ] Test basic web page loading

### Phase 2: React Components
- [ ] Create `src/components/WebViewRenderer.tsx`
- [ ] Create `src/components/DualModeIframe.tsx`
- [ ] Create toggle between classic/sandbox modes
- [ ] Add UI for mode selection
- [ ] Add mode indicator in header

### Phase 3: Plugin API
- [ ] Update `src/plugin-system/core/plugin-api.ts`
- [ ] Add `createIframe()` method
- [ ] Add `postMessageToIframe()` method
- [ ] Add `getActiveIframes()` method
- [ ] Document iframe API for plugin developers

### Phase 4: Security & Headers
- [ ] Setup CSP headers in `src-electron/main.ts`
- [ ] Allow `frame-src` for iframe loading
- [ ] Allow `connect-src` for API calls
- [ ] Test security policy doesn't block content

### Phase 5: Testing
- [ ] Unit tests for DualModeIframe
- [ ] Integration tests for WebView + iframe
- [ ] Plugin iframe tests
- [ ] Security headers verification tests

## Testing Matrix

### Classic Mode Tests
- [ ] YouTube embed (`.youtube.com/embed/`)
- [ ] SoundCloud embed (`.soundcloud.com/player`)
- [ ] Twitch embed (`.twitch.tv/embed/`)
- [ ] Google Maps (`.google.com/maps/embed`)
- [ ] Vimeo embed (`.vimeo.com/`)
- [ ] Twitter widget (`.twitter.com/`)
- [ ] Custom HTML with `<iframe>`
- [ ] Plugin-generated iframe

### Sandboxed Mode Tests
- [ ] Sandbox permissions work
- [ ] Permission requests show to user
- [ ] Audit logs track actions
- [ ] Resource limits applied
- [ ] Can toggle to classic mode

### Cross-Functional Tests
- [ ] Switching modes doesn't break content
- [ ] Multiple iframes on same page
- [ ] Nested iframes (iframe in iframe)
- [ ] Mobile responsiveness
- [ ] DevTools shows iframe details
- [ ] No performance degradation

## Real-World Test Cases

```html
<!-- Test Case 1: YouTube -->
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
></iframe>

<!-- Test Case 2: Google Maps -->
<iframe 
  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d..." 
  width="600" 
  height="450" 
  style="border:0;" 
  allowFullScreen="" 
  loading="lazy" 
  referrerPolicy="no-referrer-when-downgrade">
</iframe>

<!-- Test Case 3: SoundCloud -->
<iframe 
  width="100%" 
  height="300" 
  scrolling="no" 
  frameborder="no" 
  allow="autoplay" 
  src="https://w.soundcloud.com/player/?url=https://soundcloud.com/...">
</iframe>

<!-- Test Case 4: Custom Widget -->
<iframe 
  src="http://localhost:3000/widget" 
  width="100%" 
  height="500" 
  sandbox="allow-scripts allow-same-origin">
</iframe>
```

## Documentation Updates

- [ ] Add IFRAME section to README.md
- [ ] Create plugin developer guide for iframe
- [ ] Document permissions system
- [ ] Add troubleshooting section
- [ ] Create API documentation
- [ ] Add code examples

## Deployment Validation

Before merging to main:

- [ ] All tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] No security warnings
- [ ] Performance acceptable
- [ ] Mobile testing complete
- [ ] Cross-browser testing (on target platforms)
- [ ] Code review passed
- [ ] Documentation reviewed

## Known Limitations to Document

- [ ] Some sites don't allow embedding (X-Frame-Options)
- [ ] CORS policies may restrict access
- [ ] Mixed content (http/https) not allowed
- [ ] Some plugins may need explicit permissions
- [ ] Performance depends on iframe complexity

## Success Criteria

✅ **ZENO Browser iframe support is complete when:**

1. Classic iframe embeds work like Chrome/Firefox (no sandbox by default)
2. Users can toggle sandbox mode for untrusted content
3. Plugins can create both classic and sandboxed iframes
4. All popular embed types work (YouTube, Maps, SoundCloud, etc.)
5. Permission system works correctly
6. Audit logging tracks iframe activities
7. No security vulnerabilities introduced
8. Performance is acceptable
9. Mobile support is maintained
10. Documentation is complete

---

## Resources for Antigravity

- MDN: [HTML iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- MDN: [Sandbox attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- MDN: [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- Electron: [Web preferences](https://www.electronjs.org/docs/api/web-preferences)
- [CSP Sandbox](https://csp.withgoogle.com/)

---

**Final Note:** This feature is CRITICAL for user experience. Don't let sandboxing break normal iframe functionality. Default should be "just works", sandbox should be explicit opt-in. ✨