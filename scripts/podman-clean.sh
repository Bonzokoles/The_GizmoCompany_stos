#!/bin/bash

###############################################################################
# ZENO Browser - Podman Cleanup Script
# Usuwa kontenery, obrazy i cache
###############################################################################

set -e

echo "================================"
echo "🧹 ZENO Browser - Podman Cleanup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Podman
if ! command -v podman &> /dev/null; then
    echo -e "${RED}❌ Podman not found${NC}"
    exit 1
fi

echo "Current containers:"
podman ps -a --filter name=zeno-browser

echo ""
read -p "Remove ZENO Browser containers? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing containers...${NC}"
    podman rm -f $(podman ps -a --filter name=zeno-browser --format '{{.ID}}') 2>/dev/null || true
    echo -e "${GREEN}✅ Containers removed${NC}"
fi

echo ""
echo "ZENO Browser images:"
podman images | grep zeno-browser || echo "No images found"

echo ""
read -p "Remove ZENO Browser images? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing images...${NC}"
    podman rmi -f $(podman images | grep zeno-browser | awk '{print $3}') 2>/dev/null || true
    echo -e "${GREEN}✅ Images removed${NC}"
fi

echo ""
read -p "Run system prune? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Pruning system...${NC}"
    podman system prune -a --volumes -f
    echo -e "${GREEN}✅ System pruned${NC}"
fi

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""