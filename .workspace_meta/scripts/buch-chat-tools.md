# BUCH_CHAT — Co to jest i jak uzywac

> Zaktualizowano: 2026-03-30
> Kontekst: BUCH_CHAT zastapil CopilotKit jako glowny asystent AI w ZENO Browser

---

## Co to jest BUCH_CHAT

BUCH_CHAT to wbudowany asystent AI w ZENO Browser. Nazwa pochodzi od rebrandingu z 2026-03-30.
Rozni sie od poprzedniego systemu CopilotKit tym ze:
- Jest prostszy w konfiguracji (bezposrednie wywolania API)
- Dziala zarowno w wersji web jak i Electron
- Nie wymaga lokalnego serwera CopilotKit do podstawowej funkcjonalnosci

---

## Dostepne providery AI

### Providerzy przez /api/ai/chat (Cloudflare Worker — wersja web)

| Provider | Modele | Konfiguracja |
|----------|--------|-------------|
| DeepSeek | deepseek-chat, deepseek-reasoner | `DEEPSEEK_API_KEY` w CF Pages |
| OpenRouter | claude-3.5-sonnet, gpt-4o, mistral-large i 100+ innych | `OPENROUTER_API_KEY` w CF Pages |
| Anthropic | claude-3.5-sonnet, claude-3-haiku | `ANTHROPIC_API_KEY` w CF Pages |
| Workers AI | @cf/meta/llama-3.1-8b i inne | Binding `AI` w wrangler.toml |

### Providerzy lokalnie (wersja Electron, przez AI Gateway)

| Provider | Modele | Konfiguracja |
|----------|--------|-------------|
| DeepSeek | deepseek-chat | `DEEPSEEK_API_KEY` w `.env.local` |
| OpenRouter | (jw.) | `OPENROUTER_API_KEY` w `.env.local` |
| EdenAI | rozne modele | `EDENAI_API_KEY` w `.env.local` |

Failover kolejnosc: DeepSeek → OpenRouter → EdenAI.

---

## System Prompt

System prompt jest zdefiniowany w `AssistantPage.tsx`. Ustawia kontekst BUCH_CHAT:
- Rola asystenta w ekosystemie ZENO Browser
- Znajomosc powiazanych serwisow (bonzo-media-hub, moa.mybonzo.com)
- Jezyk odpowiedzi (PL/EN w zaleznosci od pytania)

Aby zmienic system prompt, edytuj `src/components/assistant/AssistantPage.tsx`.

---

## Jak uzywac — wersja web (zenonbrowsers.org)

1. Otworz zenonbrowsers.org
2. Kliknij ikone chatu w prawym dolnym rogu (BuchChatWidget — floating button)
3. LUB przejdz na `/assistant` (AssistantPage — pelny widok)

Wiadomosci sa wysylane do `/api/ai/chat` endpoint (Cloudflare Worker).
Brak historii miedzy sesjami — historia jest w pamieci przegladarki.

---

## Jak uzywac — wersja Electron (lokalna, pelna)

1. Uruchom `npm run dev`
2. W ZENO Browser kliknij ikone asystenta lub wybierz z menu
3. Pelna `AssistantPage.tsx` z dodatkowymi mozliwosciami

W wersji Electron asystent ma dostep do:
- Lokalnych zasobow przez IPC
- JimboKitPanel (CopilotKit Runtime na porcie 4111)
- Wiekszy kontekst systemowy

---

## JimboKit (tylko Electron) — osobny agent na porcie 4111

JimboKitPanel to osobny interfejs do komunikacji z CopilotKit Runtime:

**Gdzie:** `src/components/assistant/JimboKitPanel.tsx`
**Port:** 4111 (uruchamiany przez `src-electron/services/copilot-runtime-server.ts`)
**Protokol:** REST + WebSocket streaming

### Komendy terminala JimboKit

Dostepne przez `JimboKitTerminal.tsx`:

| Komenda | Opis |
|---------|------|
| `/navigate <url>` | Nawiguj w przegladarce |
| `/search <query>` | Wyszukaj w sieci |
| `/fetch <url>` | Pobierz tresc strony |
| `/screenshot` | Zrzut ekranu aktualnej strony |
| `/tabs` | Lista otwartych kart |

---

## Brak tool-use (dlaczego i co dalej)

### Dlaczego BUCH_CHAT nie ma tool-use

Obecna implementacja `/api/ai/chat` (Worker) wysyla proste tekstowe requesty do providerow.
Nie implementuje:
- Function calling / tool-use (OpenAI-style)
- Streaming z chunked response
- Persistentna historia (tylko last-N messages)

### Jak naprawic w przyszlosci

**Option A: Dodac tool-use do CF Worker**
```typescript
// /api/ai/chat Worker
const tools = [
  { name: "navigate", description: "Navigate browser to URL", ... },
  { name: "search", description: "Search the web", ... }
];
// Przekaz do OpenRouter/Anthropic z tools parameter
```

**Option B: Uzywac JimboKit (juz istnieje w Electron)**
JimboKitPanel + CopilotKit Runtime implementuje pelny tool-calling przez CopilotKit SDK.
Dziala tylko w wersji Electron na porcie 4111.

**Option C: Integracja z MCP Server (juz istnieje)**
MCP Server (port 3847) udostepnia 47 tools przez Model Context Protocol.
Mozna go podlaczyc do BUCH_CHAT jako tool provider.

---

## Roznica web vs Electron

| Feature | Web (zenonbrowsers.org) | Electron (lokalna) |
|---------|------------------------|-------------------|
| BUCH_CHAT | Tak (via CF Worker) | Tak (via AI Gateway) |
| JimboKit | Nie | Tak (port 4111) |
| Tool-use | Nie (todo) | Czescioowo (JimboKit) |
| MCP Server | Nie | Tak (port 3847) |
| Terminal | Nie | Tak |
| Plugin system | Nie | Tak |
| Pliki lokalne | Nie | Tak (IPC) |
| Historia przegladarki | Nie | Tak |

---

## Konfiguracja providerow — szybki test

```bash
# Test DeepSeek
curl -X POST http://localhost:5173/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}], "provider": "deepseek"}'

# W Electron — przez IPC
window.electronAPI.ai.execute({ prompt: "hello", provider: "deepseek" })
```
