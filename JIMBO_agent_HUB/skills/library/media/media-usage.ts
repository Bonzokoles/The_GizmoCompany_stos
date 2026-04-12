// Skill: media-usage
// Namespace: media
// Jak używać mydia (media processing), CF Images i R2 do obsługi mediów
// Tags: media, mydia, images, r2, cloudflare

# Media — jak używać mydia (media processing)

## Kontener (namespace: media)

| Kontener | Opis | Port |
|----------|------|------|
| `mydia` | Media processing service | 8765 |

## Sprawdź status

```bash
GET http://localhost:4222/podman/containers
# Szukaj 'mydia' → status: running

POST http://localhost:4222/podman/containers/mydia/start
GET http://localhost:4222/podman/containers/mydia/logs?lines=50
```

## Aktywuj namespace

```bash
POST http://localhost:4222/namespaces/activate
{ "namespace": "media" }
```

## Typowe zadania medialne przez JIMBO HUB /chat

### Generowanie obrazów (przez CF Workers AI lub HuggingFace)
```
POST http://localhost:4222/chat
{
  "message": "Wygeneruj miniaturkę do artykułu blogowego o 'AI Agents' — ciemny styl tech, 1200x630px",
  "namespaces": ["media"]
}
```

### Przetwarzanie obrazów
```
POST http://localhost:4222/chat
{
  "message": "Zmień rozmiar obrazu /assets/hero.png do 800x400px i zapisz jako webp",
  "namespaces": ["media"]
}
```

## mydia API (bezpośrednie)

```bash
# Przetwórz obraz
POST http://localhost:8765/process
{
  "input": "/path/to/image.jpg",
  "operations": [
    { "type": "resize", "width": 800, "height": 400 },
    { "type": "convert", "format": "webp", "quality": 85 }
  ],
  "output": "/path/to/output.webp"
}

# Status zadania
GET http://localhost:8765/jobs/{jobId}

# Lista przetworzonych plików
GET http://localhost:8765/files
```

## Cloudflare Images (alternatywa dla R2)

```bash
# Upload obrazu do CF Images
POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v1
  -H "Authorization: Bearer {CF_API_TOKEN}"
  -F file=@image.jpg

# Dostęp przez URL:
# https://imagedelivery.net/{account_hash}/{image_id}/public
# https://imagedelivery.net/{account_hash}/{image_id}/thumbnail  (auto-resize)
```

## R2 — storage dla mediów

```bash
# Upload przez wrangler
npx wrangler r2 object put mybonzo-finanse/images/hero.jpg --file=hero.jpg

# Lub przez hub (jeśli projekt ma binding R2)
POST http://localhost:4222/chat
{
  "message": "Uploaduj plik hero.webp do R2 bucket mybonzo-finanse w folderze /images/blog/",
  "namespaces": ["media"]
}
```

## Przykładowe pytania do BUCH (z namespace media)

```
"Utwórz miniaturkę artykułu o Cloudflare Workers (1200x630, dark tech style)"
"Skompresuj wszystkie obrazy w folderze /assets/ do webp"
"Sprawdź czy mydia kontener działa"
"Wygeneruj logo dla projektu jimbo.org z ikoną AI"
"Uploaduj przetworzone obrazy do R2 bucket mybonzo-finanse"
```
