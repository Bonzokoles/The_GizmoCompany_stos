// Skill: blog-jimbo77-stack
// Namespace: blog
// Stack jimbo77 blog
// Tags: jimbo77, blog

# jimbo77.com — Blog/Community

## Stack
- Next.js + OpenNext (CF Workers adapter)
- Deploy: Cloudflare Workers (wrangler deploy)
- Name: `the-jimbo77com-nxt`

## Bindings
- R2: `jimbo77com-assets` (media, zdjęcia)
- Admin: ADMIN_KEY=Haos1977

## Deploy
```bash
npx opennextjs-cloudflare build
wrangler deploy
```

## Dostęp do R2 w Next.js (CF Workers)
```typescript
export const runtime = 'edge';
```
