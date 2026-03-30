# Cloudflare Tunnel Setup Guide

## 1. Install cloudflared

### macOS
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Linux
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### Windows
Download from: https://github.com/cloudflare/cloudflared/releases

## 2. Create Cloudflare Tunnel

```bash
# Authenticate with Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create zeno-browser

# Get tunnel credentials (token)
cloudflared tunnel token zeno-browser
```

## 3. Configure Environment Variables

Add to `.env.local`:

```bash
CF_TUNNEL_TOKEN=eyJhI...   # Your tunnel token
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
```

## 4. Configure Routes in Application

In your Electron main process:

```typescript
import { tunnelBridge } from './services/tunnel-ui-bridge';

const tunnelConfig = {
  name: 'zeno-browser',
  accountId: process.env.CF_ACCOUNT_ID,
  tunnelToken: process.env.CF_TUNNEL_TOKEN,
  routes: [
    {
      hostname: 'zeno-browser.yourdomain.com',
      service: 'http://localhost:3000',
    },
    {
      hostname: 'zenon.yourdomain.com',
      service: 'http://localhost:4000',
    },
    {
      hostname: 'mcp.yourdomain.com',
      service: 'http://localhost:5000',
    },
  ],
};

await tunnelBridge.initialize(tunnelConfig);
```

## 5. Usage in React

```typescript
const electronAPI = (window as any).electronAPI;

// Get tunnel status
const status = await electronAPI.tunnel?.status?.();

// Get metrics
const metrics = await electronAPI.tunnel?.metrics?.();

// Reconnect
await electronAPI.tunnel?.reconnect?.();
```

## 6. Monitor in Dashboard

Your services are now accessible:
- https://zeno-browser.yourdomain.com
- https://zenon.yourdomain.com
- https://mcp.yourdomain.com

All traffic is:
- ✅ Secure (HTTPS)
- ✅ Encrypted
- ✅ DDoS protected
- ✅ Monitored

---

✅ Cloudflare tunnel setup complete!