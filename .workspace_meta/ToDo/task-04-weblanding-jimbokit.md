# TASK-04 — WebLanding: dodać JimboKitPanel z działającym terminalem
> **Agent:** `debug` | **Priorytet:** 🟠 | **Status:** TODO

## Problem
`JimboKitPanel` istnieje tylko w Electron (`BrowserUI.tsx`).
W `WebLanding.tsx` nie ma żadnej referencji do JimboKit.
Terminal (`/navigate`, `/search`, `/fetch` itd.) nie działa w web version,
bo callbacki `onNavigate`, `onNewTab` itd. nigdy nie są przekazywane.

## Diagnoza

### BrowserUI.tsx (Electron) — ma JimboKitPanel z callbackami:
```tsx
<JimboKitPanel
  onNavigate={(url) => browserManager.navigate(activeTabId, url)}
  onNewTab={() => browserManager.newTab()}
  onBack={() => browserManager.back(activeTabId)}
  onForward={() => browserManager.forward(activeTabId)}
  onReload={() => browserManager.reload(activeTabId)}
  currentUrl={currentTab?.url}
/>
```

### WebLanding.tsx (Web) — brak JimboKitPanel w ogóle

### useJimboKitStore.ts:363 — fallback gdy brak WS:
```ts
// Fallback to direct AI Gate (no streaming, but functional)
const response = await sendViaAiGate(text, sessionRef.current);
```
→ chat działa bez serwera przez `/api/ai/chat` ✅

### Terminal — komendy które mogą działać w web:
| Komenda | Web możliwe? | Jak |
|---------|-------------|-----|
| `/help` | ✅ | statyczny tekst |
| `/url` | ✅ | `window.location.href` |
| `/search <query>` | ✅ | `window.open(google)` |
| `/navigate <url>` | ✅ | `window.open(url)` |
| `/fetch <url>` | ❌ | wymaga backendu `/api/webgate/fetch` (Electron only) |
| `/newtab` | ✅ | `window.open()` |
| `/reload` | ✅ | `window.location.reload()` |

## Fix

### 1. Dodaj JimboKitPanel do WebLanding.tsx
```tsx
import { JimboKitPanel } from '../assistant/JimboKitPanel';

// W JSX — floating panel (podobnie jak BuchChatWidget):
{showJimboKit && (
  <JimboKitPanel
    floating
    onClose={() => setShowJimboKit(false)}
    onNavigate={(url) => window.open(url, '_blank')}
    onNewTab={() => window.open('about:blank', '_blank')}
    onReload={() => window.location.reload()}
    currentUrl={window.location.href}
  />
)}
<button onClick={() => setShowJimboKit(v => !v)}>
  ⌨ Jimbo_kit
</button>
```

### 2. Napraw /fetch w web version
`/api/webgate/fetch` istnieje tylko w Electron (`copilot-runtime-server.ts:95`).
W web version → dodaj endpoint do Cloudflare Worker który proxy'uje URL.
Lub zmień fallback w terminalu: gdy `/fetch` i brak backendu → `window.open(url)`.

### 3. useJimboKitStore — WebSocket fallback
`ws://127.0.0.1:4111/ws` — to jest lokalny serwer, nie istnieje w web.
WebSocket error jest cicho ignorowany, fallback REST działa ✅.
Ale `/api/chat` na porcie 4111 też nie istnieje — sprawdzić `apiPost()`.
