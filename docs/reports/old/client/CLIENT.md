# Electron Client

**Document**: @deessejs/server-electron client deep dive
**Purpose**: Explain `createElectronClient()` implementation in detail

---

## Overview

The client (`createElectronClient`) provides a type-safe RPC client for the renderer process. It wraps a `MessagePort` and provides a router proxy for calling procedures like `deesse.users.get({ id: 1 })`.

## Interface

```typescript
interface RPCError extends Error {
  code: string;
}

interface ElectronClientOptions<AppRouter> {
  port: MessagePort;                           // MessagePort from MessageChannel
  timeout?: number;                            // Optional request timeout (default: 30000ms)
  onError?: (error: RPCError) => void;         // Global error handler
  onEvent?: (path: string, data: unknown) => void; // Event subscriptions
}

function createElectronClient<AppRouter>(
  options: ElectronClientOptions<AppRouter>
): ElectronClient<AppRouter>;
```

## Basic Implementation

```typescript
// client/createElectronClient.ts

interface RPCRequest {
  id: string;
  path: string;
  args?: unknown;
  type: 'request' | 'subscription' | 'unsubscribe';
}

interface RPCResponse {
  id: string;
  ok: boolean;
  value?: unknown;
  error?: { code: string; message: string };
}

interface RPCEvent {
  path: string;
  data: unknown;
}

function generateId(): string {
  // Use crypto.randomUUID or fallback to timestamp+random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function createElectronClient<AppRouter>(
  options: ElectronClientOptions<AppRouter>
): ElectronClient<AppRouter> {
  const { port, timeout = 30000, onError, onEvent } = options;

  let messageHandler: ((event: MessageEvent) => void) | null = null;
  const pendingRequests = new Map<string, { resolve: Function; reject: Function; timer: number }>();

  // Handle incoming messages (responses and events)
  messageHandler = (event: MessageEvent) => {
    const message = event.data;

    // Distinguish between response and event using 'ok' property
    // Responses have 'ok' (boolean), events have 'path' and 'data' but no 'ok'
    if ('ok' in message && 'id' in message) {
      // RPCResponse - handle as request/response
      const pending = pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(message.id);

        if (message.ok) {
          pending.resolve({ ok: true, value: message.value });
        } else {
          const error = new Error(message.error.message);
          error.code = message.error.code;
          pending.reject(error);
        }
      }
      return;
    }

    // RPCEvent - check for event-specific pattern (no id, no ok, but has path and data)
    // This is more robust than checking absence of id
    if (!('ok' in message) && !('id' in message) && 'path' in message && 'data' in message) {
      onEvent?.(message.path, message.data);
      return;
    }
  };

  port.addEventListener('message', messageHandler);
  port.start();

  // Create router proxy
  const client = createRouterProxy<AppRouter>();

  // Cleanup function
  client.destroy = () => {
    if (messageHandler) {
      port.removeEventListener('message', messageHandler);
    }
    port.close();
    pendingRequests.forEach(pending => clearTimeout(pending.timer));
    pendingRequests.clear();
  };

  return client;
}
```

## Better Message Type Detection

Instead of checking for absence of 'id', we check for presence of 'ok' (responses) vs absence of 'ok' (events):

```typescript
// OLD (weak - could misclassify if payload has path/data):
if ('path' in message && 'data' in message && !('id' in message)) { ... }

// NEW (robust - only events have path+data without 'ok'):
if (!('ok' in message) && 'path' in message && 'data' in message) { ... }
```

## Router Proxy

The router proxy provides the `deesse.users.get({ id: 1 })` API:

```typescript
// client/createElectronClient.ts (continued)

function createRouterProxy<AppRouter>(
  path: string[] = []
): ElectronClient<AppRouter> {
  return new Proxy({}, {
    get(target, prop: string) {
      if (prop === 'destroy' || prop === 'subscribe') {
        return target[prop];
      }

      const currentPath = [...path, prop];

      return new Proxy({}, {
        get(target2, prop2) {
          if (prop2 === 'subscribe') {
            // Return subscription handle
            return (callback: (data: unknown) => void) => ({
              unsubscribe: () => { /* ... */ }
            });
          }

          // This is a procedure call
          return async (args: unknown) => {
            const fullPath = [...currentPath, prop2].join('.');

            return sendRequest(fullPath, args);
          };
        }
      });
    }
  });
}
```

## Send Request

```typescript
// client/createElectronClient.ts (continued)

function sendRequest(path: string, args: unknown): Promise<Result> {
  return new Promise((resolve, reject) => {
    const id = generateId();

    // Set timeout
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request timeout: ${path}`));
    }, timeout);

    pendingRequests.set(id, { resolve, reject, timer });

    // Send request through port
    port.postMessage({
      id,
      path,
      args,
      type: 'request'
    } as RPCRequest);
  });
}
```

## Subscription Support

Desktop apps need real-time updates. The client supports subscription events:

```typescript
// Usage in renderer
const subscription = deesse.users.changed.subscribe((data) => {
  console.log('User changed:', data);
});

// Unsubscribe when done
subscription.unsubscribe();
```

```typescript
// client/createElectronClient.ts (continued)

// Subscribe to an event path
function subscribe(path: string, callback: (data: unknown) => void) {
  const fullPath = `${path}.subscribe`;

  // Send subscription request
  port.postMessage({
    id: generateId(),
    path: fullPath,
    type: 'subscription'
  });

  // Return subscription handle
  return {
    unsubscribe: () => {
      port.postMessage({
        id: generateId(),
        path: fullPath,
        type: 'unsubscribe'
      });
    }
  };
}
```

## Type Safety

The client is generic and type-safe via `AppRouter`:

```typescript
// In shared/types.ts
import type { AppRouter } from '@deessejs/server';
export type { AppRouter };

// In renderer
import type { AppRouter } from 'shared/types';
const deesse = createElectronClient<AppRouter>({ port: clientPort });

// TypeScript knows this is typed correctly
const user = await deesse.users.get({ id: 1 });  // Promise<Result<User>>
const users = await deesse.users.list();          // Promise<Result<User[]>>
```

## Error Handling

Errors from the server are caught and re-thrown:

```typescript
try {
  const result = await deesse.users.get({ id: 1 });
  if (!result.ok) {
    console.error('Server error:', result.error.code, result.error.message);
    return;
  }
  console.log('User:', result.value);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error
  }
}
```

## Complete Example

```typescript
// renderer/app.tsx
import { createElectronClient } from '@deessejs/electron-client';
import type { AppRouter } from 'shared/types';

// Create the channel
const { port1, port2 } = new MessageChannel();

// Signal preload to forward the server port
window.postMessage('start-deesse-client', '*', [port2]);

// Create type-safe client
const deesse = createElectronClient<AppRouter>({
  port: port1,
  timeout: 30000,
  onEvent: (path, data) => {
    console.log('Event:', path, data);
  }
});

// Make calls
async function main() {
  try {
    const user = await deesse.users.get({ id: 1 });
    console.log('Got user:', user.value);

    await deesse.users.create({
      name: 'John',
      email: 'john@example.com'
    });
    console.log('User created');

    // Subscribe to events
    const sub = deesse.users.changed.subscribe((data) => {
      console.log('User changed:', data);
    });

    // Later: unsubscribe
    sub.unsubscribe();
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## Related

- [../server/HANDLER.md](../server/HANDLER.md) - Server handler documentation
- [../server/PRELOAD.md](../server/PRELOAD.md) - Preload bridge documentation
- [../README.md](../README.md) - Package overview