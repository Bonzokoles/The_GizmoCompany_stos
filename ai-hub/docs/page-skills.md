# Strona: Skills HuggingFace (`#page-skills`)

**Zakładka nav:** 🎓 Skills
**ID strony:** `page-skills`
**Moduł JS:** `js/modules/skills.js`
**Dane:** `js/data/skills.js` — tablica `SKILLS[]`

---

## Co robi

Katalog 11 modułowych skills z repozytorium `huggingface/skills` na GitHubie. Każdy skill to gotowy moduł wiedzy dla agentów AI i chatbotów. Obsługuje filtrowanie po kategorii i wyszukiwanie.

Kliknięcie karty → otwiera stronę skill na GitHubie HuggingFace.

---

## Co to są Skills

Skills z `huggingface/skills` to pliki `SKILL.md` zawierające instrukcje dla agentów AI — jak używać konkretnych narzędzi/API (HF CLI, Gradio, itp.). Mogą być dołączane jako kontekst do promptów systemowych.

---

## Dane skills

Każdy skill w `SKILLS[]`:

| Pole | Typ | Opis |
|------|-----|------|
| `name` | string | Nazwa skilla |
| `icon` | string | Emoji |
| `cat` | string | Kategoria |
| `desc` | string | Opis po polsku |
| `file` | string | Ścieżka w repozytorium `.agents/skills/...` |

### Pełna lista (11 skills)

| Nazwa | Kategoria | Co robi |
|-------|-----------|---------|
| HF CLI | devops | Zarządzanie HF Hub z CLI — download, upload, repo, jobs |
| Community Evals | research | Ewaluacja modeli — inspect-ai, lighteval, benchmarki |
| Datasets API | data | Dataset Viewer REST API — splits, rows, search, parquet |
| Gradio UI | frontend | Budowanie webowych interfejsów ML |
| HF Jobs | devops | Compute jobs na infrastrukturze HF |
| LLM Trainer | training | Fine-tuning LLM — SFT, DPO, GRPO, reward modeling |
| Paper Publisher | publishing | Publikowanie papierów na HF Hub |
| Papers Lookup | research | Wyszukiwanie papierów naukowych |
| TrackIO | data | Śledzenie eksperymentów ML |
| Vision Trainer | training | Trenowanie modeli vision — D-FINE, YOLOS, SAM |
| Transformers.js | frontend | Modele ML w JavaScript — WebGPU/WASM |

### Kategorie skills

| Kategoria | CSS class | Kolor |
|-----------|-----------|-------|
| `training` | `tag-app` | zielony |
| `data` | `tag-data` | niebieski |
| `publishing` | `tag-gen` | turkusowy |
| `frontend` | `tag-util` | szary |
| `devops` | `tag-app` | zielony |
| `research` | `tag-gen` | turkusowy |

---

## Filtry

### Filter pills (`#skill-pills`)

| `data-sf` | Kategoria |
|-----------|-----------|
| `all` | Wszystkie |
| `training` | 🏋️ Training |
| `data` | 📊 Data |
| `publishing` | 📝 Publishing |
| `frontend` | 🖥️ Frontend |
| `devops` | ⚙️ DevOps |
| `research` | 🔬 Research |

### Wyszukiwarka (`#skill-search`)

Szuka w: `name`, `desc`, `cat`.

---

## Kliknięcie karty

Każda karta skill po kliknięciu otwiera w nowej karcie URL:
```
https://github.com/huggingface/skills/tree/main/skills/{folder-name}
```
Folder name pobierany z pola `file` (część `skills/[2]`).

---

## Funkcje JS

### `renderSkills()` — `skills.js:12`

Filtruje `SKILLS[]`, renderuje karty do `#skills-grid`.

### `initSkills()` — `skills.js:37`

Podpina search + pill filters.

---

## Inicjalizacja

```js
renderSkills();
initSkills();
```

Renderuje się od razu. Brak lazy init.

---

## Dodawanie skills

Edytuj `js/data/skills.js`. Pole `file` powinno mieć format: `.agents/skills/{folder}/SKILL.md`.
