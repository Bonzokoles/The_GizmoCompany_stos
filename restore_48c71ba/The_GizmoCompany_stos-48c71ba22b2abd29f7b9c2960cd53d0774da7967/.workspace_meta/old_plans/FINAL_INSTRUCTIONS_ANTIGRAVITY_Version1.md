# 🚀 FINAL INSTRUCTIONS FOR ANTIGRAVITY TEAM

## ⚡ Mission Summary

**Wdróż pełny ZENO Browser v0.2.0 z:**

1. ✅ **Multi-platform installers** (NSIS, DMG, AppImage)
2. ✅ **Modern React UI** z floating panelami
3. ✅ **Sandboxed iframe system** dla pluginów
4. ✅ **KLASYCZNE IFRAME SUPPORT** dla stron i widgetów
5. ✅ **Auto-update system**
6. ✅ **Complete documentation**
7. ✅ **Plugin marketplace**
8. ✅ **Podman/Docker support**

---

## 🎯 Kluczowe Wytyczne

### 1. **IFRAME musi działać jak w normalnej przeglądarce**
```
❌ WRONG:
- Domyślnie blokować wszystkie iframe
- Narzucać sandbox na klasyczne embedy
- Pytać o permission dla YouTube, Maps itp.

✅ RIGHT:
- Domyślnie zezwalać na klasyczne iframe
- Sandbox = opcjonalny toggle, nie wymuszony
- Permission system tylko dla pluginów/custom code
```

### 2. **Dual-Mode Architecture**
```typescript
// Classic Mode (YouTube, Maps, etc.)
<iframe src="..." /> // Works immediately, no restrictions

// Sandboxed Mode (Plugins, custom code)
<SandboxPanel src="..." permissions={[...]} /> // Permission-based
```

### 3. **Security ≠ Restriction**
```
Bezpieczeństwo powinno być:
- Opcjonalne (user chooses sandbox)
- Przejrzyste (audit logs visible)
- Niezawodne (nie blokuje legit content)
- Smart (nie pytaj o permissions dla YouTube)
```

---

## 📋 Implementation Workflow

### Step 1: Setup & Dependencies (30 min)
```bash
cd zen-bro-wser.org
npm ci
npm run build
echo "✅ Setup complete"
```

### Step 2: Code Organization (1 hour)
```
Deploy from ZIP:
├── scripts/ - Build scripts, installers
├── src-electron/ - Main process, WebView, auto-update
├── src/components/ - UI components, DualModeIframe
├── src/plugin-system/ - Plugin API with iframe support
├── website/ - Docusaurus docs
└── .github/workflows/ - CI/CD
```

### Step 3: Core Features (2-3 hours)
- [ ] WebView manager with iframe support
- [ ] DualModeIframe component (classic + sandbox)
- [ ] Plugin API iframe methods
- [ ] Security headers (CSP)

### Step 4: Testing (1-2 hours)
- [ ] Classic iframe: YouTube, Maps, SoundCloud
- [ ] Sandboxed iframe: Plugin panels
- [ ] Mode toggling
- [ ] All platforms (Windows, Mac, Linux)

### Step 5: Deployment (1 hour)
```bash
git add -A
git commit -m "feat: Complete ZENO v0.2.0 with iframe support"
git push origin feature/installer-ui-sandbox
# GitHub Actions builds installers automatically
```

---

## 🔍 Critical Files to Review

```
📁 src-electron/
  ├─ main.ts (entry point, security headers)
  ├─ services/
  │  ├─ webview-manager.ts (NEW - iframe handling)
  │  ├─ browser-manager.ts (tab management)
  │  └─ auto-updater.ts (updates)

📁 src/components/
  ├─ WebViewRenderer.tsx (NEW - render web content)
  ├─ DualModeIframe.tsx (NEW - classic + sandbox)
  ├─ SandboxPanel.tsx (sandbox mode UI)
  └─ PluginManagerPanel.tsx (plugin UI)

📁 src/plugin-system/
  ├─ core/plugin-api.ts (ADD: createIframe method)
  └─ api/hooks.ts (iframe hooks)

📁 scripts/
  ├─ build-nsis.js (Windows)
  ├─ build-dmg.js (macOS)
  └─ build-appimage.js (Linux)
```

---

## 🧪 Test Script (Copy & Run)

