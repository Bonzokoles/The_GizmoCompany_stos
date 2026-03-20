# ZENO Browser - Podman Setup Guide

## Co to jest Podman?

Podman to bezpieczna alternatywa dla Docker, która:
- ✅ Nie wymaga demona rootowego
- ✅ Jest kompatybilna z Docker
- ✅ Obsługuje compose pliki Docker
- ✅ Jest dostępny na Linux, macOS i Windows

## Instalacja Podman

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install podman podman-compose
```

### Linux (Fedora/RHEL)
```bash
sudo dnf install podman podman-compose
```

### macOS
```bash
brew install podman podman-compose
```

### Windows
1. Pobierz z https://podman.io/docs/installation
2. Uruchom installer
3. Zainstaluj WSL2 (Windows Subsystem for Linux)

## Quick Start

### 1. Setup
```bash
chmod +x scripts/podman-setup.sh
./scripts/podman-setup.sh
```

### 2. Development
```bash
podman-compose -f podman-compose.yml up zeno-browser-dev
```

Aplikacja będzie dostępna na `http://localhost:5173`

### 3. Production
```bash
podman-compose -f podman-compose.yml up zeno-browser
```

Aplikacja będzie dostępna na `http://localhost:3000`

## Polecenia Podman

### Build image
```bash
podman build -f Podfile -t zeno-browser:latest .
podman build -f Podfile.dev -t zeno-browser:dev .
```

### Run container
```bash
# Development
podman run -it \
  -v $(pwd):/app \
  -p 5173:5173 \
  -p 9222:9222 \
  --env-file .env.local \
  zeno-browser:dev

# Production
podman run -d \
  -p 3000:3000 \
  --env-file .env.local \
  --name zeno-browser \
  zeno-browser:latest
```

### Podman Compose
```bash
# Start all services
podman-compose -f podman-compose.yml up

# Start specific service
podman-compose -f podman-compose.yml up zeno-browser-dev

# Stop all
podman-compose -f podman-compose.yml down

# View logs
podman-compose -f podman-compose.yml logs -f

# Execute command
podman-compose -f podman-compose.yml exec zeno-browser-dev bash

# Remove images
podman-compose -f podman-compose.yml down --rmi all
```

## Podman vs Docker

| Cecha | Podman | Docker |
|-------|--------|--------|
| Wymaga root | ❌ Nie | ✅ Tak |
| Daemon | ❌ Nie | ✅ Tak |
| Docker CLI compatible | ✅ Tak | - |
| Compose support | ✅ Tak | ✅ Tak |
| Security | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Environment Variables

Utwórz `.env.local`:

```bash
# DeepSeek
DEEPSEEK_API_KEY=sk-xxx...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxx...

# EdenAI
EDENAI_API_KEY=edxxx...

# Cloudflare
CF_TUNNEL_TOKEN=eyJhIjoxMjM...
CF_ACCOUNT_ID=xxx...

# Development
NODE_ENV=development
DEBUG=true
```

## Troubleshooting

### Podman nie znaleziony
```bash
podman --version
# Jeśli nie działa, zainstaluj ponownie
```

### Brak uprawnień
```bash
# Dla Linux: dodaj użytkownika do grupy
sudo usermod -aG podman $USER
newgrp podman
```

### Port już zajęty
```bash
# Zmień port w podman-compose.yml
ports:
  - "8080:3000"  # Zamiast 3000:3000
```

### Permission denied
```bash
# Sprawdź uprawnienia pliku
ls -la Podfile
# Jeśli potrzeba, dodaj uprawnienia
chmod 644 Podfile
```

### Limity zasobów
```bash
# Ustaw limity (macOS/Windows)
podman machine set --memory 4096

# Usuń cache aby zwolnić przestrzeń
podman system prune -a
```

## Performance Tips

### 1. Używaj `.dockerignore` (działa też w Podman)
```
node_modules
.git
.next
dist
build
```

### 2. Multi-stage builds
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["npm", "start"]
```

### 3. Layer caching
```dockerfile
# ✅ Dobrze - zmienia się rzadko
FROM node:20-alpine
COPY package*.json ./
RUN npm ci

# ❌ Źle - zmienia się co build
COPY . .
RUN npm run build
```

## Networking

### Dostęp między kontenerami
```bash
# Podman automatycznie stwórz sieć
podman network create zeno-net

podman run --network zeno-net --name backend ...
podman run --network zeno-net --name frontend ...

# Teraz frontend może dostać się do backend pod `http://backend:3000`
```

## Development Workflow

```bash
# 1. Build development image
podman build -f Podfile.dev -t zeno-browser:dev .

# 2. Run z volume mount
podman run -it \
  -v $(pwd):/app \
  -p 5173:5173 \
  zeno-browser:dev

# 3. Zmiany w kodzie są od razu widoczne (hot-reload)

# 4. Ctrl+C aby zatrzymać
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Build with Podman
  run: |
    podman build -f Podfile -t zeno-browser:${{ github.sha }} .
    podman tag zeno-browser:${{ github.sha }} zeno-browser:latest
```

## Dalsze Kroki

- 📚 [Dokumentacja Podman](https://docs.podman.io/)
- 🐳 [Dokumentacja Podman Compose](https://github.com/containers/podman-compose)
- 🔐 [Security best practices](https://docs.podman.io/en/latest/markdown/podman.1.html#security)

---

✅ Podman setup gotowy! 🚀