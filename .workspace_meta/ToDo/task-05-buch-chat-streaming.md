# TASK-05 — BUCH_CHAT: streaming odpowiedzi (SSE)
> **Agent:** `expert-react-frontend-engineer` | **Priorytet:** 🟠 | **Status:** TODO

## Problem
Obecna implementacja BUCH_CHAT (`AssistantPage.tsx`, `BuchChatWidget.tsx`)
czeka na **całą odpowiedź** przed wyświetleniem.
Dla długich odpowiedzi DeepSeek R1 / Claude → 5-20 sekund czekania bez feedbacku.

## Cel
Streaming odpowiedzi przez SSE (Server-Sent Events) lub chunked transfer.
Tekst pojawia się token po tokenie — jak w ChatGPT / Claude.ai.

## Backend — sprawdzić czy /api/ai/chat wspiera streaming

Sprawdź kod Cloudflare Worker `/api/ai/chat`:
```
U:\WWW_Zen_BRo_wser_org3\workers\ lub services/
```
Jeśli nie wspiera → dodaj endpoint `/api/ai/chat/stream` z:
```typescript
// Cloudflare Worker — streaming response
return new Response(
  new ReadableStream({
    async start(controller) {
      // stream tokeny przez SSE
      controller.enqueue(`data: ${JSON.stringify({ token: "..." })}\n\n`);
      controller.close();
    }
  }),
  { headers: { 'Content-Type': 'text/event-stream' } }
);
```

## Frontend — AssistantPage.tsx

### Obecny kod (czeka na całość):
```tsx
const res = await fetch('/api/ai/chat', { method: 'POST', ... });
const data = await res.json();
// → wyświetla dopiero po zakończeniu
```

### Nowy kod (streaming):
```tsx
const res = await fetch('/api/ai/chat/stream', { method: 'POST', ... });
const reader = res.body!.getReader();
const decoder = new TextDecoder();

// Dodaj pusty message asystenta
const assistantMsgId = uid();
setSessions(prev => prev.map(s => s.id === sessionId
  ? { ...s, messages: [...s.messages, { id: assistantMsgId, role: 'assistant', text: '', ... }] }
  : s
));

// Czytaj chunki
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parsuj SSE: "data: {...}\n\n"
  const token = parseSSEChunk(chunk);
  setSessions(prev => prev.map(s => s.id === sessionId
    ? { ...s, messages: s.messages.map(m =>
        m.id === assistantMsgId ? { ...m, text: m.text + token } : m
      )}
    : s
  ));
}
```

### Wskaźnik "typing"
- Podczas streamingu: `▋` migający kursor na końcu tekstu (CSS animation)
- `ba-typing` klasa CSS już istnieje w `src/styles/web-landing.css`

## Pliki do edycji
1. `src/components/assistant/AssistantPage.tsx` — sendMessage()
2. `src/components/assistant/BuchChatWidget.tsx` — sendMessage()
3. Cloudflare Worker `/api/ai/chat` — dodać `/stream` endpoint
4. `src/styles/web-landing.css` — upewnić się że `.ba-typing` animation działa

## Fallback
Jeśli SSE nie działa (błąd, brak wsparcia) → fallback do obecnego fetch().
```tsx
try {
  await streamingFetch(...);
} catch {
  await regularFetch(...); // fallback
}
```

## Priorytet providerów
- **Workers AI** — wspiera streaming natively (Cloudflare AI SDK)
- **DeepSeek** — wspiera SSE
- **OpenRouter** — wspiera SSE (`stream: true`)
- **Anthropic** — wspiera SSE (`stream: true`)
