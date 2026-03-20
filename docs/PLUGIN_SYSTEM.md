# ZENO Browser Plugin System

## Quick Start

### 1. Creating a Plugin

Create a new TypeScript file:

```typescript
import { BasePlugin, PluginMetadata, PluginContext } from '@zeno/plugin-api';

export default class MyAwesomePlugin extends BasePlugin {
  getMetadata(): PluginMetadata {
    return {
      id: 'my-awesome-plugin',
      name: 'My Awesome Plugin',
      version: '1.0.0',
      author: 'Your Name',
      description: 'Does something awesome',
      capabilities: ['ui-panel', 'ai-integration'],
      permissions: [
        {
          name: 'network',
          description: 'Make network requests',
          level: 'read',
        },
      ],
    };
  }

  async onLoad(context: PluginContext): Promise<void> {
    console.log('Plugin loaded!');

    // Create UI panel
    const panelHandle = await context.api.createPanel({
      id: 'my-awesome-panel',
      title: 'My Awesome Panel',
      component: MyAwesomeComponent,
    });

    // Register command
    context.api.registerCommand({
      id: 'my-awesome-plugin:do-something',
      title: 'Do Something Awesome',
      execute: async () => {
        console.log('Doing something awesome!');
      },
    });

    // Listen to events
    context.api.on('tab-created', (tabId) => {
      console.log('New tab created:', tabId);
    });
  }

  async onUnload(): Promise<void> {
    console.log('Plugin unloaded!');
  }

  async onEnable(): Promise<void> {
    console.log('Plugin enabled!');
  }

  async onDisable(): Promise<void> {
    console.log('Plugin disabled!');
  }
}
```

### 2. Using Plugin API

```typescript
// Call AI
const response = await context.api.callAI({
  prompt: 'What is 2+2?',
  maxTokens: 100,
});

// Get browser tabs
const tabs = await context.api.getTabs();

// Store data
await context.storage.set('my-key', { data: 'value' });

// Show notification
context.api.showNotification('Hello!', 'info');
```

### 3. Installing Plugin

From marketplace:
```
Open Plugin Explorer → Search → Install
```

From local file:
```typescript
await electronAPI.plugin?.load?.('file:///path/to/plugin.js');
```

## Plugin API Reference

### Core Methods

- `createPanel(options)` - Create floating UI panel
- `registerCommand(definition)` - Register command
- `registerShortcut(definition)` - Register keyboard shortcut
- `callAI(request)` - Call AI Gateway
- `getTabs()` - Get all browser tabs
- `navigateTo(tabId, url)` - Navigate to URL
- `executeScript(code, tabId)` - Execute JavaScript

### Storage

```typescript
await context.storage.set('key', value);
const value = await context.storage.get('key');
await context.storage.remove('key');
await context.storage.clear();
```

### Events

```typescript
context.api.on('tab-created', (tabId) => {});
context.api.on('tab-closed', (tabId) => {});
context.api.on('ai-response', (response) => {});
context.api.emit('custom-event', data);
```

## Distribution

### 1. Publish to Marketplace

```bash
npm run build
npm run publish

# Follow marketplace registration process
```

### 2. Direct Distribution

Share plugin file directly (.js or .zip)

## Permissions Model

Plugins can request:
- `network` - Make HTTP requests
- `storage` - Access local storage
- `clipboard` - Read/write clipboard
- `camera` - Access camera
- `microphone` - Access microphone

## Security

- All plugins run in sandboxed context
- Permissions must be explicitly requested
- Network requests are monitored
- Plugin code is validated before execution

---

Happy plugin development! 🎉