# REVIEW ASSISTANT ECOSYSTEM

## 🎬 Kompletny System Recenzji Filmowych + Baza Danych

### Przegląd
Zunifikowany ekosystem łączący:
- **Review Assistant GUI** - Generator recenzji (OpenAI GPT-4o)
- **Biblioteka 250 recenzji** - 50 filmów × 5 stylów literackich
- **Movies Database** - Katalog filmów z metadanymi
- **Unified Database** - Połączona baza 58 filmów

---

## 📁 Struktura Projektu

```
M:\REVIEW_ASSISTANT_APP\
├── review_assistant_gui.py           # GUI aplikacja (OpenAI)
├── ReviewAssistant.bat               # Launcher GUI
├── START_ECOSYSTEM.bat               # Główny launcher (ALL-IN-ONE)
│
├── cinema_reviews_chatml.jsonl       # 250 recenzji (ChatML)
├── cinema_reviews_completion.jsonl   # 250 recenzji (Completion)
│
├── MOVIES_DATA_BASE/                 # Katalog filmów
│   ├── MOVIES_DATA_BASE_index.html   # Dashboard HTML
│   ├── movies_data.json              # 8 filmów z metadata
│   ├── katalog_filmowy.json          # 7 kategorii tematycznych
│   └── posters/                      # Plakaty filmowe
│
├── unified_movie_database.json       # Zunifikowana baza (58 filmów)
├── explore_reviews.py                # Explorer recenzji
├── unify_databases.py                # Generator unified DB
└── README.md                         # Ta dokumentacja
```

---

## 🚀 Uruchomienie

### Opcja 1: Launcher ALL-IN-ONE (Rekomendowane)
```bash
START_ECOSYSTEM.bat
```

**Menu:**
1. Review Assistant GUI (OpenAI)
2. Movies Database Dashboard (HTML)
3. Explore Reviews Library (Python)
4. Open ALL (GUI + Dashboard + Library)

### Opcja 2: Osobne Komponenty

```bash
# Review Assistant GUI
ReviewAssistant.bat

# Movies Database Dashboard
start MOVIES_DATA_BASE\MOVIES_DATA_BASE_index.html

# Review Explorer
python explore_reviews.py

# Unify Databases
python unify_databases.py
```

---

## 📊 Statystyki

### Biblioteka Recenzji
```
Total recenzji: 250
Filmów unikalnych: 50
Stylów: 5
Średnia długość: 5,346 znaków (~850 słów)
Total znaków: 1,336,485
Format: JSONL (ChatML + Completion)
Rozmiar: 1.49 MB × 2
```

### Movies Database
```
Filmy z metadata: 8
Kategorie tematyczne: 7
Unified database: 58 filmów (50 z recenzjami + 8 z metadata)
```

---

## 🎭 5 Stylów Literackich


1. **Akademicki** - Profesjonalny, analityczny, obiektywny
2. **Bukowski** - Cyniczny, surowy, brutalnie szczery  
3. **Hunter S. Thompson** - Gonzo journalism, chaotyczny, intensywny
4. **Witold Gombrowicz** - Filozoficzny, egzystencjalny, ironiczny
5. **Sławomir Mrożek** - Satyryczny, absurdalny, krytyczny

---

## 🗂️ Kategorie Filmowe (Movies Database)

1. **Psychodeliczne, ale bez horroru** - Upstream Color, Holy Motors, Enter the Void
2. **Czułe o miłości, bez kiczu** - Blue Valentine, Her, Before Sunrise
3. **Urban Decay** - Gummo, Heaven Knows What, Taxi Driver
4. **Kino o outsiderach** - The Station Agent, Wendy and Lucy, Napoleon Dynamite
5. **Brudna, uliczna poezja** - Dead Man, Fish Tank, Blue Ruin
6. **Senne i eteryczne** - A Ghost Story, Drive, Solaris
7. **Kino o życiu bez ściemy** - Frances Ha, Inside Llewyn Davis, Win Win

---

## 💾 Formaty Danych

### 1. ChatML Format (cinema_reviews_chatml.jsonl)
```json
{
  "messages": [
    {"role": "system", "content": "Jesteś ekspertem recenzji..."},
    {"role": "user", "content": "Napisz recenzję filmu 12 Monkeys..."},
    {"role": "assistant", "content": "[PEŁNA RECENZJA]"}
  ]
}
```

### 2. Completion Format (cinema_reviews_completion.jsonl)
```json
{
  "prompt": "Napisz recenzję filmu 12 Monkeys w stylu akademickim",
  "completion": "[PEŁNA RECENZJA]"
}
```

### 3. Movies Database (movies_data.json)
```json
{
  "movies": [
    {
      "id": "gummo-1997",
      "title": "Gummo",
      "year": 1997,
      "director": "Harmony Korine",
      "category": "urban-decay",
      "tags": ["outsider", "experimental", "off"],
      "poster": "posters/gummo.jpg"
    }
  ]
}
```

### 4. Unified Database (unified_movie_database.json)
```json
[
  {
    "title": "12 Monkeys",
    "year": null,
    "director": "Unknown",
    "reviews": [
      {"style": "akademicki", "content": "...", "length": 5033},
      {"style": "bukowski", "content": "...", "length": 4867}
    ],
    "has_reviews": true,
    "review_count": 5
  }
]
```

---

## 🔧 Narzędzia

