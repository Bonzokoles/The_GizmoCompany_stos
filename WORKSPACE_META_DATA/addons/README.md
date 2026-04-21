# ZENO Addons

Gotowe narzędzia i komponenty tworzone przez agentów AI — do testowania i wdrożenia.

## Struktura

```
addons/
  my-tool/
    index.ts      ← główny plik
    README.md     ← opis, jak uruchomić
```

## Wdrożenie addona do projektu

1. Skopiuj folder addona do `src/components/tools/` lub `src/components/agents/`
2. Zarejestruj w `panel-registry.tsx` (jeśli to nowy panel)
3. Przebuduj: `npm run build:electron`
