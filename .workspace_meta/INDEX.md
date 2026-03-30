# ZENO Browser — Workspace Index

> Zaktualizowano: 2026-03-30

---

## Szybka nawigacja

- [Instrukcja uzytkownika](../INSTRUKCJA_UZYTKOWNIKA.md)
- [Architektura](scripts/architecture-overview.md)
- [Dev Quickstart](scripts/dev-quickstart.md)
- [Cloudflare Services Map](scripts/cloudflare-services-map.md)
- [BUCH_CHAT](scripts/buch-chat-tools.md)
- [Upgrade Plan](scripts/upgrade-next-steps.md)

---

## Scripts (referencja i narzedzia)

| Plik | Opis |
| ---- | ---- |
| [architecture-overview.md](scripts/architecture-overview.md) | Pelna architektura Electron + Web + AI-Hub + ekosystem CF |
| [dev-quickstart.md](scripts/dev-quickstart.md) | Prerequisites, npm install, .env.local, uruchomienie |
| [cloudflare-services-map.md](scripts/cloudflare-services-map.md) | Workers, Pages, D1, R2, Queues, KV — mapa serwisow |
| [buch-chat-tools.md](scripts/buch-chat-tools.md) | Providery, system prompt, tool-use (todo), web vs Electron |
| [upgrade-dependencies-plan.md](scripts/upgrade-dependencies-plan.md) | 5-fazowy plan upgrade TS/Vite/React/Electron/ESLint |
| [install-copilot-sdk.ps1](scripts/install-copilot-sdk.ps1) | Bootstrap Copilot SDK (idempotent) |

---

## Historia zmian (ToDo/History/)

| Plik | Opis |
| ---- | ---- |
| [sec-fixes-20260330.md](ToDo/History/sec-fixes-20260330.md) | CR-001..CR-006 security fixes (se-security-reviewer) |
| [debug-fixes-20260330.md](ToDo/History/debug-fixes-20260330.md) | CR-007,CR-008,CR-011,CR-021,CR-022 bug fixes (debug agent) |
| [cleanup-20260330.md](ToDo/History/cleanup-20260330.md) | Finalny cleanup — deduplikacja, TypeScript strict, zero require() |
| [2026-03-30_zeno-master-orchestration.md](ToDo/History/2026-03-30_zeno-master-orchestration.md) | Master orchestration — wszystkie 6 taskow COMPLETED |
| [context-map-20260330.md](ToDo/History/context-map-20260330.md) | Context & Dependency Map — 87+ plikow, 120+ IPC kanalow |

---

## Aktywne ToDo

Brak aktywnych taskow po sesji 2026-03-30. Nastepne priorytety:

1. **Upgrade Faza 1** — TypeScript 5.3 → 5.9 (bezpieczne, zacznij tu)
2. **Upgrade Faza 2** — Vite 5 → 8 (po Fazie 1)
3. Dalsze fazy wedlug [upgrade-dependencies-plan.md](scripts/upgrade-dependencies-plan.md)

---

## Docs (docs/)

| Plik | Opis |
| ---- | ---- |
| [ELECTRON_SETUP.md](../docs/ELECTRON_SETUP.md) | Instalacja i konfiguracja Electron |
| [AI_GATEWAY_SETUP.md](../docs/AI_GATEWAY_SETUP.md) | AI Gateway — konfiguracja providerow |
| [COPILOT_SDK_SETUP.md](../docs/COPILOT_SDK_SETUP.md) | Copilot SDK — wymagania i IPC |
| [CLOUDFLARE_SECRETS_SETUP.md](../docs/CLOUDFLARE_SECRETS_SETUP.md) | Sekrety CF — GitHub Actions, Pages, .dev.vars |
| [CLOUDFLARE_TUNNEL_SETUP.md](../docs/CLOUDFLARE_TUNNEL_SETUP.md) | Konfiguracja CF Tunnel |
| [PLUGIN_SYSTEM.md](../docs/PLUGIN_SYSTEM.md) | System wtyczek — architektura i API |
| [PODMAN_SETUP.md](../docs/PODMAN_SETUP.md) | Lokalne modele AI (Gemma 2B, Phi Nano) |
| [WEFT_SETUP.md](../docs/WEFT_SETUP.md) | Weft integration |

---

## Stare plany (old_plans/)

Archiwum starszych planow i notatek — nie usuwac, tylko referencja historyczna.

- `2026-03-19_agent-prompts-refactor.md` — stare prompty agentow (zastapione przez orchestration)
- `2026-03-19_refactor-plan-zeno-browser.md` — stary plan refaktoru
- `2026-03-23_devz-root-connections-index.md` — DEVz HUB index
- `2026-03-24_ai-market-research-tavily.md` — Tavily research
- `Code_fix_plan.md` — oryginalny code review z 28 issues (wszystkie P0-P2 naprawione)
- `browserendering.md` — notatka CF Browser Rendering
- `queuesand.md` — notatka CF Queues + Browser Rendering

---

## Workspace metadata

| Plik | Opis |
| ---- | ---- |
| [README.md](README.md) | Opis struktury .workspace_meta |
| [RULES.instructions.md](RULES.instructions.md) | Reguly agenta, security protocol, session lifecycle |
| [workspace.spec.json](workspace.spec.json) | Specyfikacja projektu (maszynowo-czytelna) |
| [Definition_of_done.html](Definition_of_done.html) | Dashboard DoD (standalone HTML, 90+ skills) |
| [notes/decisions.md](notes/decisions.md) | Architecture Decision Records (ADR) |
| [notes/snapshots.md](notes/snapshots.md) | Snapshoty stanu projektu co ~2h |

---

*ZENO Browser — Bonzokoles workspace system 2026*
