#!/bin/bash

###############################################################################
# ZENO Browser - Podman Production Script
# Deployment production build z Podman
###############################################################################

set -e

echo "================================"
echo "🏭 ZENO Browser - Production"
echo "================================"
echo ""

# Check Podman
if ! command -v podman &> /dev/null; then
    echo "❌ Podman not found"
    exit 1
fi

echo "✅ Podman: $(podman --version)"
echo ""

# Get version from package.json
VERSION=$(grep '"version"' package.json | head -1 | awk -F'"' '{print $4}')

echo "📝 Building version: $VERSION"
echo ""

# Build image
echo "📦 Building production image..."
podman build -f Podfile -t zeno-browser:$VERSION .
podman tag zeno-browser:$VERSION zeno-browser:latest

echo ""
echo "✅ Build complete!"
echo ""

# Ask if should run
read -p "Run container now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting container..."
    
    podman run -d \
      --name zeno-browser \
      -p 3000:3000 \
      --env-file .env.local \
      --restart unless-stopped \
      zeno-browser:latest
    
    echo "✅ Container running!"
    echo ""
    echo "Access: http://localhost:3000"
    echo ""
    echo "Commands:"
    echo "  View logs:    podman logs -f zeno-browser"
    echo "  Stop:         podman stop zeno-browser"
    echo "  Remove:       podman rm zeno-browser"
fi

echo ""
echo "Image information:"
echo "  Repository: zeno-browser"
echo "  Tags: $VERSION, latest"
echo ""
echo "To push to registry:"
echo "  podman tag zeno-browser:latest registry.example.com/zeno-browser:latest"
echo "  podman push registry.example.com/zeno-browser:latest"
echo ""