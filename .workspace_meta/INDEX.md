# ZENO Browser — Workspace Index
> Zaktualizowano: 2026-04-04

---

## ⭐ Zacznij Tu

- **[PLAN.md](notes/PLAN.md)** — aktualny plan działania (cleanup → P3 → P4 → P5)
- [PRIORYTETY.md](History/JIMBO_agent_HUB/PRIORYTETY.md) — twarde priorytety JIMBO Hub
- [MASTER_PLAN.md](History/JIMBO_agent_HUB/MASTER_PLAN.md) — wizja i pełna lista TODO

---

## Aktualny Status (2026-04-04)

```
✅ P0 — Infrastruktura (bat, watchdog, MCP, API_BASE)
✅ P1 — Core Loop (Goose → skill auto-save → injection → UI)
✅ P2 — Stabilizacja (export/import, OpenRouter, session persistence, Electron autostart)
⚠️  CLEANUP — cofnąć niezaplanowane zmiany (copilotkit stub, CloudAgentPanel, storage routing)
⬜ P3 — Multi-agent (BUCH_CHAT⚡Goose, GSD-2, EvoAgentX, CloudAgentPanel właściwy)
⬜ P4 — OpenEvolve (czekać na stabilność repo ~2026-04-23)
⬜ P5 — Upgrady stacku (TS→ESLint→Vite→React→Electron, osobna sesja)
```

---

## Dokumentacja Techniczna

| Plik | Opis |
|------|------|
| [scripts/architecture-overview.md](scripts/architecture-overview.md) | Architektura Electron + Web + AI-Hub + CF ekosystem |
| [scripts/dev-quickstart.md](scripts/dev-quickstart.md) | Prerequisites, npm install, .env, uruchomienie |
| [scripts/cloudflare-services-map.md](scripts/cloudflare-services-map.md) | Workers, Pages, D1, R2, Queues, KV — mapa |
| [scripts/buch-chat-tools.md](scripts/buch-chat-tools.md) | BUCH_CHAT — providery, system prompt, web vs Electron |
| [scripts/ai-tools-index.md](scripts/ai-tools-index.md) | Wszystkie AI narzędzia, endpointy, modele — kompletny index |
| [scripts/upgrade-dependencies-plan.md](scripts/upgrade-dependencies-plan.md) | Plan upgrade TS/Vite/React/Electron/ESLint |
| [notes/decisions.md](notes/decisions.md) | Architecture Decision Records (ADR) |
| [notes/project-notes.md](notes/project-notes.md) | Odkrycia, decyzje, notatki bieżące |
| [notes/LINKS.md](notes/LINKS.md) | Linki do repo, narzędzi, serwisów |

---

## Historia (co zostało zrobione)

| Plik | Opis |
|------|------|
| [History/JIMBO_agent_HUB/etap1-done.md](History/JIMBO_agent_HUB/etap1-done.md) | Backend Hub — endpointy, goose-bridge, llm-client, skill-manager |
| [History/JIMBO_agent_HUB/podman-namespace-done.md](History/JIMBO_agent_HUB/podman-namespace-done.md) | Podman Bridge + namespace system + agent-loader |
| [History/JIMBO_agent_HUB/ui-done.md](History/JIMBO_agent_HUB/ui-done.md) | AgentHubPanel UI — layout, CSS, integracja z AssistantPage |
| [History/JIMBO_agent_HUB/infrastruktura-done.md](History/JIMBO_agent_HUB/infrastruktura-done.md) | start_zeno_hub.bat, API_BASE auto-detekcja, MCP |
| [History/JIMBO_agent_HUB/p2-done.md](History/JIMBO_agent_HUB/p2-done.md) | P2: skill export/import, session persistence, Electron autostart, SkillGraph |
| [History/JIMBO_agent_HUB/skill-agent-goose-desktop-2026-04-03.md](History/JIMBO_agent_HUB/skill-agent-goose-desktop-2026-04-03.md) | SkillAgent, GooseSessionImporter, Goose Desktop 41.0.0 |
| [History/JIMBO_agent_HUB/troubleshooting.md](History/JIMBO_agent_HUB/troubleshooting.md) | Rozwiązane problemy (porty, API keys, CSS, routing) |

---

## Workspace Metadata

| Plik | Opis |
|------|------|
| [RULES.instructions.md](RULES.instructions.md) | Reguły agenta, security protocol, session lifecycle |
| [workspace.spec.json](workspace.spec.json) | Specyfikacja projektu (maszynowo-czytelna) |
| [mcp/config.json](mcp/config.json) | MCP servers konfiguracja |
| [secrets/README.md](secrets/README.md) | Gdzie są sekrety i jak je konfigurować |

---

*ZENO Browser — Bonzokoles workspace 2026*
