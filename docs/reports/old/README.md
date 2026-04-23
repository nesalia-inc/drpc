# @deessejs/server-electron

**Date**: 2026-04-20
**Status**: Ready with Conditions - Implementation planned

---

## Overview

The `@deessejs/server-electron` package integrates `@deessejs/server` with Electron IPC using the **MessagePort** pattern. This enables type-safe RPC communication between the Main Process and Renderer Process.

## Architecture

```
Renderer Process                    Main Process
       │                                 │
       │    MessageChannel               │
       │    port1 (client)               │
       │    port2 (server) ──────────────┼──► ipcMain.on('start-deesse-server')
       │                                 │          │
       │                                 │    handler.upgrade(port)
       │                                 │          │
       │◄────────────────────────────────│          │
       │    port1.postMessage()           │          │
       │    (type-safe RPC calls)         │          │
```

## Package Structure

```
packages/server-electron/           # Main process package
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Main exports (createElectronHandler, createPreloadBridge)
    ├── handler.ts        # createElectronHandler implementation
    ├── preload.ts        # createPreloadBridge implementation
    └── types.ts          # Shared types (RPCMessage, RPCResponse, RPCHandler, etc.)

packages/electron-client/           # Renderer process package (separate for bundle isolation)
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # createElectronClient export
    └── client.ts         # Client implementation
```

### Exports

```typescript
// Main process - from @deessejs/server-electron
import { createElectronHandler, createPreloadBridge } from '@deessejs/server-electron';

// Renderer - from @deessejs/electron-client
import { createElectronClient } from '@deessejs/electron-client';
```

**Important**: The client is in a separate package because:
- Renderer should not bundle Node.js dependencies
- Smaller bundle size for renderer
- Independent versioning from server package

## Key Design Decisions

### MessagePort Communication

Uses `MessagePort` instead of `ipcMain.handle/invoke` for:
- Native browser API, works across contexts
- Better for streaming/long-lived connections
- Bi-directional communication on same port
- Modern RPC pattern (used by orpc, etc.)

### Security

- `internalQuery` and `internalMutation` are **NOT** exposed via IPC
- `createPublicAPI()` is used internally
- Type-only imports required in renderer
- Route whitelist validation

---

## Detailed Documentation

### [Server Handler (Main Process)](./server/HANDLER.md)

Deep dive into `createElectronHandler()`:
- MessagePort upgrading
- Route execution
- Multi-window context handling
- Event forwarding

### [Preload Bridge](./server/PRELOAD.md)

Deep dive into `createPreloadBridge()`:
- MessagePort forwarding
- Window-to-main communication
- Security considerations

### [Electron Client](./client/CLIENT.md)

Deep dive into `createElectronClient()`:
- Type-safe router proxy
- MessagePort-based communication
- Subscription support

---

## Quick Start

### Main Process

```typescript
import { BrowserWindow } from 'electron';
import { defineContext, createAPI, createPublicAPI } from '@deessejs/server';
import { createElectronHandler } from '@deessejs/server-electron';

const { t } = defineContext({
  context: { db: myDatabase, logger: console }
});

const appRouter = t.router({
  users: t.router({
    get: t.query({ handler: async (ctx, args) => { /* ... */ } }),
    create: t.mutation({ handler: async (ctx, args) => { /* ... */ } }),
    delete: t.internalMutation({ handler: async (ctx, args) => { /* ... */ } }) // NOT exposed
  })
});

const api = createAPI({ router: appRouter });
const publicApi = createPublicAPI(api);

const handler = createElectronHandler(publicApi, {
  context: { db: myDatabase, logger: console }
});

app.whenReady().then(() => {
  ipcMain.on('start-deesse-server', async (event) => {
    const [port] = event.ports;
    // Get the window that sent this message to pass window info
    const window = BrowserWindow.fromWebContents(event.sender);
    handler.upgrade(port, {
      windowId: window?.id ?? -1,
      windowLabel: window?.getTitle() ?? 'unknown'
    });
    port.start();
  });
});
```

### Preload

```typescript
// electron/preload.ts
window.addEventListener('message', (event) => {
  if (event.data === 'start-deesse-client') {
    const [serverPort] = event.ports;
    ipcRenderer.postMessage('start-deesse-server', null, [serverPort]);
  }
});
```

### Renderer

```typescript
// renderer/app.tsx
import { createElectronClient } from '@deessejs/electron-client';
import type { AppRouter } from 'shared/types';

const { port1, port2 } = new MessageChannel();
window.postMessage('start-deesse-client', '*', [port2]);

const deesse = createElectronClient<AppRouter>({ port: port1 });
port1.start();

// Type-safe call
const user = await deesse.users.get({ id: 1 });
```

---

## Implementation Phases

| Phase | Component | Duration | Status |
|-------|-----------|----------|--------|
| 1 | Server Handler | 1-2 days | Pending |
| 2 | Preload Bridge | 1 day | Pending |
| 3 | Client Factory | 1-2 days | Pending |
| 4 | React Query Integration | 1-2 days | Pending |
| 5 | Security Hardening | 1 day | Pending |
| 6 | Testing & Documentation | 2-3 days | Pending |

---

## Related Documentation

- [../hono-integration.md](../hono-integration.md) - Similar transport adapter pattern
- [../../docs/electron-ipc-analysis.md](../../docs/electron-ipc-analysis.md) - Existing detailed analysis