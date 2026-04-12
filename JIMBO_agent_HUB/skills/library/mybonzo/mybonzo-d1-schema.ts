// Skill: mybonzo-d1-schema
// Namespace: mybonzo
// Schemat bazy D1 mybonzo — tabele, kolumny, typowe zapytania
// Tags: d1, database, schema, mybonzo, sqlite

# mybonzo D1 — Schemat bazy danych

## Binding: `mybonzo` (database_id: 84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3)
## Dostęp w Astro SSR: `locals.runtime.env.DB`

## Kluczowe tabele

### admin_storage (key-value store)
```sql
CREATE TABLE admin_storage (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Typowe zapytania CF Worker/Astro
```typescript
// Odczyt
const result = await env.DB.prepare('SELECT value FROM admin_storage WHERE key = ?')
  .bind(key).first<{value: string}>();

// Zapis
await env.DB.prepare('INSERT OR REPLACE INTO admin_storage (key, value) VALUES (?, ?)')
  .bind(key, JSON.stringify(data)).run();
```

## R2: mybonzo-finanse
- Pliki finansowe (faktury PDF, dokumenty)
- Dostęp: `locals.runtime.env.R2_FINANSE`
```typescript
const obj = await env.R2_FINANSE.get(key);
await env.R2_FINANSE.put(key, body, { httpMetadata: { contentType } });
```
