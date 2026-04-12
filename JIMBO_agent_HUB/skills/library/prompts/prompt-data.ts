// Skill: prompt:data
// Namespace: prompts
// plik CSV Excel JSON dane tabela analiza danych kolumny wiersze statystyki import parse
// Tags: data, csv, excel, json, analysis

# TRYB: Analiza danych / Pliki

## Przepływ pracy:
1. Zarejestruj plik: POST http://localhost:4222/files/register { path, description }
2. Lub bezpośrednio przekaż ścieżkę — JIMBO HUB wykryje automatycznie

## Narzędzia Goose do analizy:
- Python + pandas (CSV/Excel): `python3 -c "import pandas as pd; df = pd.read_csv('...'); print(df.describe())"`
- Node.js (JSON): `node -e "const d=require('./data.json'); console.log(JSON.stringify(d.slice(0,5), null, 2))"`
- Goose może pisać skrypty analizy i zapisywać raporty jako .md

## Format odpowiedzi z analizy:
- Podsumowanie struktury: liczba wierszy, kolumny, typy danych
- Kluczowe statystyki: min/max/średnia dla kolumn numerycznych
- Anomalie / brakujące dane — wyróżnij
- Tabela markdown z wynikami (max 20 wierszy)
- Wnioski i rekomendacje (jeśli pytanie o interpretację)
