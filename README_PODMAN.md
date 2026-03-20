# ZENO Browser - Podman Setup

## 📋 Spis treści

1. [Szybki Start](#szybki-start)
2. [Instalacja Podman](#instalacja-podman)
3. [Polecenia](#polecenia)
4. [Troubleshooting](#troubleshooting)

## 🚀 Szybki Start

```bash
# 1. Setup
chmod +x scripts/podman-setup.sh
./scripts/podman-setup.sh

# 2. Development
chmod +x scripts/podman-dev.sh
./scripts/podman-dev.sh

# 3. Production
chmod +x scripts/podman-prod.sh
./scripts/podman-prod.sh
```

## 📥 Instalacja Podman

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install podman podman-compose

# Fedora/RHEL
sudo dnf install podman podman-compose
```

### macOS
```bash
brew install podman podman-compose

# Uruchom maszynę Podman
podman machine init
podman machine start
```

### Windows
```bash
# Zainstaluj WSL2 najpierw
# Pobierz Podman Desktop: https://podman.io/

# Lub via Chocolatey
choco install podman-desktop
```

## ⚡ Polecenia

### Development
```bash
# Szybki start
./scripts/podman-dev.sh

# Lub manualnie
podman-compose -f podman-compose.yml up zeno-browser-dev
```

### Production
```bash
# Szybki start
./scripts/podman-prod.sh

# Lub manualnie
podman-compose -f podman-compose.yml up zeno-browser
```

### Zarządzanie
```bash
# Pokaż kontenery
podman ps -a

# Pokaż obrazy
podman images

# Logi
podman logs -f zeno-browser

# Exec
podman exec -it zeno-browser bash

# Stop
podman stop zeno-browser

# Remove
podman rm zeno-browser
```

### Cleanup
```bash
./scripts/podman-clean.sh

# Lub manualnie
podman system prune -a --volumes
```

## 🆘 Troubleshooting

### Podman command not found
```bash
podman --version
# Jeśli nie działa: zainstaluj ponownie
```

### Permission denied
```bash
# Linux: dodaj do grupy
sudo usermod -aG podman $USER
newgrp podman

# macOS: nie potrzeba
```

### Port już zajęty
Zmień port w `podman-compose.yml`:
```yaml
ports:
  - "8080:3000"  # zamiast 3000:3000
```

### Brak połączenia z siecią
```bash
# Stwórz sieć
podman network create zeno-net

# Użyj w compose
networks:
  default:
    name: zeno-net
```

## 📚 Więcej Informacji

- [Dokumentacja Podman](https://docs.podman.io/)
- [Podman Compose](https://github.com/containers/podman-compose)
- [Pełny Setup Guide](docs/PODMAN_SETUP.md)

---

✅ Gotowy do pracy z Podman! 🚀