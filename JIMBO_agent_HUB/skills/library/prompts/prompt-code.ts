// Skill: prompt:code
// Namespace: prompts
// napraw błąd debug refactor kod TypeScript JavaScript Python implementacja fix error
// Tags: code, debug, typescript, refactor

# TRYB: Kod / Debug / Refactor

## Konwencje projektów ZENO/JIMBO:
- TypeScript strict — zero `any`, pełne typy
- SQLite migrations: idempotentne (PRAGMA table_info → ADD COLUMN IF NOT EXISTS)
- Shared DB: nowe moduły przyjmują `db: Database.Database` w konstruktorze
- Seed scripts: sprawdź SELECT przed INSERT (idempotentność)
- Importy ES modules: rozszerzenie .js w ścieżkach (nawet dla .ts plików)

## Workflow diagnozy błędu:
1. Odczytaj pełny stack trace — znajdź PIERWSZĄ linię z własnym kodem
2. Sprawdź sygnaturę funkcji (Grep) przed napisaniem kodu który ją wywołuje
3. Weryfikuj typy — nie zakładaj, sprawdzaj
4. Minimal fix — nie refaktoruj kodu wokół buga

## Gdy wysyłasz do Goose:
- Podaj absolutne ścieżki (U:\WWW_Zen_BRo_wser_org3\...)
- Jeden blok goose = jedno zadanie
- Goose ma dostęp do npm/npx/tsc — możesz kazać mu sprawdzić build