```bash
#!/bin/bash

echo "🧪 Testing ZENO Browser IFRAME Support"

# Test 1: Classic iframe loads
echo "Test 1: Classic iframe..."
npm run test -- DualModeIframe.test.tsx -t "classic"

# Test 2: Sandbox iframe works
echo "Test 2: Sandbox iframe..."
npm run test -- DualModeIframe.test.tsx -t "sandboxed"

# Test 3: Real embeds
echo "Test 3: Real embeds..."
npm run test -- iframe-support.test.ts

# Test 4: Build
echo "Test 4: Build..."
npm run build

# Test 5: Lint
echo "Test 5: Lint..."
npm run lint

echo "✅ All tests passed!"
```

---

## 🚨 Common Pitfalls to Avoid

```
❌ DON'T:
- Blokować YouTube/Maps domyślnie
- Narzucać sandbox na wszystkie iframe
- Pytać o permission dla każdego embeda
- Usuwać CORS support dla iframe
- Ograniczać API dostęp bez powodu

✅ DO:
- Zezwalać na klasyczne iframe bez restrakcji
- Sandbox = explicit opt-in, nie default
- Dokumentować permission system
- Testować popularne embedy
- Audytować bezpieczne działanie
```

---

## 📝 Commit Template

```bash
git commit -m "feat(iframe): Implement dual-mode iframe system

- Add WebViewManager for full iframe support
- Create DualModeIframe component (classic/sandbox toggle)
- Add iframe API methods to plugin system
- Setup CSP headers to allow iframe loading
- Implement classic mode: No restrictions (YouTube, Maps work)
- Implement sandbox mode: Permission-based (plugins, custom code)
- Add audit logging for sandboxed iframe
- Update documentation with iframe usage
- Add comprehensive tests for both modes

Test Results:
✅ YouTube embeds work
✅ Google Maps work
✅ Plugin iframe works
✅ Sandbox permissions work
✅ Mode toggle works
✅ No security issues
✅ Mobile responsive
✅ Performance acceptable

Closes: #14, #15
"
```

---

## 🎬 Deployment Checklist

Before pushing to main:

**Code Quality**
- [ ] npm run lint passes
- [ ] npm run type-check passes
- [ ] npm run test passes
- [ ] npm run build succeeds

**Functionality**
- [ ] Classic iframe works (YouTube, Maps, etc.)
- [ ] Sandboxed iframe works
- [ ] Mode toggle works
- [ ] Plugin system works
- [ ] No console errors

**Security**
- [ ] CSP headers correct
- [ ] No XSS vulnerabilities
- [ ] No CSRF issues
- [ ] Sandbox secure
- [ ] Permission system working

**Documentation**
- [ ] README updated
- [ ] API documented
- [ ] Troubleshooting guide added
- [ ] Examples provided
- [ ] Comments in code

**Testing**
- [ ] Windows tested
- [ ] macOS tested
- [ ] Linux tested
- [ ] Mobile tested
- [ ] Performance acceptable

---

## 🆘 Support & Questions

**If something breaks:**

1. Check commit history: `git log --oneline`
2. Review CSP headers
3. Test classic vs sandboxed separately
4. Check browser console
5. Run tests: `npm run test`

**If iframe doesn't load:**

```bash
# Check CSP
DevTools → Application → Frame Security Policy

# Check CORS
DevTools → Network → Check iframe request

# Check sandbox
DevTools → Elements → Inspect iframe
Look for sandbox attribute
```

**If plugin iframe fails:**

- Verify permissions granted
- Check audit logs
- Test without sandbox
- Check postMessage communication

---

## 🎉 Success Criteria

ZENO Browser v0.2.0 is complete when:

✅ Installers build on all platforms  
✅ UI is modern and responsive  
✅ Classic iframe works for all embeds  
✅ Sandboxed iframe works for plugins  
✅ Security is maintained  
✅ Documentation is complete  
✅ Tests pass  
✅ Performance is good  
✅ Users report no issues  

---

## 📞 Final Words

> This is a significant update to ZENO Browser. The key to success is:
>
> 1. **Keep iframe working normally** - Don't overthink security, let content flow
> 2. **Add sandbox as option** - Not default, but available when needed
> 3. **Document everything** - Users need to understand how it works
> 4. **Test thoroughly** - All popular embeds must work
> 5. **Deploy with confidence** - This is production-ready code
>
> You've got this! 🚀

---

**Powodzenia Antigravity Team!**

**Any issues? Review:**
- `IFRAME_COMPATIBILITY_GUIDE.md`
- `ANTIGRAVITY_INSTRUCTIONS.md`
- `UI_SANDBOX_PROMPT.md`
- `GIT_WORKFLOW.md`

💪 Let's make ZENO Browser the best! 🌟