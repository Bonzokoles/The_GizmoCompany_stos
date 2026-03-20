# 🚀 ZENO Browser - Quick Start Guide

## 30-Second Setup

```bash
# 1. Clone repository
git clone https://github.com/Bonzokoles/zen-bro-wser.org.git
cd zen-bro-wser.org

# 2. Run setup script
chmod +x COMPLETE_SETUP_GUIDE.sh
./COMPLETE_SETUP_GUIDE.sh

# 3. Configure API keys
nano .env.local

# 4. Start development
npm run dev
```

## Opening the App

After running `npm run dev`:

1. **Frontend**: <http://localhost:5173>
2. **Electron**: Automatically opens

## First Configuration

### AI Setup

1. Click 🤖 AI Assistant
2. Enter DeepSeek API key in Settings
3. Test with: "Hello, what's 2+2?"

### CloudFlare Tunnel (Optional)

1. Get tunnel token: <https://dash.cloudflare.com/>
2. Add to `.env.local`: `CF_TUNNEL_TOKEN=...`
3. Restart application

### Plugins

1. Click 🔌 Plugin Manager
2. Browse marketplace
3. Install plugins

## File Structure

```text
zeno-bro-wser.org/
├── src/                 # React frontend
├── src-electron/        # Electron main process
├── website/            # Docusaurus docs
├── scripts/            # Build & utility scripts
├── package.json        # Dependencies
├── electron-builder.config.js  # Installer config
└── .env.local          # Configuration (create it)
```

## Common Commands

```bash
# Development
npm run dev              # Start dev environment
npm run dev:vite        # Frontend only
npm run dev:electron    # Electron only

# Building
npm run build           # Full build
npm run build:vite      # Frontend
npm run build:electron  # Electron

# Installers
npm run dist            # All installers
npm run build:nsis      # Windows
npm run build:dmg       # macOS
npm run build:appimage  # Linux

# Testing
npm run test            # All tests
npm run test:unit       # Unit tests only
npm run test:coverage   # Coverage report
npm run test:e2e        # E2E tests
npm run test:watch      # Watch mode

# Quality
npm run lint            # Linting
npm run lint:fix        # Fix issues
npm run format          # Format code
npm run type-check      # TypeScript check

# Documentation
cd website && npm run start  # Docs locally
cd website && npm run build  # Build docs

# Container (Podman)
podman-compose -f podman-compose.yml up
```

## Environment Variables

Create `.env.local`:

```bash
# Required for AI features
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
EDENAI_API_KEY=edxxx...

# Optional
CF_TUNNEL_TOKEN=eyJhI...
NODE_ENV=development
```

Get API keys from:

- 🧠 [DeepSeek](https://platform.deepseek.com/)
- 🔀 [OpenRouter](https://openrouter.io/)
- 🚀 [EdenAI](https://www.edenai.co/)
- ☁️ [Cloudflare](https://dash.cloudflare.com/)

## Troubleshooting

### Port already in use

```bash
# Change port in vite.config.ts
# Or kill process:
lsof -ti:5173 | xargs kill -9
```

### Node modules issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build errors

```bash
npm run clean
npm install
npm run build
```

### Electron won't start

```bash
# Clear cache
rm -rf ~/.electron-gyp

# Rebuild
npm rebuild
npm run dev
```

## Next Steps

1. 📖 [Read Full Documentation](https://zeno-browser.io)
2. 🔌 [Create Your First Plugin](website/docs/plugin-development/overview.md)
3. 🐛 [Report Issues](https://github.com/Bonzokoles/zen-bro-wser.org/issues)
4. 💬 [Join Community](https://github.com/Bonzokoles/zen-bro-wser.org/discussions)

---

**Happy coding!** 🚀
