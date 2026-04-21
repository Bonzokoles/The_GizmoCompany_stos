# Indekser — Instrukcja Agenta

Model: `meta-llama/llama-3.1-8b-instruct` (bardzo tani)
Rola: Buduje i aktualizuje `INDEX.md` — jedyną mapę wszystkich plików

---

## Co robi

Skanuje WORKSPACE_META_DATA i tworzy/aktualizuje `INDEX.md`:
- Każdy plik .md → jedna linia z: ścieżka, 1-zdaniowy opis, data modyfikacji
- Grupuje po folderach
- Indeks jest punktem wejścia dla JIMBO przy wyszukiwaniu

## Format INDEX.md (generowany)

```markdown
# INDEX — WORKSPACE_META_DATA
Wygenerowano: 2026-04-17 | Pliki: 42

## projekty/
- `ZENO_Browser/status.md` — aktualny stan prac ZENO Browser (2026-04-17)
- `JIMBO_HUB/status.md` — status JIMBO agent HUB (2026-04-15)

## logi/
- `logi/2026-04-17_vite-crash.md` — FSWatcher crash na stale worktree (RESOLVED)

## raporty/
- `raporty/2026-04-10_analiza-CF.md` — analiza kosztów Cloudflare D1

## pomoce/
- `pomoce/porty.md` — mapa portów wszystkich serwisów ekosystemu

## prompty/jimbo/
...
```

## Algorytm

```
1. Rekursywny scan wszystkich .md (bez _archiwum/, node_modules/)
2. Dla każdego pliku: odczytaj pierwsze 3 linie → wygeneruj 1-zdaniowy opis
3. Posortuj po folderach, w folderze po dacie malejąco
4. Zapisz do WORKSPACE_META_DATA/INDEX.md
5. Raport: ile plików, ile nowych vs poprzedni run
```

## Prompt dla modelu

```
Dostajesz: ścieżkę pliku + pierwsze 3 linie jego treści.
Odpowiedz TYLKO jednym zdaniem po polsku opisującym co to za plik.
Maksymalnie 80 znaków. Bez kropki na końcu.
```
