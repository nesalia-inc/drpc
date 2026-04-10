# Electron IPC Integration Report

**Date**: 2026-04-09
**Status**: Analyzed - Ready for implementation planning

---

## 1. Overview

Integrate `@deessejs/server` with Electron IPC (Inter-Process Communication). The `@deessejs/server-electron` package exposes procedures from main process to renderer via secure IPC.

---

## 2. Architecture

### 2.1 Request Flow

```
Renderer Process                    Main Process
       │                                 │
       │    contextBridge (secure)       │
       │    exposes limited API          │
       └──────────┬──────────────────────┘
                  │
         ┌────────▼────────┐
         │   preload.js     │
         │  (bridge only)   │
         └──────────────────┘
                  │
         ipcRenderer.invoke()
                  │
         ipcMain.handle()
```

### 2.2 IPC Mapping

| @deessejs/server | Electron IPC |
|------------------|--------------|
| `api.execute("users.get", { id: 1 })` | `ipcRenderer.invoke('deesse', { route: "users.get", args: { id: 1 } })` |
| Route handler (HTTP adapter) | `ipcMain.handle()` |
| Public routes | Only `query` and `mutation` exposed |
| Internal routes | Not exposed via IPC |

### 2.3 Security Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS                          │
│  @deessejs/server with db, logger, userId                 │
│  ipcMain.handle('deesse', async (_event, { route, args }) │
└────────────────────────────────────────────────────────────┘
                           │
                    IPC Channel: 'deesse'
                           │
┌────────────────────────────────────────────────────────────┐
│                      PRELOAD SCRIPT                         │
│  contextBridge.exposeInMainWorld('deesse', {              │
│    invoke: (route, args) => ipcRenderer.invoke(...)       │
│  })                                                       │
└────────────────────────────────────────────────────────────┘
                           │
                    window.deesse
                           │
┌────────────────────────────────────────────────────────────┐
│                     RENDERER PROCESS                        │
│  createElectronClient({ invoke: window.deesse.invoke })  │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Proposed API

### 3.1 Target Usage Pattern

**Main Process:**

```typescript
// electron/main.ts
import { defineContext, createAPI, createPublicAPI } from '@deessejs/server';
import { createElectronHandler } from '@deessejs/server-electron/main';

const { t, createAPI } = defineContext({
  context: { db, logger: console }
});

const api = createAPI({
  router: t.router({
    users: t.router({
      get: t.query({ handler: async (ctx, args) => ... }),
      create: t.mutation({ handler: async (ctx, args) => ... }),
      delete: t.internalMutation({ handler: async (ctx, args) => ... }) // NOT exposed
    })
  })
});

createElectronHandler(createPublicAPI(api));
```

**Preload Script:**

```typescript
// electron/preload.ts
import { createPreloadApi } from '@deessejs/server-electron/preload';
contextBridge.exposeInMainWorld('deesse', createPreloadApi('deesse'));
```

**Renderer:**

```typescript
// renderer/app.tsx
import { createElectronClient } from '@deessejs/server-electron/client';

const deesse = createElectronClient({
  invoke: (route, args) => window.deesse.invoke(route, args)
});

// Type-safe call
const user = await deesse.users.get({ id: 1 });
```

### 3.2 Package Structure

```
packages/server-electron/
├── package.json
├── tsconfig.json
└── src/
    ├── main/
    │   ├── createElectronHandler.ts    # ipcMain.handle() wrapper
    │   ├── types.ts                    # IPC message types
    │   └── index.ts
    ├── preload/
    │   ├── createPreloadApi.ts         # contextBridge utilities
    │   └── index.ts
    ├── client/
    │   ├── createElectronClient.ts     # Client factory
    │   └── index.ts
    └── shared/
        └── protocol.ts                 # Shared protocol types
```

---

## 4. Key Design Decisions

### 4.1 Separate Package

**Decision**: Create `@deessejs/server-electron` as a separate package.

**Rationale**:
- Keeps core framework-agnostic
- Electron is optional integration
- Allows independent versioning

### 4.2 Internal Operations Filtering

**Decision**: `internalQuery` and `internalMutation` are **NOT** exposed via IPC by default.

**Implementation**: `createElectronHandler()` uses `createPublicAPI()` internally.

**Rationale**: Security - renderer should not have access to privileged operations.

### 4.3 Single IPC Channel

**Decision**: Use single channel 'deesse' with message-based routing.

```typescript
interface IPCMessage {
  route: string;   // "users.get"
  args: unknown;   // { id: 1 }
}
```

### 4.4 Error Serialization

**Decision**: Only serialize error `code` and `message`, never stack traces.

```typescript
return {
  ok: false,
  error: { code: result.error.code, message: result.error.message }
};
```

### 4.5 Context Passing

**Decision**: Main process context (db, logger) stays in main process.

Context is created once when setting up the handler and stays local.

---

## 5. Error to IPC Mapping

| Error Code | Behavior |
|------------|----------|
| `NOT_FOUND` | Return `{ ok: false, error: { code: 'NOT_FOUND', ... } }` |
| `VALIDATION_ERROR` | Return `{ ok: false, error: { code: 'VALIDATION_ERROR', ... } }` |
| `UNAUTHORIZED` | Return `{ ok: false, error: { code: 'UNAUTHORIZED', ... } }` |
| `FORBIDDEN` | Return `{ ok: false, error: { code: 'FORBIDDEN', ... } }` |
| `INTERNAL_ERROR` | Return `{ ok: false, error: { code: 'INTERNAL_ERROR', ... } }` |

---

## 6. Dependencies

```json
{
  "name": "@deessejs/server-electron",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@deessejs/server": "workspace:*",
    "@deessejs/fp": "workspace:*"
  },
  "peerDependencies": {
    "electron": "^32.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "electron": "^32.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 7. Implementation Phases

### Phase 1: Core IPC Handler (1-2 days)
- [ ] Create `packages/server-electron/` structure
- [ ] Implement `createElectronHandler()` for main process
- [ ] Set up basic IPC channel 'deesse'
- [ ] Route parsing and execution
- [ ] Error serialization

### Phase 2: Preload API (1 day)
- [ ] Implement `createPreloadApi()` for contextBridge
- [ ] `invoke()` function for renderer-to-main calls
- [ ] `on()` function for main-to-renderer events
- [ ] Document security settings for BrowserWindow

### Phase 3: Client Factory (1-2 days)
- [ ] Create `createElectronClient()` function
- [ ] Router proxy for type-safe calls
- [ ] Result type handling

### Phase 4: Integration with React Query (1-2 days)
- [ ] Create React hooks wrapper (`useQuery`, `useMutation`)
- [ ] Cache key handling from procedure metadata
- [ ] Automatic invalidation after mutations

### Phase 5: Security Hardening (1 day)
- [ ] Route format validation
- [ ] Input sanitization
- [ ] Error message sanitization

### Phase 6: Testing and Documentation (2-3 days)
- [ ] Unit tests for IPC handler
- [ ] Integration tests with Electron
- [ ] Example Electron app

---

## 8. Comparison with Other Integrations

| Aspect | Hono | Next.js Route Handler | Electron IPC |
|--------|------|----------------------|--------------|
| Transport | HTTP/JSON | HTTP/JSON | Structured Clone |
| Latency | 1-5ms | 1-5ms | 0.1-1ms |
| Use Case | Edge, Serverless | Full-stack Web | Desktop Native |
| Context | Passed per-request | Passed per-request | Shared state |
| Internal ops | Not exposed | Not exposed | Not exposed |

---

## 9. Next Steps

1. Create `packages/server-electron/` directory
2. Initialize with `package.json` and `tsconfig.json`
3. Implement `createElectronHandler()` for main process
4. Implement `createPreloadApi()` for preload script
5. Implement `createElectronClient()` for renderer
6. Write tests
7. Create example Electron app

---

## 10. References

- [docs/electron-ipc-analysis.md](../../docs/electron-ipc-analysis.md) - Existing detailed analysis
- [reports/hono-integration.md](./hono-integration.md) - Similar transport adapter pattern
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/ipc-main)
- [Electron Context Isolation](https://www.electronjs.org/docs/tutorial/context-isolation)
- [Electron Security Best Practices](https://www.electronjs.org/docs/tutorial/security)
