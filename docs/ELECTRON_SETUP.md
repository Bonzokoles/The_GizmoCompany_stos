# ZENO Electron Browser Setup

## 1. Installation

```bash
# Install dependencies
npm install

# Install Electron build tools
npm install --save-dev electron electron-builder
npm install --save-dev @types/node typescript
```

## 2. Development

```bash
# Start development server
npm run dev

# This starts:
# - Vite dev server (port 5173)
# - Electron app connected to dev server
# - Hot reload for both React and Electron
```

## 3. Build

```bash
# Build for your platform
npm run build

# Or specific platform:
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 4. Project Structure

```
zeno-browser/
├── src/                    # React UI
│   ├── components/        # React components
│   ├── services/          # Frontend services
│   └── styles/            # CSS/styles
├── src-electron/          # Electron main process
│   ├── main.ts           # Main entry
│   ├── preload.ts        # IPC bridge
│   └── services/         # Backend services
├── dist/                 # Built React app
├── dist-electron/        # Built Electron code
├── package.json
└── tsconfig.electron.json
```

## 5. Key Features

- ✅ Multi-tab browser
- ✅ AI Gateway integration (DeepSeek, OpenRouter, EdenAI)
- ✅ Security sandbox per tab
- ✅ Network monitoring
- ✅ Audit logging
- ✅ Floating panels (AI, Security)

## 6. Environment Variables

Create `.env.local`:

```
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=...
EDENAI_API_KEY=...
```

## 7. Next Steps

- Implement actual web rendering (use Chromium/WebKit)
- Deploy backend server for AI Gateway
- Add plugin system
- Create installer

---

✅ Electron setup complete!