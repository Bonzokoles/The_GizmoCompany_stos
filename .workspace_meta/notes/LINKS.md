# ZENO Browser — Linki i Repo Referencyjne
> Zaktualizowano: 2026-04-04

---

## ⭐ TOP PRIORYTETY — zaadaptować do JIMBO Hub

### Hermes Agent (NousResearch)
**Repo:** https://github.com/NousResearch/hermes-agent
**Stars:** 24.8k | **Aktywny:** v0.7.0 — 2026-04-03
**Dlaczego:** Identyczna architektura co ZENO — SQLite + FTS5, local embeddings (fastembed + sqlite-vec), SKILL.md runtime creation, closed loop (task → extract → save skill → reuse).
**Co zabrać:**
- Schemat `hermes_state.py` — wzorzec SQLite + FTS5 + skills
- Skills wstrzykiwane jako **user messages** zamiast system prompt (prompt caching)
- MEMORY.md + USER.md jako strukturalna pamięć obok DB

### Hermes Agent Self-Evolution (GEPA)
**Repo:** https://github.com/NousResearch/hermes-agent-self-evolution
**Stars:** 617 | **Aktywny:** 2026-03-09 | **Paper:** ICLR 2026 oral
**Dlaczego:** GEPA (Genetic-Pareto Prompt Evolution) — silnik ewolucji promptów bez GPU (~$2-10/cykl). Poprawa 24% → 93% resolve rate. Czyta execution traces, diagnozuje failures, generuje targeted mutations.
**Co zabrać:**
- Architektura GEPA jako alternatywa/uzupełnienie OpenEvolve (P4)
- Wzorzec: execution traces → diagnosis → mutation cycle

### OpenSpace (HKUDS)
**Repo:** https://github.com/HKUDS/OpenSpace
**Stars:** 4k | **Aktywny:** 2026-04-04 (aktywny!)
**Dlaczego:** Najbliższy odpowiednik planowanego systemu ewolucji skilli w ZENO. 3 tryby: FIX (naprawa), DERIVED (nowe ze starych), CAPTURED (wzorce z wykonania). SQLite z pełną historią lineage + quality metrics. 165 skills z 13-pokoleniową ewolucją w benchmarkach.
**Co zabrać:**
- Schema SQLite z `showcase/.openspace/openspace.db` — wzorzec dla JIMBO skills DB z lineage
- Wzorzec 3-trybowej ewolucji do implementacji przy P4

---

## ✅ WARTO — dobre wzorce do studium

### Agent Zero (frdel)
**Repo:** https://github.com/frdel/agent-zero
**Stars:** 16.7k | **Aktywny:** tak
**Co zabrać:**
- Modułowy system promptów z dziedziczeniem (`prompts/<profil>/` nadpisują default)
- Dynamiczne ładowanie skills przez semantic recall (nie ładuj wszystkiego do kontekstu)
- Hierarchia delegacyjna: każdy agent ma "superior", może delegować do sub-agentów

### OpenHands (All-Hands-AI)
**Repo:** https://github.com/All-Hands-AI/OpenHands
**Stars:** 35k+ | **Aktywny:** codzienne commity
**Co zabrać:**
- Wzorzec system prompta w sekcjach: ROLE / EFFICIENCY / FILE_SYSTEM / CODE_QUALITY / VERSION_CONTROL / PROBLEM_SOLVING / SECURITY
- **AGENTS.md pattern** — plik w katalogu projektu ładowany automatycznie (lokalna wiedza bez DB)
- Hierarchia micro-agents: repo-level / org-level / user-level → mapowanie na JIMBO: session/project/global skills

### Letta (dawniej MemGPT)
**Repo:** https://github.com/letta-ai/letta
**Stars:** 21.9k | **Aktywny:** tak
**Docs:** https://docs.letta.com/concepts/memgpt/
**Co zabrać:**
- Trójpoziomowy model pamięci: **core** (zawsze w kontekście) / **archival** (vector store) / **recall** (FTS historia)
- Mapowanie na JIMBO SQLite:
  - core_memory  → tabela agent_state (always loaded)
  - archival     → tabela skills z embedding (cosine search)
  - recall       → tabela sessions z FTS5
- Agent jako aktywny manager pamięci (wywołuje memory_append/archival_search)

