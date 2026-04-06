/**
 * Seed: Prompt Skills — kontekstowe instrukcje per typ zadania
 *
 * Uruchom: npx tsx skills/seed-prompt-skills.ts
 *
 * Każdy prompt jest wstrzykiwany automatycznie przez buildUserPrefix()
 * gdy zapytanie użytkownika semantycznie pasuje (cosine >= 0.65).
 * Namespace: 'prompts' — zawsze aktywny w activeNamespaces.
 */

import { SkillManager } from './skill-manager.js';

const skills = new SkillManager();

interface PromptSkill {
  name: string;
  description: string; // słowa kluczowe do similarity search
  code: string;        // właściwy prompt z instrukcjami
  tags: string[];
}

const PROMPTS: PromptSkill[] = [
  // ── 1. Blog / content writing ──────────────────────────────────────────────
  {
    name: 'prompt:blog',
    description: 'pisanie artykułu blog post SEO copywriting treść content marketing tekst publikacja',
    tags: ['blog', 'seo', 'content', 'writing'],
    code: `# TRYB: Pisanie treści / Blog

## Twoja rola
Ekspert content marketingu dla polskich MŚP i bloga mybonzoai.

## Narzędzia których używasz w tej kolejności:
1. **Tavily search** — zbierz 3-5 aktualnych źródeł na temat
2. **Firecrawl** — przeczytaj pełną treść 1-2 najważniejszych artykułów
3. **Jina AI** (r.jina.ai/URL) — ekstrakcja treści bez klucza gdy inne nie działają

## Format artykułu:
- H1: tytuł zawierający główne słowo kluczowe
- Lead (2-3 zdania): problem czytelnika + co artykuł rozwiąże
- 3-5 sekcji H2 z konkretną wiedzą praktyczną
- Konkluzja: 1 CTA (wezwanie do działania)
- Meta description: 120-160 znaków z słowem kluczowym

## Styl:
- Język: polski, profesjonalny ale przystępny
- Ton: doradca MŚP, nie korporacja
- Unikaj: słów kluczowych jak "zanurkujmy", "z pewnością", "oczywiście"
- Długość: 800-1200 słów dla blog posta

## Gdy piszesz przez Goose:
Zapisz plik do U:\\WWW_MYbonzoai_blog\\src\\content\\blog\\ jako .md z frontmatter.`,
  },

  // ── 2. Kod / debug / refactor ───────────────────────────────────────────────
  {
    name: 'prompt:code',
    description: 'napraw błąd debug refactor kod TypeScript JavaScript Python implementacja fix error',
    tags: ['code', 'debug', 'typescript', 'refactor'],
    code: `# TRYB: Kod / Debug / Refactor

## Konwencje projektów ZENO/JIMBO:
- TypeScript strict — zero \`any\`, pełne typy
- SQLite migrations: idempotentne (PRAGMA table_info → ADD COLUMN IF NOT EXISTS)
- Shared DB: nowe moduły przyjmują \`db: Database.Database\` w konstruktorze
- Seed scripts: sprawdź SELECT przed INSERT (idempotentność)
- Importy ES modules: rozszerzenie .js w ścieżkach (nawet dla .ts plików)

## Workflow diagnozy błędu:
1. Odczytaj pełny stack trace — znajdź PIERWSZĄ linię z własnym kodem
2. Sprawdź sygnaturę funkcji (Grep) przed napisaniem kodu który ją wywołuje
3. Weryfikuj typy — nie zakładaj, sprawdzaj
4. Minimal fix — nie refaktoruj kodu wokół buga

## Gdy wysyłasz do Goose:
- Podaj absolutne ścieżki (U:\\WWW_Zen_BRo_wser_org3\\...)
- Jeden blok goose = jedno zadanie
- Goose ma dostęp do npm/npx/tsc — możesz kazać mu sprawdzić build`,
  },

  // ── 3. Research / analiza / raport ─────────────────────────────────────────
  {
    name: 'prompt:research',
    description: 'research analiza raport dane rynek trend statystyki informacje zbierz sprawdź porównaj',
    tags: ['research', 'analysis', 'report', 'data'],
    code: `# TRYB: Research / Analiza / Raport

## Narzędzia w kolejności użycia:
1. **Tavily search** — szybkie wyszukiwanie aktualnych danych i faktów
2. **Firecrawl** — scraping konkretnych stron/raportów
3. **FRED API** (dane makro PL/EU/US) — gdy pytanie o gospodarkę, inflację, PKB
4. **CoinGecko API** — gdy pytanie o kryptowaluty, DeFi

## Format raportu:
- Executive summary (3 punkty: co znaleziono, co ważne, rekomendacja)
- Dane w tabeli markdown gdy jest więcej niż 3 pozycje do porównania
- Źródła z datą na końcu
- Flaguj dane starsze niż 12 miesięcy jako "[dane mogą być nieaktualne]"

## Styl odpowiedzi:
- Fakty przed opinią
- Liczby z jednostkami i kontekstem (nie "wzrosło o 5%" lecz "wzrosło o 5% r/r, z 100 do 105")
- Jeśli czegoś nie wiesz — powiedz to wprost, nie spekuluj`,
  },

  // ── 4. Generowanie obrazów ──────────────────────────────────────────────────
  {
    name: 'prompt:image',
    description: 'wygeneruj obraz zdjęcie ilustracja grafika image generate picture visual art',
    tags: ['image', 'generate', 'visual', 'creative'],
    code: `# TRYB: Generowanie obrazów

## Narzędzie: zeno_api (tool calling)
Endpoint: POST /api/images/generate
Payload: { prompt: string, style?: string, size?: "512x512"|"1024x1024" }

## Jak sformułować prompt do obrazu:
- Opisz główny obiekt/scenę (co ma być na obrazku)
- Dodaj styl: "realistic photo", "digital art", "watercolor", "minimalist icon"
- Dodaj kontekst: kolorystyka, nastrój, perspektywa
- Unikaj: negatywnych opisów ("bez X") — modele je ignorują

## Po wygenerowaniu:
- Odpowiedź zawiera URL obrazka — wyświetl go jako ![opis](URL)
- Zaproponuj warianty jeśli użytkownik chce innych stylów
- Nie pytaj o potwierdzenie — wygeneruj od razu`,
  },

  // ── 5. Goose / agent dispatch ───────────────────────────────────────────────
  {
    name: 'prompt:agent',
    description: 'uruchom agenta goose zadanie deploy wdróż automatyzacja workflow pipeline agent run',
    tags: ['agent', 'goose', 'automation', 'deploy'],
    code: `# TRYB: Agent / Goose Dispatch

## Format obligatoryjny — ZAWSZE blok goose:
\`\`\`goose
[kompletna instrukcja — wszystkie kroki w jednym bloku]
\`\`\`

## Zasady dobrej instrukcji dla Goose:
- Zacznij od: "Pracujesz w katalogu U:\\WWW_Zen_BRo_wser_org3\\"
- Podaj absolutne ścieżki do plików
- Opisz oczekiwany WYNIK (nie tylko kroki)
- Jeśli wymaga API — podaj endpoint i format danych
- Jeśli wymaga testów — napisz "uruchom npm run build i sprawdź czy przechodzi"

## HUB API dla Goose:
- POST http://localhost:4222/agent/run — uruchom task
- GET  http://localhost:4222/reflexion/stats — sprawdź historię tasków
- GET  http://localhost:4222/skills/list — lista skills w DB
- POST http://localhost:4222/files/register — zarejestruj plik w katalogu

## Po wysłaniu do Goose:
Poczekaj na wynik w AgentHubPanel (prawy panel). Goose raportuje status.`,
  },

  // ── 6. Analiza danych / pliki ───────────────────────────────────────────────
  {
    name: 'prompt:data',
    description: 'plik CSV Excel JSON dane tabela analiza danych kolumny wiersze statystyki import parse',
    tags: ['data', 'csv', 'excel', 'json', 'analysis'],
    code: `# TRYB: Analiza danych / Pliki

## Przepływ pracy:
1. Zarejestruj plik: POST http://localhost:4222/files/register { path, description }
2. Lub bezpośrednio przekaż ścieżkę — JIMBO HUB wykryje automatycznie

## Narzędzia Goose do analizy:
- Python + pandas (CSV/Excel): \`python3 -c "import pandas as pd; df = pd.read_csv('...'); print(df.describe())"\`
- Node.js (JSON): \`node -e "const d=require('./data.json'); console.log(JSON.stringify(d.slice(0,5), null, 2))"\`
- Goose może pisać skrypty analizy i zapisywać raporty jako .md

## Format odpowiedzi z analizy:
- Podsumowanie struktury: liczba wierszy, kolumny, typy danych
- Kluczowe statystyki: min/max/średnia dla kolumn numerycznych
- Anomalie / brakujące dane — wyróżnij
- Tabela markdown z wynikami (max 20 wierszy)
- Wnioski i rekomendacje (jeśli pytanie o interpretację)`,
  },
];

// ── Seed ────────────────────────────────────────────────────────────────────
let added = 0;
let skipped = 0;

for (const p of PROMPTS) {
  // Idempotentność — sprawdź czy wpis już istnieje
  const existing = await skills.search(p.name, 1, 0.95, ['prompts']);
  const exactMatch = existing.find(s => s.name === p.name);
  if (exactMatch) {
    console.log(`  ⏭ Już istnieje: ${p.name}`);
    skipped++;
    continue;
  }

  await skills.save({
    name: p.name,
    description: p.description,
    code: p.code,
    tags: p.tags,
    namespace: 'prompts',
  });
  console.log(`  ✅ Dodano: ${p.name}`);
  added++;
}

console.log(`\nGotowe. Dodano: ${added}, pominięto: ${skipped}`);
await (skills as unknown as { db: { close(): void } }).db?.close?.();
