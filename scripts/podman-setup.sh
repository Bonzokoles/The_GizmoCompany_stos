#!/bin/bash

###############################################################################
# ZENO Browser - Podman Setup Script
# Instalacja i konfiguracja Podman dla ZENO Browser
###############################################################################

set -e

echo "================================"
echo "🐳 ZENO Browser - Podman Setup"
echo "================================"
echo ""

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed!"
    echo ""
    echo "Install Podman:"
    echo "  Ubuntu/Debian: sudo apt-get install podman"
    echo "  Fedora: sudo dnf install podman"
    echo "  macOS: brew install podman"
    echo "  Windows: Download from https://podman.io/docs/installation"
    exit 1
fi

echo "✅ Podman detected: $(podman --version)"
echo ""

# Check if podman-compose is installed
if ! command -v podman-compose &> /dev/null; then
    echo "⚠️  podman-compose not found"
    echo "Installing podman-compose..."
    
    if command -v pip3 &> /dev/null; then
        pip3 install --user podman-compose
    else
        echo "❌ pip3 not found. Please install podman-compose manually:"
        echo "   pip3 install podman-compose"
        exit 1
    fi
fi

echo "✅ podman-compose detected: $(podman-compose --version)"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local..."
    cat > .env.local << EOF
# API Keys
DEEPSEEK_API_KEY=your_deepseek_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
EDENAI_API_KEY=your_edenai_key_here

# Cloudflare
CF_TUNNEL_TOKEN=your_cf_tunnel_token
CF_ACCOUNT_ID=your_cf_account_id

# Environment
NODE_ENV=development
EOF
    echo "✅ .env.local created (edit it with your API keys)"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "================================"
echo "📦 Building Podman Images"
echo "================================"
echo ""

# Build images
podman-compose -f podman-compose.yml build

echo ""
echo "✅ Podman setup complete!"
echo ""
echo "Usage:"
echo "  Development:  podman-compose -f podman-compose.yml up zeno-browser-dev"
echo "  Production:   podman-compose -f podman-compose.yml up zeno-browser"
echo "  Stop:         podman-compose -f podman-compose.yml down"
echo ""
echo "View logs:      podman-compose -f podman-compose.yml logs -f"
echo "Exec command:   podman-compose -f podman-compose.yml exec zeno-browser-dev bash"
echo ""