### mini-swe-agent (princeton-nlp)
**Repo:** https://github.com/SWE-agent/mini-swe-agent
**Dlaczego:** 100-liniowy agent osiągający >74% na SWE-bench. Benchmark prostoty — punkt odniesienia "ile kodu wystarczy dla skutecznego agenta".

---

## 📚 STANDARDY — obowiązkowe

### SKILL.md Open Standard
**Spec:** https://agentskills.io/specification
**Repo:** https://github.com/agentskills/agentskills
**Dlaczego:** ZENO używa Goose (współtwórcy standardu). Kompatybilny z Claude Code, Cursor, VS Code, Copilot, Codex. JIMBO skills DB powinna eksportować w tym formacie.

### Awesome Agent Skills
**Repo:** https://github.com/skillmatic-ai/awesome-agent-skills
**Akcja:** Zasilić JIMBO DB gotowymi skills w formacie SKILL.md.

### Goose CLI (block)
**Repo:** https://github.com/block/goose
**Stars:** 35.5k | **Aktywny:** v1.29.1 — 2026-04-03
**Docs:** https://block.github.io/goose/docs/guides/context-engineering/using-skills/
**Akcja:** Śledzić zmiany standardu, nowe extensions, SKILL.md spec updates.

---

## 🔬 EWOLUCJA PROMPTÓW I SKILLI

### OpenEvolve
**Repo:** https://github.com/algorithmicsuperintelligence/openevolve
**Status:** PyPI 0.0.20 — sprawdzić stabilność 2026-04-23 przed P4
**Dlaczego:** Ewoluuje kod i prompty. Bez GPU. +23% accuracy na HotpotQA przez ewolucję promptów.

### GEPA
**Repo:** https://github.com/gepa-ai/gepa
**Paper:** ICLR 2026 oral | Działa przez DSPy
**Dlaczego:** Ewolucja promptów przez analizę execution traces (nie gradienty). Uzupełnienie OpenEvolve.

---

## 🔍 SQLITE + EMBEDDINGS — referencje implementacji

| Repo | Co daje |
|------|---------|
| https://github.com/sqliteai/sqlite-memory | Hybrid cosine + FTS5 w jednym SQLite extension |
| https://github.com/sqliteai/sqlite-vector | Cross-platform SQLite vector extension |
| https://github.com/JordanMcCann/agentmemory | #1 LongMemEval (96.2%), SQLite domyślnie |
| https://github.com/bolnet/agent-memory | Sub-5ms retrieval, gotowa schema SQLite |

---

## 📂 KOLEKCJE SYSTEM PROMPTÓW — referencja

| Repo | Zawartość |
|------|-----------|
| https://github.com/EliFuzz/awesome-system-prompts | Claude Code, Cursor, Devin, Windsurf, Augment |
| https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools | 20+ narzędzi — Claude Code, Manus, Lovable, Replit |
| https://github.com/danielrosehill/System-Prompt-Library | 1290+ promptów z auto-export |

---

## ❌ NIE WARTO (teraz)

| Projekt | Dlaczego |
|---------|----------|
| Leon AI (leon-ai/leon) | W środku przepisywania na v2.0, docs nie gotowe. Focus na voice assistant, nie agentic AI. |
| AutoGPT | Enterprise SaaS. Za duże, za cloudowe. |
| SWE-agent (pełny) | Overkill. Użyj mini-swe-agent jako benchmark. |
| MemOS | Graph-based memory — ciekawy ale mało dojrzały. Wróć przy P4. |

---

## 🛠️ INFRASTRUKTURA PODMAN (kontenery)

| Serwis | Repo / URL | Namespace |
|--------|-----------|-----------|
| SearXNG | https://docs.searxng.org/ | search |
| sist2 (desktop search) | https://github.com/sist2app/sist2 | search |
| websurfx | https://github.com/neon-mmd/websurfx | search |
| Meilisearch | https://github.com/meilisearch/meilisearch | search |
| Umami | open source analytics | analytics |
| Plausible | https://plausible.io/ | analytics |
| Glance (dashboard) | https://github.com/glanceapp/glance | global |
| GoAccess (log analytics) | https://goaccess.io/ | analytics |

---

*ZENO Browser — Bonzokoles 2026*
