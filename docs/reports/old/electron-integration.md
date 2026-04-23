# Electron IPC Integration Report

**Date**: 2026-04-20
**Status**: Ready with Conditions - Implementation planned

---

## 1. Overview

Integrate `@deessejs/server` with Electron IPC using the **MessagePort** pattern. The `@deessejs/server-electron` package enables type-safe RPC communication between main process and renderer.

---

## 2. Architecture Summary

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

---

## 3. Detailed Documentation

For in-depth documentation, see:

| Document | Description |
|----------|-------------|
| [electron/README.md](./electron/README.md) | Package overview and quick start |
| [electron/server/HANDLER.md](./electron/server/HANDLER.md) | Server handler (`createElectronHandler`) deep dive |
| [electron/server/PRELOAD.md](./electron/server/PRELOAD.md) | Preload bridge (`createPreloadBridge`) deep dive |
| [electron/client/CLIENT.md](./electron/client/CLIENT.md) | Client (`createElectronClient`) deep dive |

---

## 4. Package Structure

```
packages/server-electron/           # Main process package
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # createElectronHandler, createPreloadBridge exports
    ├── handler.ts        # createElectronHandler implementation
    ├── preload.ts        # createPreloadBridge implementation
    └── types.ts          # Shared types (RPCMessage, RPCResponse, RPCHandler)

packages/electron-client/           # Renderer process package (separate)
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

// Renderer - from @deessejs/electron-client (separate package!)
import { createElectronClient } from '@deessejs/electron-client';
```

**Package Names** (defined in `packages/*/package.json`):
- `packages/server-electron/package.json` → `"name": "@deessejs/server-electron"`
- `packages/electron-client/package.json` → `"name": "@deessejs/electron-client"`

**Rationale**: The client is in a separate package because the renderer should not bundle any Node.js dependencies. This ensures clean separation and smaller bundle size for the renderer process.

---

## 5. Quick Start

### Main Process

```typescript
import { BrowserWindow } from 'electron';
import { defineContext, createAPI, createPublicAPI } from '@deessejs/server';
import { createElectronHandler } from '@deessejs/server-electron';

// Define context and API
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

// Create handler (only public operations will be accessible)
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
window.addEventListener('message', (event) => {
  if (event.data === 'start-deesse-client') {
    const [serverPort] = event.ports;
    ipcRenderer.postMessage('start-deesse-server', null, [serverPort]);
  }
});
```

### Renderer

```typescript
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

## 6. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| MessagePort over ipcMain.handle/invoke | Bi-directional, native browser API, better for subscriptions |
| Separate package | Keep core framework-agnostic, independent versioning |
| `createPublicAPI()` internally | Security - renderer cannot access internal operations |
| Type-only imports | Prevent Node.js bundling into renderer |
| Route whitelist validation | Prevent path traversal attacks |

---

## 7. Implementation Phases

| Phase | Component | Duration |
|-------|-----------|----------|
| 1 | Server Handler (`createElectronHandler`) | 1-2 days |
| 2 | Preload Bridge (`createPreloadBridge`) | 1 day |
| 3 | Client Factory (`createElectronClient`) | 1-2 days |
| 4 | React Query Integration | 1-2 days |
| 5 | Security Hardening (route validation) | 1 day |
| 6 | Testing & Documentation | 2-3 days |

---

## 8. Comparison with Other Integrations

| Aspect | Hono | Next.js Route Handler | Electron MessagePort |
|--------|------|----------------------|---------------------|
| Transport | HTTP/JSON | HTTP/JSON | MessagePort/Structured Clone |
| Latency | 1-5ms | 1-5ms | 0.1-1ms |
| Use Case | Edge, Serverless | Full-stack Web | Desktop Native |
| Context | Passed per-request | Passed per-request | Shared state |
| Client pattern | HTTP client | HTTP client | RPCLink-like |

---

## 9. Current State Assessment

### Core Components Status

| Component | Status | Location |
|-----------|--------|----------|
| `createAPI()` | ✅ Operational | `packages/server/src/api/factory.ts:251` |
| `createPublicAPI()` | ✅ Auto-filters internal operations | `packages/server/src/api/factory.ts:292` |
| `getPublicRoutes()` | ✅ Returns route whitelist | `packages/server/src/router/builder.ts:25` |
| `Result<Output>` | ✅ Standard return type | `@deessejs/fp` |

### Verdict: **READY WITH CONDITIONS**

| Criterion | Status |
|-----------|--------|
| Core API capable | ✅ |
| Security model | ✅ Internal ops filtered by design |
| Client types | ✅ `typeof appRouter` pattern works |
| MessagePort support | ⚠️ New transport - needs implementation |
| Subscription support | ⚠️ Needs design for bi-directional events |

---

## 10. Identified Risks

### ⚠️ Risk 1: Type Leakage Prevention

**Problem**: Value imports can bundle Node.js into renderer.

**Solution**: Mandatory `import type` for all type imports in renderer.

### ⚠️ Risk 2: Multi-Window Context

**Problem**: Each BrowserWindow needs its own port tracking.

**Solution**: `windowPorts` Map in handler tracks per-port context.

### ⚠️ Risk 3: Route Whitelist Validation

**Problem**: Path traversal attacks possible without validation.

**Solution**: Build `Map<string, Procedure>` from `getPublicRoutes()` at startup.

---

## 11. Next Steps

1. **Phase 0 (Optional)**: Add `api.execute(route, args)` helper for cleaner adapters
2. **Phase 1**: Implement server handler
3. **Phase 2**: Implement preload bridge
4. **Phase 3**: Implement client factory
5. **Phase 4+**: Continue with remaining phases

---

## 12. References

- [electron/README.md](./electron/README.md) - Package overview
- [electron/server/HANDLER.md](./electron/server/HANDLER.md) - Server handler
- [electron/server/PRELOAD.md](./electron/server/PRELOAD.md) - Preload bridge
- [electron/client/CLIENT.md](./electron/client/CLIENT.md) - Client
- [docs/electron-ipc-analysis.md](../docs/electron-ipc-analysis.md) - Existing detailed analysis
- [reports/hono-integration.md](./hono-integration.md) - Similar transport adapter