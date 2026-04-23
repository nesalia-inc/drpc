# Electron Server Handler

**Document**: @deessejs/server-electron handler deep dive
**Purpose**: Explain `createElectronHandler()` implementation in detail

---

## Overview

The server handler (`createElectronHandler`) upgrades a `MessagePort` to an RPC handler that executes `@deessejs/server` procedures via the public API proxy.

## Types

```typescript
// types.ts
export interface RPCHandler {
  upgrade(port: MessagePort, windowInfo?: { windowId: number; windowLabel: string }): void;  // Window info must be passed since MessagePort doesn't expose sender
  send(path: string, data: unknown): void;  // Broadcast event to all ports
  destroy(): void;  // Cleanup all ports
}

export interface RPCMessage {
  id: string;
  path: string;
  args?: unknown;
  type: 'request' | 'subscription' | 'unsubscribe';
}

export interface RPCResponse {
  id: string;
  ok: boolean;
  value?: unknown;
  error?: { code: string; message: string };
}

export interface RPCEvent {
  path: string;
  data: unknown;
}

export interface ElectronHandlerOptions<Ctx> {
  context: Ctx;
  onPortConnect?: (port: MessagePort) => void;
  onPortDisconnect?: (port: MessagePort) => void;
}
```

## Interface

```typescript
function createElectronHandler<Ctx>(
  api: APIInstance<Ctx>,
  options: ElectronHandlerOptions<Ctx>
): RPCHandler
```

## MessagePort Upgrading

**Important**: `MessagePort` does not expose a `sender` property. Window information must be passed explicitly when upgrading the port.

```typescript
// handler.ts
export function createElectronHandler<Ctx>(
  api: APIInstance<Ctx>,
  options: ElectronHandlerOptions<Ctx>
) {
  const { context, onPortConnect, onPortDisconnect } = options;
  const windowPorts = new Map<MessagePort, { windowId: number; windowLabel: string }>();

  const handler: RPCHandler = {
    upgrade(port: MessagePort, windowInfo?: { windowId: number; windowLabel: string }) {
      // Track window association - windowInfo must be passed since MessagePort has no sender
      windowPorts.set(port, {
        windowId: windowInfo?.windowId ?? -1,
        windowLabel: windowInfo?.windowLabel ?? 'unknown'
      });

      // Setup message handlers
      port.onmessage = (event) => handleMessage(port, event.data);
      port.onmessageerror = (event) => handleError(port, event);
      port.onclose = () => handlePortClose(port);

      port.start();
      onPortConnect?.(port);
    },

    send(path: string, data: unknown) {
      const eventMessage: RPCEvent = { path, data };
      for (const [port] of windowPorts) {
        port.postMessage(eventMessage);
      }
    },

    destroy() {
      for (const [port] of windowPorts) {
        port.close();
      }
      windowPorts.clear();
    }
  };

  // Forward @deessejs events to all connected renderers
  if (api.eventEmitter) {
    api.eventEmitter.on('*', (name, data) => {
      handler.send(name, data);
    });
  }

  function handlePortClose(port: MessagePort) {
    windowPorts.delete(port);
    onPortDisconnect?.(port);
  }

  function handleError(port: MessagePort, error: Error) {
    console.error('Port message error:', error);
  }

  return handler;
}
```

## Message Handling

```typescript
function handleMessage(port: MessagePort, message: RPCMessage) {
  const { id, path, args, type } = message;

  // Handle subscription requests
  if (type === 'subscription') {
    // Store subscription mapping for event forwarding
    subscriptions.set(`${path}:${id}`, { port, callback: args });
    port.postMessage({ id, ok: true });
    return;
  }

  if (type === 'unsubscribe') {
    subscriptions.delete(`${path}:${id}`);
    port.postMessage({ id, ok: true });
    return;
  }

  // Execute request via API proxy
  const result = executeViaProxy(api, path, args);

  port.postMessage({
    id,
    ok: result.ok,
    value: result.ok ? result.value : undefined,
    error: result.ok ? undefined : { code: result.error.code, message: result.error.message }
  } as RPCResponse);
}
```

## Execute Via Proxy (No Internal Functions Needed)

The handler uses the public API proxy directly - no internal functions required:

