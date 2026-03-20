#!/bin/bash

###############################################################################
# ZENO Browser - Multi-Platform Installer Builder
# Buduje NSIS (Windows), DMG (macOS), AppImage (Linux)
###############################################################################

set -e

echo "================================"
echo "📦 ZENO Browser Installer Builder"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get version
VERSION=$(grep '"version"' package.json | head -1 | awk -F'"' '{print $4}')
echo -e "${BLUE}Building version: $VERSION${NC}"
echo ""

# Determine OS
OS=$(uname -s)

case "$OS" in
  Linux*)
    echo -e "${YELLOW}🐧 Building for Linux...${NC}"
    npm run build:appimage
    echo -e "${GREEN}✅ AppImage created${NC}"
    ;;
  Darwin*)
    echo -e "${YELLOW}🍎 Building for macOS...${NC}"
    npm run build:dmg
    echo -e "${GREEN}✅ DMG created${NC}"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo -e "${YELLOW}🪟 Building for Windows...${NC}"
    npm run build:nsis
    echo -e "${GREEN}✅ NSIS Installer created${NC}"
    ;;
  *)
    echo -e "${RED}❌ Unknown OS: $OS${NC}"
    exit 1
    ;;
esac

echo ""
echo "Build artifacts:"
ls -lh dist/ | grep -E '\.(exe|dmg|AppImage)$'

echo ""
echo -e "${GREEN}✅ Installer build complete!${NC}"