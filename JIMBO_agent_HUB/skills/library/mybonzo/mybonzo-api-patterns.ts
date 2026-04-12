// Skill: mybonzo-api-patterns
// Namespace: mybonzo
// Wzorce API Astro SSR dla mybonzo.com — endpointy, auth, error handling
// Tags: api, astro, patterns, mybonzo, cloudflare

# mybonzo.com — Wzorce API Astro SSR

## Plik API w src/pages/api/

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  // Dostęp do env (SSR — NIE process.env!)
  const env = locals.runtime?.env;
  const apiKey = env?.OPENAI_API_KEY;

  try {
    const body = await request.json() as { query: string };

    // AI call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: body.query }]
      })
    });

    return new Response(JSON.stringify(await response.json()), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};
```

## Secrets (dodaj przez Wrangler)
```bash
npx wrangler pages secret put OPENAI_API_KEY --project-name mybonzo-new
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name mybonzo-new
npx wrangler pages secret put GOOGLE_API_KEY --project-name mybonzo-new
```

## Lokalne testy
```bash
npx wrangler pages dev dist --compatibility-flag=nodejs_compat
```