### explore_reviews.py
**Funkcje:**
- `list_all_films()` - Lista 50 filmów
- `find_review(film, style)` - Wyszukiwanie
- `print_stats()` - Statystyki
- `show_example(film, style)` - Przykład

**Użycie:**
```python
from explore_reviews import find_review

# Znajdź recenzję
reviews = find_review("12 Monkeys", "bukowski")
print(reviews[0]['review'])
```

### unify_databases.py
**Funkcje:**
- `load_movies_database()` - Wczytaj metadata
- `load_reviews()` - Wczytaj recenzje
- `create_unified_index()` - Statystyki
- `export_unified_json()` - Eksport unified DB

**Użycie:**
```bash
python unify_databases.py

# Output:
# UNIFIED MOVIE DATABASE INDEX
# Filmy w movies_data.json: 8
# Filmy z recenzjami: 50
# Total unikalnych: 58
```

---

## 📖 Przykłady Użycia

### Python: Wczytanie Recenzji
```python
import json

# ChatML format
with open('cinema_reviews_chatml.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        review = json.loads(line)
        film = review['messages'][1]['content'].split('(')[0]
        content = review['messages'][2]['content']
        print(f"Film: {film}")
        print(f"Review: {content[:200]}...")
        break
```

### JavaScript: Movies Database
```javascript
fetch('MOVIES_DATA_BASE/movies_data.json')
  .then(r => r.json())
  .then(data => {
    data.movies.forEach(m => {
      console.log(`${m.title} (${m.year}) - ${m.director}`);
    });
  });
```

### Bash: Szybka Analiza
```bash
# Liczba recenzji
wc -l cinema_reviews_chatml.jsonl
# Output: 251

# Lista filmów (unikalne)
python -c "import json; print('\n'.join(sorted(set([json.loads(l)['messages'][1]['content'].split('(')[0].strip().replace('Napisz recenzję filmu ', '') for l in open('cinema_reviews_chatml.jsonl', 'r', encoding='utf-8')]))))"
```

---

## 🎬 Lista Filmów z Recenzjami (Top 20)

1. 12 Monkeys (5 recenzji, avg 5033 chars)
2. A Clockwork Orange (5 recenzji, avg 4867 chars)
3. A Hidden Life (5 recenzji, avg 5678 chars)
4. Blade Runner (5 recenzji, avg 5217 chars)
5. Blade Runner 2049 (5 recenzji, avg 5634 chars)
6. Bram Stoker's Dracula (5 recenzji, avg 6108 chars)
7. Bug (5 recenzji, avg 5999 chars)
8. Dark City (5 recenzji, avg 5278 chars)
9. Fear and Loathing in Las Vegas (5 recenzji)
10. Forrest Gump (5 recenzji)
11. Gran Torino (5 recenzji)
12. Jacob's Ladder (5 recenzji)
13. K-PAX (5 recenzji)
14. La Haine (5 recenzji)
15. No Country for Old Men (5 recenzji)
16. Pulp Fiction (5 recenzji)
17. The Big Lebowski (5 recenzji)
18. True Romance (5 recenzji)
19. We Need to Talk About Kevin (5 recenzji)
20. You Were Never Really Here (5 recenzji)

... + 30 więcej filmów (total 50)

---

## ⚙️ Konfiguracja Review Assistant

### Modele OpenAI
- **GPT-4o-2024-11-20** (domyślny)
- GPT-4o-mini
- GPT-3.5-turbo

### Parametry
- **Temperature**:
  - Translator: 0.3 (precyzja)
  - Generator: 0.7 (kreatywność)
- **Max Tokens**: 4000

### API Key
Wbudowany w `ReviewAssistant.bat` i `START_ECOSYSTEM.bat`

---

## 📚 Powiązane Zasoby

- **Źródło biblioteki**: `H:\MISTRAL_TRAINNING_DATA\training_data\`
- **Źródło movies DB**: `H:\MISTRAL_TRAINNING_DATA\MOVIES_DATA_BASE\`
- **Dataset treningowy**: cinema_reviews_chatml.jsonl (250 linii)

---

## 🔍 Przykład Recenzji

**Film**: Fear and Loathing in Las Vegas (1998)  
**Styl**: Bukowski (cyniczny)

```
Las Vegas to szczelina w dupie Ameryki, przez którą wypływa cała jej obłuda.
Thompson i Gilliam wiedzieli o tym doskonale. To nie jest film o narkotykach.
To film o tym, jak amerykański sen zjadł sam siebie i zwymiotował na wykładzinę
w motelu Circus Circus...

[Pełna recenzja: 5400 znaków]
```

---

## 📝 TODO / Roadmap

- [ ] Integracja z TMDB API (automatyczne pobieranie posterów)
- [ ] Generator HTML z recenzjami (static site)
- [ ] Export do PDF/EPUB (ebook z recenzjami)
- [ ] AI-powered recommendations engine
- [ ] React/Next.js frontend dla unified database

---

## 👨‍💻 Autor

**Bonzo** (JIMBO Inc.)  
**Data**: 2025-11  
**Wersja**: 4.0 (UNIFIED ECOSYSTEM)

---

## 📄 Licencja

Prywatny projekt - JIMBO Inc.

---

**KOMPLETNY EKOSYSTEM RECENZJI FILMOWYCH - GOTOWY DO UŻYCIA** 🎬✅
