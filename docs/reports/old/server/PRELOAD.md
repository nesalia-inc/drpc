# Electron Preload Bridge

**Document**: @deessejs/server-electron preload bridge deep dive
**Purpose**: Explain `createPreloadBridge()` implementation in detail

---

## Overview

The preload bridge (`createPreloadBridge`) forwards MessagePorts from the Renderer to the Main Process. Unlike traditional IPC which uses `contextBridge` for invoke-style calls, this pattern forwards a `MessagePort` directly.

## Why MessagePort Over contextBridge?

| aspect | contextBridge (invoke) | MessagePort (this design) |
|--------|------------------------|---------------------------|
| Direction | Renderer → Main only | Bidirectional |
| API style | `window.api.invoke('route', args)` | `port.postMessage()` |
| Streaming | Not native | Native via MessageChannel |
| Type safety | Requires manual wrapper | Type-safe client |
| Complexity | Simple | Moderate |

## The Bridge Pattern

```
Renderer                    Preload                     Main
   │                           │                         │
   │ window.postMessage(       │                         │
   │   'start-deesse-client',  │                         │
   │   '*',                    │                         │
   │   [serverPort]            │                         │
   │) ────────────────────────►│                         │
   │                           │ ipcRenderer.postMessage(│
   │                           │   'start-deesse-server',│
   │                           │   null,                 │
   │                           │   [serverPort]          │
   │                           │) ─────────────────────►│
   │                           │                         │
```

## Preload Implementation

```typescript
// preload/types.ts
export interface PreloadBridge {
  handleMessage(event: MessageEvent): void;
  setup(window: Window): void;
  teardown(window: Window): void;
}

// preload/createPreloadBridge.ts

/**
 * Creates the preload bridge that forwards MessagePorts.
 *
 * @param channelName - The IPC channel for port transfer
 * @returns Preload bridge configuration
 */
export function createPreloadBridge(channelName: string = 'start-deesse-server'): PreloadBridge {
  let currentWindow: Window | null = null;

  return {
    // Called when window receives a message
    handleMessage(event: MessageEvent) {
      // Check if this is our signal to start the client
      if (event.data !== 'start-deesse-client') {
        return;
      }

      // Extract the MessagePort from the event
      const [serverPort] = event.ports;
      if (!serverPort) {
        console.error('No port received in message');
        return;
      }

      // Forward the port to main process via IPC
      ipcRenderer.postMessage(channelName, null, [serverPort]);
    },

    // Setup the listener
    setup(window: Window) {
      currentWindow = window;
      window.addEventListener('message', this.handleMessage);
    },

    // Cleanup
    teardown(window: Window) {
      window.removeEventListener('message', this.handleMessage);
      currentWindow = null;
    }
  };
}
```

## ContextBridge Alternative (invoke-style)

For comparison, here's the traditional contextBridge approach which is simpler but one-directional:

```typescript
// preload/createPreloadApi.ts (alternative - simpler but invoke-only)

export function createPreloadApi() {
  return {
    invoke: (route: string, args: unknown) => {
      return ipcRenderer.invoke('deesse', { route, args });
    }
  };
}

// In preload setup:
contextBridge.exposeInMainWorld('deesse', createPreloadApi());
```

## Security Considerations

### Context Isolation

Ensure BrowserWindow has context isolation enabled:

```typescript
// main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,    // REQUIRED
    nodeIntegration: false,    // REQUIRED
    sandbox: true              // RECOMMENDED
  }
});
```

### What's Exposed

The preload bridge **only** forwards MessagePorts. It does not expose any Node.js APIs directly to the renderer:

```typescript
// What the renderer receives via MessagePort
window.postMessage('start-deesse-client', '*', [serverPort])

// What the renderer CANNOT access
// - No direct Node.js APIs
// - No ipcRenderer.invoke()
// - Only the MessagePort-based client
```

## Complete Preload Setup

```typescript
// electron/preload.ts
import { createPreloadBridge } from '@deessejs/server-electron';

const bridge = createPreloadBridge('start-deesse-server');

// In BrowserWindow, setup the bridge
window.addEventListener('DOMContentLoaded', () => {
  bridge.setup(window);
});

// Or in Electron's preload script context:
contextBridge.exposeInMainWorld('electronBridge', {
  setup: () => bridge.setup(window)
});
```

## Cleanup

Always remove listeners when window unloads:

```typescript
window.addEventListener('unload', () => {
  bridge.teardown(window);
});

// Or for BrowserWindow:
mainWindow.on('closed', () => {
  bridge.teardown(mainWindow.webContents);
});
```

---

## Related

- [HANDLER.md](./HANDLER.md) - Server handler documentation
- [../client/CLIENT.md](../client/CLIENT.md) - Client documentation
- [../README.md](../README.md) - Package overview