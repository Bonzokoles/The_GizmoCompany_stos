// Skill: blog-mybonzoai-stack
// Namespace: blog
// Stack mybonzoai blog — Astro + CF Pages + D1 (jimbo-rag-db + analytics)
// Tags: mybonzoai, astro, cloudflare-pages, d1, rag

# mybonzoai blog — Astro + CF Pages

## Stack
- Astro + CF Pages
- Name: `mybonzoaiblog`

## Cloudflare Bindings
- D1: `jimbo-rag-db` (database_id: 08ec6390-7b9f-4177-8e37-d1daed7c67bc)
- D1: `analytics-db` (database_id: d881af54-3b21-4193-834b-7ac54d5ac44d)

## Klucze
- OPENAI_API_KEY, ANTHROPIC_API_KEY, HUGGINGFACE_API_KEY
- PERPLEXITY_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY

## Deploy
```bash
astro build
wrangler pages deploy dist --project-name mybonzoaiblog
```

## Lokalna replika DB
- `jimbo_rag_db_replica.sql` — lokalna kopia D1
