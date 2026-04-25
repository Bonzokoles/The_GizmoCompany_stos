// Skill: blog-generate-workflow
// Namespace: blog
// Pełny workflow generowania artykułu blogowego — research, generacja, zapis do D1, deploy
// Tags: blog, generate, workflow, article, mybonzoai

# Generowanie artykułu blogowego — pełny workflow

## Krok 1: Zbierz materiały (web_search / web_crawler agent)

Użyj agenta `web-crawler` lub `data-researcher` przez HUB:
```bash
# Uruchom agenta przez JIMBO HUB (port 4222)
POST http://localhost:4222/agent/run
{
  "task": "Zbierz 5 najnowszych artykułów o [temat] i zapisz do /tmp/research.json",
  "agent": "data-researcher"
}
```

## Krok 2: Wygeneruj artykuł przez /chat

```bash
POST http://localhost:4222/chat
{
  "message": "Napisz artykuł blogowy o [temat] po polsku. Długość: 800-1200 słów. Format: markdown z sekcjami H2/H3. Styl: techniczny ale przystępny.",
  "model": "claude-sonnet-4-6"
}
```

### Struktura artykułu (wymuszaj w promptcie):
```markdown
# Tytuł (SEO-friendly, max 60 znaków)

**TL;DR:** Jedno zdanie co czytelnik wyniesie z artykułu.

## Wprowadzenie
(2-3 akapity, hook + problem który rozwiązujemy)

## [Sekcja 1 — główna teza]
## [Sekcja 2 — techniczne szczegóły / przykłady]
## [Sekcja 3 — praktyczne zastosowanie]

## Podsumowanie
(bullet points z kluczowymi wnioskami)

---
*Tagi: tag1, tag2, tag3*
*Kategoria: AI / DevOps / Web*
```

## Krok 3: Zapis do D1 (mybonzoaiblog)

```typescript
const post = {
  slug: 'artykul-o-temacie',
  title: 'Tytuł artykułu',
  content: markdownContent,
  tags: ['ai', 'devops'],
  published_at: new Date().toISOString(),
  status: 'draft'  // najpierw draft, potem publish
};

INSERT INTO posts (slug, title, content, tags, published_at, status)
VALUES (?, ?, ?, ?, ?, ?)
```

## Krok 4: Deploy (opcjonalnie)

```bash
# mybonzoai blog
astro build && wrangler pages deploy dist --project-name mybonzoaiblog

# jimbo.org
npm run build && vercel --prod
```

## Szybki przykład — jeden prompt

```
POST http://localhost:4222/chat
{
  "message": "Napisz artykuł blogowy po polsku na temat: 'Jak działa system MOA (Mixture of Agents) w ZENO Browser'. Użyj struktury: wstęp → architektura → flow danych → praktyczne przykłady → podsumowanie. Styl: techniczny blog deweloperski."
}
```

## Modele do wyboru

| Zadanie | Model |
|---------|-------|
| Długi artykuł (1000+ słów) | `claude-sonnet-4-6` |
| Szybki draft / szkic | `claude-haiku-4-5-20251001` |
| Research + synteza | `google/gemini-2.0-flash-001` (OpenRouter) |
| Tłumaczenie EN→PL | `deepseek-chat` (tani, dobry do PL) |
