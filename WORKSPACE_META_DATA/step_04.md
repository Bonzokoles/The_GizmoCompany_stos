# Step 04 — Prompty, Addons i Pomoce

## Folder `prompty/`

Szablony promptów gotowe do wklejenia lub załadowania przez serwis.

```
prompty/
├── jimbo/          ← dla JIMBOKit (:3701) — lokalny FS, web, kb
│   └── [scenariusz].md
└── buch/           ← dla BUCH (:5180) — D1, R2, Cloudflare
    └── [scenariusz].md
```

### Format pliku promptu

```markdown
# Nazwa promptu
Zastosowanie: kiedy używać (1 zdanie)

---
[treść promptu — gotowa do wklejenia]
```

### Aktywny system prompt JIMBO
Lokalizacja: `u:/WWW_Zen_BRo_wser_org3/JIMbo_kit/lib/system-prompt.md`
Ładowany automatycznie przy starcie serwera. Edytuj bezpośrednio tam.

---

## Folder `addons/`

Zewnętrzne integracje, konfiguracje MCP, narzędzia dodatkowe.

```
addons/
└── <nazwa-integracji>/
    ├── README.md       ← co to, jak uruchomić, jak wyłączyć
    └── config/         ← pliki konfiguracyjne (bez sekretów!)
```

**Przykłady co tu trafia:**
- Konfiguracje MCP serverów (ścieżki, porty, uprawnienia)
- Opisy integracji z zewnętrznymi API (struktura, nie klucze)
- Narzędzia pomocnicze: skrypty, CLI wrappers
- Definicje custom agentów spoza `.github/agents/`

---

## Folder `pomoce/`

Cheatsheets, komendy do szybkiego kopiowania, quick-ref.

**Co tu wrzucać:**
- Często używane komendy git, npm, wrangler, pnpm
- Ściągawki z portami serwisów
- Wzorce do kopiowania (np. format commit message, format PR)
- Troubleshooting checklisty

**Format:** dowolny `.md` — jeden plik na temat, krótko i konkretnie.

### Przykładowe pliki do stworzenia

| Plik | Zawartość |
|------|-----------|
| `pomoce/porty.md` | Mapa portów wszystkich serwisów |
| `pomoce/git-komendy.md` | Najczęstsze operacje git w projekcie |
| `pomoce/cloudflare-cli.md` | Wrangler, D1 queries, R2 operacje |
| `pomoce/deploy.md` | Kroki deploy CF Pages + Electron build |
| `pomoce/troubleshooting.md` | Najczęstsze błędy i ich fix |

---

## Folder `raporty/`

AI-generowane analizy, podsumowania, wyniki badań.

**Konwencja nazewnictwa:**
```
raporty/YYYY-MM-DD_temat-raportu.md
```

**Co tu trafia:**
- Wyniki analiz kodu wygenerowane przez JIMBO/BUCH
- Podsumowania sesji z ważnymi ustaleniami
- Raporty wydajności, bezpieczeństwa
- Porównania bibliotek / narzędzi

---

## Folder `logi/`

Debug notes, historia błędów, nieoczekiwane zachowania.

**Konwencja:**
```
logi/YYYY-MM-DD_symptom.md
```

**Minimalny format wpisu:**
```markdown
# YYYY-MM-DD — Symptom

**Serwis:** JIMBOKit / BUCH / JIMBO_HUB / Electron / Vite
**Symptom:** co się stało
**Przyczyna:** co było przyczyną (jeśli znana)
**Fix:** co zrobiono
**Status:** RESOLVED / OPEN
```
