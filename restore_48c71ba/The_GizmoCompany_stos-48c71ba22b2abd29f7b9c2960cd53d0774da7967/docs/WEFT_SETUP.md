# Weft — Self-Hosted AI Agent Board

> **Weft** to AI task board oparty na Cloudflare Workers, Durable Objects, Workflows i Sandbox.
> Deploy jako **osobna instancja** na Twoim koncie CF — zarządza zadaniami AI z integracjami Gmail, Google Docs, Sheets, GitHub i MCP.

---

## Architektura

```
┌──────────────────────────────────────────┐
│             weft.mybonzo.com             │
│          (CF Pages + Workers)            │
├──────────────────────────────────────────┤
│  BoardDO ──→ Workflows ──→ CF Sandbox   │
│  UserDO      (durable     (containers   │
│               agent loop   for code      │
│               with         execution)    │
│               checkpoints)               │
├──────────────────────────────────────────┤
│  MCP Server Registry                     │
│  ├── Gmail MCP                           │
│  ├── Google Docs MCP                     │
│  ├── Google Sheets MCP                   │
│  └── GitHub MCP                          │
├──────────────────────────────────────────┤
│  CF Access (GitHub OAuth)                │
│  D1 Database                             │
│  AI Gateway (model routing)              │
└──────────────────────────────────────────┘
```

## Wymagania

| Składnik | Status | Uwagi |
|----------|--------|-------|
| CF Workers Paid Plan | ✅ Masz | Wymagany dla DO + Workflows |
| Durable Objects | ✅ Dostępne | BoardDO, UserDO |
| Workflows | ✅ | Durable agent execution loop |
| CF Sandbox (Containers) | ⚠️ Beta | Opcjonalnie — code execution |
| CF Access | ✅ | GitHub OAuth (darmowe 50 użytkowników) |
| D1 Database | ✅ | Task storage |
| AI Gateway | ✅ | Model routing |
| Custom Domain | 📋 Do ustawienia | `weft.mybonzo.com` |

## Deploy — krok po kroku

### 1. Klonuj repozytorium

```powershell
cd U:\
git clone https://github.com/jonesphillip/weft.git weft-board
cd weft-board
npm install
```

### 2. Skonfiguruj wrangler.toml

```toml
name = "weft-board"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[vars]
ENVIRONMENT = "production"

# Durable Objects
[[durable_objects.bindings]]
name = "BOARD_DO"
class_name = "BoardDO"

[[durable_objects.bindings]]
name = "USER_DO"
class_name = "UserDO"

# Workflows
[[workflows]]
name = "agent-workflow"
binding = "AGENT_WORKFLOW"
class_name = "AgentWorkflow"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "weft-db"
database_id = ""  # ← Uzupełnij po `wrangler d1 create weft-db`

# AI Gateway (opcjonalnie)
[ai]
binding = "AI"
```

### 3. Utwórz zasoby CF

```powershell
# D1 Database
npx wrangler d1 create weft-db
# → Skopiuj database_id do wrangler.toml

# Migracje
npx wrangler d1 execute weft-db --file=./migrations/0001_init.sql

# CF Access (w CF Dashboard)
# Zero Trust → Access → Applications → Self-hosted
# Application domain: weft.mybonzo.com
# Policy: Allow → GitHub → Twoja organizacja/email
```

### 4. Sekrety

```powershell
# AI model keys
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY

# GitHub MCP integration
npx wrangler secret put GITHUB_TOKEN

# Google OAuth (jeśli Gmail/Docs/Sheets)
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### 5. Deploy

```powershell
npx wrangler deploy

# Custom domain
npx wrangler domains add weft.mybonzo.com
# LUB w CF Dashboard: Workers → weft-board → Custom Domains → weft.mybonzo.com
```

### 6. Cloudflare Tunnel (opcjonalnie)

```powershell
cloudflared tunnel route dns zeno-tunnel weft.mybonzo.com
```

## Konfiguracja MCP Servers

Weft obsługuje **MCP Server Registry** — pluggable integrations:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "$GITHUB_TOKEN" }
    },
    "gmail": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-gmail"],
      "env": { "GOOGLE_CREDENTIALS": "$GOOGLE_CREDENTIALS" }
    }
  }
}
```

## Scheduled Tasks

Weft wspiera harmonogramowane zadania z human-in-the-loop:

| Typ | Opis | Przykład |
|-----|------|---------|
| Daily | Codziennie o danej godzinie | Podsumowanie GitHub issues |
| Weekly | Raz w tygodniu | Raport tygodniowy analytics |
| Cron | Dowolny cron expression | Backup D1 co 6h |
| One-time | Jednorazowe | Deploy review za 2h |

Każde zaplanowane zadanie może wymagać **human approval** przed wykonaniem.

## Integracja z ZENO Dashboard

Z dashboardu `zenbrowsers.org` możesz linkować do Weft:

```
https://weft.mybonzo.com
```

W przyszłości: dodanie widgetu Weft Tasks w zakładce Overview dashboardu.

## Koszt szacunkowy

| Zasób | Free Tier | Dodatkowy koszt |
|-------|-----------|-----------------|
| Workers | 100k req/dzień | $5/mies. (paid) |
| Durable Objects | 1M req/mies. | $0.15/mln req |
| Workflows | Included w paid | — |
| D1 | 5M reads/dzień | — |
| CF Access | 50 użytkowników | Darmowe |
| **Razem** | — | **~$5-10/mies.** |

## Link do repo

- **GitHub:** https://github.com/jonesphillip/weft
- **Licencja:** Apache 2.0
- **Stars:** ~484
