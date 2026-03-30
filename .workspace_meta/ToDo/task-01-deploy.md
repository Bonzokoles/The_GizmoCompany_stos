# TASK-01 — Deploy dzisiejszych zmian na Cloudflare Pages
> **Agent:** `context-architect` | **Priorytet:** 🔴 PILNE | **Status:** TODO

## Problem
Wszystkie dzisiejsze zmiany (BUCH_CHAT rebranding, vchat fix, AssistantPage system prompt,
CopilotDevPanel UI, apps.js, INSTRUKCJA, scripts/) są tylko lokalnie.
Cloudflare Pages (`zenonbrowsers.org`) nadal serwuje starą wersję.

## Zmienione pliki do zdeploy'owania
```
src/components/assistant/AssistantPage.tsx      ← system prompt BUCH_CHAT
src/components/assistant/BuchChatWidget.tsx     ← (bez zmian, już OK)
src/components/assistant/JimboKitPanel.tsx      ← /clear fix
src/components/ai/CopilotDevPanel.tsx           ← error UI
src-electron/services/copilot-sdk-service.ts   ← error handling
ai-hub/js/modules/vchat.js                     ← CopilotKit → direct fetch
ai-hub/js/data/apps.js                         ← JIMBO Chat → BUCH_CHAT
ai-hub/index.html                              ← quick button BUCH_CHAT
```

## Kroki
1. `git add` wszystkich zmienionych plików
2. `git commit -m "feat: BUCH_CHAT fixes, vchat direct fetch, CopilotDevPanel error UI"`
3. `git push origin main`
4. Sprawdzić status GitHub Actions: `.github/workflows/deploy-web.yml`
5. Po deployu zweryfikować na zenonbrowsers.org:
   - vchat widget działa (POST /api/ai/chat)
   - quick button "◈ BUCH_CHAT" → otwiera zenonbrowsers.org/?tab=assistant
   - BUCH_CHAT AssistantPage ma nowy system prompt

## Weryfikacja
```bash
cd U:\WWW_Zen_BRo_wser_org3
git status
git diff --name-only HEAD
```