```typescript
import type { Result } from '@deessejs/fp';

function executeViaProxy<Ctx>(
  api: APIInstance<Ctx>,
  route: string,
  args: unknown
): Result<unknown> {
  // Validate route format (prevent path traversal)
  if (!isValidRoute(route)) {
    return { ok: false, error: { code: 'INVALID_ROUTE', message: `Invalid route format: ${route}` } };
  }

  // Traverse the API proxy like any client would
  const parts = route.split('.');
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let current: any = api;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return { ok: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${route}` } };
    }
    current = current[part];
  }

  if (typeof current !== 'function') {
    return { ok: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${route}` } };
  }

  // Call the procedure (proxy handles validation, middleware, etc.)
  return current(args);
}
```

## Route Validation

```typescript
// Valid route: "users.get", "users.posts.list", etc.
// Invalid: "../../etc/passwd", "users..get", starts with number, etc.

function isValidRoute(route: string): boolean {
  // Must be non-empty string
  if (typeof route !== 'string' || route.length === 0) {
    return false;
  }

  // Must not contain path traversal patterns
  if (route.includes('..') || route.includes('//')) {
    return false;
  }

  // Must match pattern: identifiers separated by dots
  // e.g., "users.get" or "admin.users.list"
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
  return validPattern.test(route);
}
```

## Error Serialization

```typescript
function serializeError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    return {
      code: (error as { code?: string }).code ?? 'INTERNAL_ERROR',
      message: error.message
      // NOTE: Stack traces are NEVER sent to renderer
    };
  }
  return { code: 'INTERNAL_ERROR', message: String(error) };
}
```

## Port Lifecycle

MessagePorts can close (e.g., when BrowserWindow closes). Handler must clean up:

```typescript
function handlePortClose(port: MessagePort) {
  const windowInfo = windowPorts.get(port);
  if (windowInfo) {
    console.log(`Port closed for window ${windowInfo.windowLabel} (${windowInfo.windowId})`);
    windowPorts.delete(port);
    onPortDisconnect?.(port);
  }
}
```

## Full Implementation

```typescript
// handler.ts
import type { APIInstance } from '@deessejs/server';
import type { Result } from '@deessejs/fp';
import type { RPCHandler, RPCMessage, RPCResponse, RPCEvent, ElectronHandlerOptions } from './types.js';

export function createElectronHandler<Ctx>(
  api: APIInstance<Ctx>,
  options: ElectronHandlerOptions<Ctx>
): RPCHandler {
  const { context, onPortConnect, onPortDisconnect } = options;
  const windowPorts = new Map<MessagePort, { windowId: number; windowLabel: string }>();
  const subscriptions = new Map<string, { port: MessagePort; callback: unknown }>();

  const handler: RPCHandler = {
    upgrade(port: MessagePort, windowInfo?: { windowId: number; windowLabel: string }) {
      // Window info must be passed since MessagePort has no sender property
      windowPorts.set(port, {
        windowId: windowInfo?.windowId ?? -1,
        windowLabel: windowInfo?.windowLabel ?? 'unknown'
      });

      port.onmessage = (event) => handleMessage(port, event.data);
      port.onmessageerror = (event) => handleError(port, event);
      port.onclose = () => handlePortClose(port);
      port.start();

      onPortConnect?.(port);
    },

    send(path: string, data: unknown) {
      const event: RPCEvent = { path, data };
      for (const [port] of windowPorts) {
        port.postMessage(event);
      }
    },

    destroy() {
      for (const [port] of windowPorts) {
        port.close();
      }
      windowPorts.clear();
      subscriptions.clear();
    }
  };

  if (api.eventEmitter) {
    api.eventEmitter.on('*', (name, data) => {
      handler.send(name, data);
    });
  }

  function handlePortClose(port: MessagePort) {
    windowPorts.delete(port);
    onPortDisconnect?.(port);
  }

  function handleError(port: MessagePort, error: Error) {
    console.error('Port message error:', error);
  }

  function handleMessage(port: MessagePort, message: RPCMessage) {
    const { id, path, args, type } = message;

    // Handle subscription/unsubscribe
    if (type === 'subscription') {
      subscriptions.set(`${path}:${id}`, { port, callback: args });
      port.postMessage({ id, ok: true } as RPCResponse);
      return;
    }

    if (type === 'unsubscribe') {
      subscriptions.delete(`${path}:${id}`);
      port.postMessage({ id, ok: true } as RPCResponse);
      return;
    }

    // Execute via proxy
    const result = executeViaProxy(api, path, args);

    port.postMessage({
      id,
      ok: result.ok,
      value: result.ok ? result.value : undefined,
      error: result.ok ? undefined : { code: result.error.code, message: result.error.message }
    } as RPCResponse);
  }

  return handler;
}

function isValidRoute(route: string): boolean {
  if (typeof route !== 'string' || route.length === 0) return false;
  if (route.includes('..') || route.includes('//')) return false;
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
  return validPattern.test(route);
}

function executeViaProxy<Ctx>(api: APIInstance<Ctx>, route: string, args: unknown): Result<unknown> {
  if (!isValidRoute(route)) {
    return { ok: false, error: { code: 'INVALID_ROUTE', message: `Invalid route format: ${route}` } };
  }

  const parts = route.split('.');
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let current: any = api;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return { ok: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${route}` } };
    }
    current = current[part];
  }

  if (typeof current !== 'function') {
    return { ok: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${route}` } };
  }

  return current(args);
}
```

---

## Related

- [PRELOAD.md](./PRELOAD.md) - Preload bridge documentation
- [../client/CLIENT.md](../client/CLIENT.md) - Client documentation
- [../README.md](../README.md) - Package overview