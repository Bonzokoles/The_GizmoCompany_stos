# Komponent: Voice Chat Widget (`#vchatWin`)

**Plik JS:** `js/modules/vchat.js`
**Inicjalizacja:** `initVchat()` — wywoływana w `DOMContentLoaded`

---

## Co robi

Pływający widget czatu głosowego "Jimbo" w prawym dolnym rogu. Umożliwia:
- Czat tekstowy z AI (przez gateway `/api/ai/chat`)
- Text-to-speech (odtwarzanie odpowiedzi głosem)
- Speech-to-text (nagrywanie głosowe z auto-stop po ciszy)
- RAG — przeszukiwanie KB przed każdym zapytaniem do AI
- Automatyczne powitanie przy pierwszym otwarciu

---

## Elementy HTML

| ID | Element | Opis |
|----|---------|------|
| `#vchatToggle` | Przycisk toggle | Otwiera/zamyka widget |
| `#vchatWin` | Panel okna | Główny kontener |
| `#vchatMsgs` | Kontener wiadomości | Scroll area |
| `#vchatText` | Input textarea | Wpisywanie wiadomości |
| `#vchatSend` | Przycisk wyślij | Wysyła wiadomość |
| `#vchatMic` | Przycisk mikrofonu | Start/stop nagrywania |
| `#vchatClose` | Przycisk zamknij | Zamyka widget |

---

## Stany widgetu

**Zamknięty:** `#vchatWin` bez klasy `.open`
**Otwarty:** `#vchatWin.open` + `#vchatToggle.active`
**Nagrywanie:** `#vchatMic.recording` + emoji `⏹`
**Przetwarzanie audio:** mikrofon emoji `⏳`
**TTS w toku:** button `.vchat-tts.playing` + emoji `⏳`

---

## Wiadomości

Typy wiadomości w `#vchatMsgs`:
- `.vchat-msg.user` — wiadomość użytkownika (tekst)
- `.vchat-msg.ai` — odpowiedź AI (span z tekstem + button TTS `🔊`)
- `.vchat-msg.system` — komunikaty systemowe (błędy, info)

Placeholder `'...'` podczas oczekiwania na odpowiedź AI.

---

## Historia czatu

Tablica `history[]` przechowuje konwersację w formacie:
```js
{ role: 'user', content: '...' }
{ role: 'assistant', content: '...' }
```

**Uwaga:** Historia nie jest wysyłana do API — każde zapytanie jest niezależne. `history` jest przechowywana lokalnie, ale nie przekazywana jako context do backendu (brak multi-turn memory w `/api/ai/chat`).

---

## RAG — Wyszukiwanie KB

Przed każdym zapytaniem do AI widget przeszukuje KB:

```js
async function searchKbForContext(query) {
  // POST {endpoint}/kb/search {query, limit: 3}
  // Zwraca: string z max 3 wynikami (title + 300 znaków content)
  // Dołączany do systemPrompt
}
```

Endpoint KB pobierany z `#kb-endpoint` lub fallback do `https://jimbo-gateway.stolarnia-ams.workers.dev`.

---

## API Calls

### Chat — `POST /api/ai/chat`

```json
{
  "prompt": "tekst użytkownika",
  "maxTokens": 1024,
  "systemPrompt": "Jesteś Jimbo — [...] + kontekst z KB"
}
```

Odpowiedź: `data.content || data.response || data.text`

### TTS — `POST /api/ai/tts`

```json
{ "text": "treść do przeczytania", "voice": "nova" }
```

Odpowiedź: audio blob (binary). Odtwarzany przez `new Audio(objectURL)`.

### STT — `POST /api/ai/stt`

Body: binary audio blob (`audio/webm`)
Content-Type: `application/octet-stream`

Odpowiedź: `{ "text": "rozpoznany tekst" }`

---

## Nagrywanie głosowe

### Inicjalizacja nagrywania

1. `getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })`
2. Tworzy `AudioContext` + `AnalyserNode` do detekcji ciszy
3. `MediaRecorder` z mimetype `audio/webm;codecs=opus` (lub `audio/webm` jako fallback)
4. Zapisuje chunks do `audioChunks[]`
5. Uruchamia pętlę `checkSilence()` przez `requestAnimationFrame`

### Auto-stop po ciszy

```js
const SILENCE_THRESHOLD = 0.01;  // RMS poniżej tej wartości = cisza
const SILENCE_DURATION = 3000;   // 3 sekundy ciszy → stop
```

Algorytm RMS (root mean square) na danych `AnalyserNode` — jeśli głośność < 0.01 przez 3 sekundy, automatycznie zatrzymuje nagrywanie.

### Po zatrzymaniu

1. Zamyka `AudioContext`, zatrzymuje stream
2. Wywołuje `processAudio()`
3. `processAudio()` tworzy Blob z chunks, sprawdza min. rozmiar (500 bytes)
4. Wysyła do `/api/ai/stt`
5. Jeśli rozpoznany tekst → wpisuje do `#vchatText` i automatycznie wysyła

---

## System Prompt

```
Jesteś Jimbo — pomocnym asystentem AI tego portalu.
Odpowiadaj po polsku, krótko i konkretnie.
Masz dostęp do bazy wiedzy projektu — korzystaj z niej gdy to przydatne.
[+ kontekst z KB jeśli dostępny]
```

---

## Powitanie

Przy pierwszym otwarciu widgetu (po 2 sekundach):
```
Cześć! Jestem Jimbo, twój kolega i przewodnik po tej aplikacji.
Karol ją cały czas rozwija, a ta część jest eksperymentalna —
więc jeżeli coś pójdzie nie tak z moimi odpowiedziami głosowymi,
to pisz i też postaram się pomóc! 😊
```

Flaga `greeted = false` — wiadomość pokazywana tylko raz per sesja.

---

## TTS Player

- Jeden `currentAudio` na raz — nowe TTS zatrzymuje poprzednie
- `URL.createObjectURL(blob)` — tworzy URL dla audio
- `URL.revokeObjectURL(url)` po zakończeniu — sprzątanie pamięci
- Przycisk TTS zmienia ikonę: `🔊` → `⏳` (ładowanie) → `⏳` (playing) → `🔊` (zakończone)

---

## Inicjalizacja

```js
// main.js — DOMContentLoaded
initVchat();  // podpina wszystkie event handlers
```

Widget jest zawsze dostępny niezależnie od aktywnej zakładki — nakładka na całą stronę.
