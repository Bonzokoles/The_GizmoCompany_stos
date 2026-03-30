#!/bin/bash

###############################################################################
# ZENO Browser - Podman Development Script
# Szybki start development environment z Podman
###############################################################################

set -e

echo "================================"
echo "🚀 Starting ZENO Browser Dev"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Podman
if ! command -v podman &> /dev/null; then
    echo -e "${RED}❌ Podman not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Podman: $(podman --version)${NC}"
echo ""

# Build image
echo -e "${YELLOW}📦 Building development image...${NC}"
podman build -f Podfile.dev -t zeno-browser:dev .

echo ""
echo -e "${YELLOW}🚀 Starting container...${NC}"

# Run container
podman run -it \
  --name zeno-browser-dev \
  -v $(pwd):/app \
  -p 5173:5173 \
  -p 9222:9222 \
  --env-file .env.local \
  --rm \
  zeno-browser:dev

echo ""
echo -e "${GREEN}✅ Development environment started!${NC}"
echo ""
echo "Access points:"
echo "  - Frontend (Vite):   http://localhost:5173"
echo "  - Debug port:        http://localhost:9222"
echo ""