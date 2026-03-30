#!/bin/bash

###############################################################################
# ZENO Browser - Complete Setup Guide
# Kompletna instalacja i konfiguracja ZENO Browser
###############################################################################

set -e

echo "╔═════════════════════════════��══════════════════════════════════╗"
echo "║        🚀 ZENO Browser - Complete Setup Guide                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Functions
log_step() {
    echo -e "${BLUE}▶${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_section() {
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ============================================================================
# STEP 1: System Requirements Check
# ============================================================================

log_section "STEP 1: System Requirements"

log_step "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found"
    echo "Install from: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
log_success "Node.js detected: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    log_error "npm not found"
    exit 1
fi
NPM_VERSION=$(npm -v)
log_success "npm detected: $NPM_VERSION"

# Check Git
if ! command -v git &> /dev/null; then
    log_error "Git not found"
    echo "Install from: https://git-scm.com/"
    exit 1
fi
log_success "Git detected: $(git --version)"

# ============================================================================
# STEP 2: Repository Setup
# ============================================================================

log_section "STEP 2: Repository Setup"

if [ ! -d .git ]; then
    log_step "Initializing Git repository..."
    git init
    log_success "Repository initialized"
else
    log_success "Git repository already initialized"
fi

# ============================================================================
# STEP 3: Dependencies Installation
# ============================================================================

log_section "STEP 3: Installing Dependencies"

log_step "Installing Node packages..."
npm ci

log_success "Dependencies installed"

# ============================================================================
# STEP 4: Environment Configuration
# ============================================================================

log_section "STEP 4: Environment Configuration"

if [ ! -f .env.local ]; then
    log_step "Creating .env.local..."
    cat > .env.local << EOF
# API Keys - DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# API Keys - OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key_here

# API Keys - EdenAI
EDENAI_API_KEY=your_edenai_api_key_here

# Cloudflare
CF_TUNNEL_TOKEN=your_cf_tunnel_token
CF_ACCOUNT_ID=your_cf_account_id
CF_API_TOKEN=your_cf_api_token

# Environment
NODE_ENV=development
DEBUG=false

# GitHub (optional)
GITHUB_TOKEN=your_github_token_here
EOF
    log_success ".env.local created"
    log_warning "Please edit .env.local with your API keys"
else
    log_success ".env.local already exists"
fi

# ============================================================================
# STEP 5: Build & Compilation
# ============================================================================

log_section "STEP 5: Building Application"

log_step "Building React app..."
npm run build:vite
log_success "React app built"

log_step "Building Electron main process..."
npm run build:electron
log_success "Electron app built"

# ============================================================================
# STEP 6: Optional Components
# ============================================================================

log_section "STEP 6: Optional Components"

read -p "Install documentation locally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_step "Installing documentation..."
    cd website
    npm ci
    npm run build
    cd ..
    log_success "Documentation built"
fi

echo ""
read -p "Setup Podman for containerization? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_step "Setting up Podman..."
    chmod +x scripts/podman-setup.sh
    ./scripts/podman-setup.sh
    log_success "Podman setup complete"
fi

# ============================================================================
# STEP 7: Development Setup
# ============================================================================

log_section "STEP 7: Development Setup"

log_step "Running tests..."
npm run test:unit
log_success "Tests passed"

log_step "Type checking..."
npm run type-check
log_success "Type checking passed"

# ============================================================================
# STEP 8: Summary
# ============================================================================

log_section "Setup Complete! 🎉"

echo -e "${GREEN}ZENO Browser is ready for development${NC}"
echo ""
echo "Next steps:"
echo -e "  ${CYAN}1. Edit .env.local with your API keys${NC}"
echo -e "  ${CYAN}2. Run: npm run dev${NC}"
echo -e "  ${CYAN}3. Open http://localhost:5173${NC}"
echo ""
echo "Resources:"
echo -e "  ${CYAN}📖 Docs: https://zeno-browser.io${NC}"
echo -e "  ${CYAN}🐛 Issues: https://github.com/Bonzokoles/zen-bro-wser.org/issues${NC}"
echo -e "  ${CYAN}💬 Discussions: https://github.com/Bonzokoles/zen-bro-wser.org/discussions${NC}"
echo ""
echo "Happy coding! 🚀"