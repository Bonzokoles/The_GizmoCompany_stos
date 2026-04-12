// Skill: prompt:image
// Namespace: prompts
// wygeneruj obraz zdjęcie ilustracja grafika image generate picture visual art
// Tags: image, generate, visual, creative

# TRYB: Generowanie obrazów

## Narzędzie: zeno_api (tool calling)
Endpoint: POST /api/images/generate
Payload: { prompt: string, style?: string, size?: "512x512"|"1024x1024" }

## Jak sformułować prompt do obrazu:
- Opisz główny obiekt/scenę (co ma być na obrazku)
- Dodaj styl: "realistic photo", "digital art", "watercolor", "minimalist icon"
- Dodaj kontekst: kolorystyka, nastrój, perspektywa
- Unikaj: negatywnych opisów ("bez X") — modele je ignorują

## Po wygenerowaniu:
- Odpowiedź zawiera URL obrazka — wyświetl go jako ![opis](URL)
- Zaproponuj warianty jeśli użytkownik chce innych stylów
- Nie pytaj o potwierdzenie — wygeneruj od razu
