// Skill: mybonzo-usage
// Namespace: mybonzo
// Jak używać mybonzo.com ERP/CRM przez JIMBO HUB — finanse, CRM, projekty, AI Doradca
// Tags: mybonzo, erp, crm, usage, ai-doradca, workflow

# mybonzo.com — jak używać ERP/CRM przez JIMBO HUB

## Endpoint dedykowany mybonzo

```bash
# Chat z kontekstem mybonzo (automatycznie wstrzykuje mybonzo skille)
POST http://localhost:4222/mybonzo/chat
{ "message": "...", "role": "ksiegowy" }   # role: ksiegowy/prawnik/hr/analityk/crm/strateg

# Status serwisu mybonzo
GET http://localhost:4222/mybonzo/status

# Listuj projekty mybonzo
GET http://localhost:4222/mybonzo/projects

# Skille mybonzo z bazy
GET http://localhost:4222/mybonzo/skills

# Seed skilli mybonzo
POST http://localhost:4222/mybonzo/skills/seed
```

## Aktywuj namespace

```bash
POST http://localhost:4222/namespaces/activate
{ "namespace": "mybonzo" }
```

## Moduły i jak ich używać

### Finanse (`/finanse`)
```
"Pokaż niezapłacone faktury z D1 mybonzo dla tenanta meblepumo"
"Wygeneruj fakturę VAT dla klienta X, usługa: konsultacja AI, 3000 PLN netto"
"Oblicz łączny VAT do zapłaty za marzec 2026"
```

### CRM (`/crm-klienci`)
```
"Pokaż top 5 klientów wg wartości zamówień"
"Dodaj nowego klienta: ACME sp. z o.o., NIP: 1234567890"
"Jakie leady są w fazie 'negocjacje' w pipeline?"
```

### Magazyn (`/magazyn`)
```
"Sprawdź stan magazynowy produktu SKU-001"
"Które produkty mają stan poniżej minimum?"
"Stwórz zamówienie do dostawcy X dla produktów z niedoborem"
```

### Projekty (`/projekty`)
```
"Pokaż wszystkie aktywne projekty dla klienta meblepumo"
"Ile godzin zostało zafakturowane w projekcie 'Wdrożenie ERP Q1'?"
"Dodaj milestone 'Testy UAT' do projektu ID 5, deadline: 2026-04-20"
```

### AI Doradca (`/ai-biznes-erp`) — 6 ról

```bash
POST http://localhost:4222/mybonzo/chat
{ "message": "Oceń ryzyko finansowe nowego klienta z obrotem 50k PLN", "role": "analityk" }

# Role:
# ksiegowy   → faktury, VAT, KUP, bilans (model: Gemini Flash)
# prawnik    → umowy, RODO, prawo pracy (model: Claude Sonnet)
# hr         → rekrutacja, urlopy, wynagrodzenia (model: Claude Haiku)
# analityk   → EBITDA, cashflow, ryzyko (model: gpt-4o)
# crm        → pipeline, lead scoring, sprzedaż (model: Claude Haiku)
# strateg    → strategia biznesowa, decyzje (model: Claude Sonnet)
```

### Dziennik firmowy (`/dziennik`)
```
"Dodaj wpis do dziennika: 'Podpisano umowę z ACME sp. z o.o. na kwotę 15k PLN'"
"Eksportuj dziennik z marca 2026 do PDF"
"Pokaż wszystkie wpisy dotyczące klienta meblepumo"
```

## D1 mybonzo — bezpośrednie zapytania

```bash
POST http://localhost:4222/projects/mybonzo-new/d1/query
{ "sql": "SELECT * FROM klienci WHERE tenant_id=? LIMIT 10", "params": ["meblepumo"] }

# Tabele D1 mybonzo:
# klienci, faktury, produkty, zamowienia, projekty, wpisy_dziennika, ai_raporty
```

## Zadania Goose dla mybonzo

```bash
POST http://localhost:4222/agent/run
{
  "task": "Pobierz dane z D1 mybonzo (tabela: faktury, tenant: meblepumo), stwórz raport PDF z podsumowaniem miesięcznym i zapisz do R2 mybonzo-finanse/raporty/2026-04.pdf",
  "agent": "data-researcher"
}
```

## Wrangler — lokalna praca z D1

```bash
npx wrangler d1 execute mybonzo --command="SELECT * FROM klienci LIMIT 5"
npx wrangler pages dev dist --compatibility-flag=nodejs_compat  # lokalny dev server
npm run deploy  # astro build + deploy do CF Pages
```

## Deploy mybonzo.com

```bash
POST http://localhost:4222/projects/mybonzo-new/deploy
# lub
astro build && wrangler pages deploy dist --project-name mybonzo-new
```

## Przykładowe zadania biznesowe dla BUCH

```
"Podsumuj sytuację finansową firmy meblepumo na dziś — przychody, zobowiązania, cashflow"
"Który klient generuje największy przychód w Q1 2026?"
"Przygotuj raport dla księgowego: VAT naliczony vs. należny za marzec"
"Zaplanuj strategię follow-up dla 5 leadów w fazie 'oferta wysłana'"
"Sprawdź które projekty przekraczają budżet i powiadom PM-a"
```
