// Skill: finance-usage
// Namespace: finance
// Jak używać modułów finansowych mybonzo.com (faktury, VAT, D1, AI Doradca) przez JIMBO HUB
// Tags: finance, faktury, vat, d1, mybonzo, ai-doradca

# Finance — jak używać modułów finansowych mybonzo.com

## Stack finansowy

- **mybonzo.com** — moduł `/finanse` (faktury, VAT, ryzyko AI)
- **D1:** `mybonzo` (database_id: 84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3) — tabele: faktury, klienci, produkty
- **R2:** `mybonzo-finanse` — dokumenty finansowe (PDF faktury, wyciągi)
- **AI:** Gemini Vision do OCR faktur, gpt-4o do analizy finansowej

## Aktywuj namespace

```bash
POST http://localhost:4222/namespaces/activate
{ "namespace": "finance" }
```

## Pytania finansowe do BUCH przez HUB /chat

```bash
POST http://localhost:4222/chat
{
  "message": "...",
  "namespaces": ["finance"]
}
```

### Faktury i VAT
```
"Pokaż niezapłacone faktury za ostatni miesiąc z D1 mybonzo"
"Oblicz VAT do zapłaty za Q1 2026"
"Wygeneruj fakturę dla klienta Kowalski sp. z o.o. za usługi AI, kwota 5000 PLN netto"
"Jaki jest całkowity przychód za marzec 2026?"
```

### Analiza finansowa (AI Doradca — Rola 4: Analityk)
```
"Przeanalizuj płynność finansową firmy na podstawie danych z D1"
"Oblicz EBITDA za ostatni kwartał"
"Oceń ryzyko finansowe dla projektu X wartego 50k PLN"
"Stwórz prognozę cashflow na następne 3 miesiące"
```

### CRM — klienci i sprzedaż
```
"Pokaż top 10 klientów wg przychodu z D1"
"Który klient jest najbardziej zagrożony churnem?"
"Stwórz raport pipeline sprzedaży dla tenantId meblepumo"
```

## D1 — zapytania finansowe (bezpośrednie)

```bash
# Przez JIMBO HUB
POST http://localhost:4222/projects/mybonzo-new/d1/query
{
  "sql": "SELECT * FROM faktury WHERE status='nieoplacona' AND tenant_id='meblepumo' ORDER BY data_wystawienia DESC LIMIT 20",
  "params": []
}

# Sumuj przychody
POST http://localhost:4222/projects/mybonzo-new/d1/query
{
  "sql": "SELECT strftime('%Y-%m', data_wystawienia) as miesiac, SUM(kwota_brutto) as suma FROM faktury WHERE tenant_id=? GROUP BY miesiac ORDER BY miesiac DESC",
  "params": ["meblepumo"]
}
```

## R2 — dokumenty finansowe

```bash
# Listuj dokumenty
GET http://localhost:4222/chat
{ "message": "Wylistuj dokumenty w R2 bucket mybonzo-finanse dla klienta Kowalski" }

# Upload faktury PDF
POST http://localhost:4222/chat
{ "message": "Zapisz wygenerowaną fakturę FV/2026/03/001 do R2 mybonzo-finanse/faktury/2026/03/" }
```

## AI Doradca — Role finansowe

| Rola | Kiedy używać | Model |
|------|-------------|-------|
| Księgowy AI | Faktury, VAT, deklaracje | Gemini Flash |
| Analityk Finansowy | EBITDA, cashflow, ryzyko | gpt-4o |
| Prawnik Biznesowy | Umowy, RODO, spory | Claude Sonnet |
| Doradca CRM | Pipeline, lead scoring | Claude Haiku |

```bash
# Wymuś rolę finansową w chacie
POST http://localhost:4222/mybonzo/chat
{
  "message": "Oblicz podatek VAT do zapłaty za Q1 2026 na podstawie faktur z D1",
  "role": "ksiegowy"
}
```

## Przykładowe zadania finansowe dla Goose

```bash
POST http://localhost:4222/agent/run
{
  "task": "Pobierz wszystkie niezapłacone faktury z D1 mybonzo dla tenantId meblepumo, oblicz łączną kwotę, wyślij raport do pliku /reports/zaleglosci-2026-04.md",
  "agent": "data-researcher"
}
```
