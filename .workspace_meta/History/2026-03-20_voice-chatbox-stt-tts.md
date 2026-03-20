# Voice Chatbox — STT/TTS dla AI Hub i Movies App
priority: high
created: 2026-03-20T12:00:00
completed: 2026-03-20T20:00:00

## Resolution Notes

Dodano floating voice chatbox z obsługą mowy po polsku do dwóch standalone HTML apps (`/ai-hub/` i `/movies-app/`). System korzysta z CF Workers AI (STT) i OpenAI API (TTS).

## Architektura

### STT — Speech-to-Text
- **Model:** `@cf/openai/whisper-large-v3-turbo` via CF Workers AI binding
- **Endpoint:** `functions/api/ai/stt.ts` → POST `/api/ai/stt`
- **Format wejścia:** Whisper oczekuje `audio` jako **string base64** (NIE number[])
- **Język:** `pl` (polski), `vad_filter: true`
- **Transport:** Przeglądarka wysyła raw binary blob (`application/octet-stream`), serwer konwertuje do base64
- **Koszt:** ~$0.0005/min

### TTS — Text-to-Speech
- **Model:** OpenAI `tts-1` (proxy do `https://api.openai.com/v1/audio/speech`)
- **Endpoint:** `functions/api/ai/tts.ts` → POST `/api/ai/tts`
- **Głos:** "nova", max 4096 znaków
- **Output:** `audio/mpeg` stream bezpośrednio do przeglądarki
- **Wymaga:** `OPENAI_API_KEY` secret w CF Pages

### Chat
- **Endpoint:** istniejący `/api/ai/chat` z fallback chain: DeepSeek → OpenRouter → Anthropic

## Chatbox UI (w obu HTML apps)
- Floating przycisk 💬 w prawym dolnym rogu
- Glassmorphism dark theme, 380x500px
- Minimalizacja/zamykanie
- System prompts po polsku
- Przycisk 🎤 do nagrywania mowy
- Przycisk 🔊 do odtwarzania odpowiedzi głosem

## Silence Detection (3s auto-stop)
- AudioContext + AnalyserNode mierzący RMS audio w real-time
- `SILENCE_THRESHOLD = 0.01`, `SILENCE_DURATION = 3000ms`
- `requestAnimationFrame` loop z `checkSilence()` — automatycznie zatrzymuje nagrywanie po 3s ciszy

## Zmodyfikowane pliki
- `functions/api/ai/stt.ts` — NOWY endpoint STT (Whisper)
- `functions/api/ai/tts.ts` — NOWY endpoint TTS (OpenAI proxy)
- `ai-hub/index.html` — dodano voice chatbox + silence detection
- `movies-app/index.html` — dodano voice chatbox + silence detection
- `wrangler.toml` — AI binding enabled (`[ai]` + `[env.production.ai]`)
- `functions/types.ts` — `AI: Ai` uncommented, `OPENAI_API_KEY?: string` dodane
- `package.json` — `deploy:web` script kopiuje ai-hub i movies-app do dist/

## Commity
- `632c6da` — feat: voice chatbox with Polish STT/TTS for ai-hub and movies-app
- `4859437` — fix: STT 500 - send raw bytes to Whisper + 3s silence auto-stop
- `5f743bc` — fix: STT audio type mismatch - remove unnecessary base64 round-trip
- `54b8c52` — fix: STT Whisper expects audio as base64 string, not number[]

## Napotkane problemy i rozwiązania

### 1. STT HTTP 500 — "Type mismatch of '/audio'"
**Problem:** `AI.run()` dla Whisper dostawał `audio` w złym formacie.
**Diagnoza:** Dokumentacja CF Workers AI mówi jasno: `audio` (string) - Required - Base64 encoded value.
**Rozwiązanie:** Wysyłamy base64 string, NIE `number[]` ani `Array.from(bytes)`.

### 2. btoa() stack overflow na dużych buforach
**Problem:** `btoa(String.fromCharCode(...new Uint8Array(buf)))` crashuje na dużych audio.
**Rozwiązanie:** Przeglądarka wysyła raw binary blob (`application/octet-stream`), serwer konwertuje pętlą for do base64.

### 3. Brak polskiego TTS na CF Workers AI
**Problem:** MeloTTS i Deepgram Aura nie obsługują polskiego.
**Rozwiązanie:** OpenAI tts-1 API jako proxy — obsługuje polski, działa cross-device.

## Outstanding
- ⚠️ `OPENAI_API_KEY` secret NIE USTAWIONY — TTS nie działa dopóki:
  ```
  npx wrangler pages secret put OPENAI_API_KEY --project-name zeno-browser-web
  ```
