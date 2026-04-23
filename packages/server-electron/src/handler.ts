/**
 * Electron handler for @deessejs/server
 *
 * This module provides createElectronHandler which:
 * 1. Upgrades MessagePorts to RPC handlers
 * 2. Executes procedures via API proxy traversal
 * 3. Broadcasts events to all connected renderers
 */

import { err, error, type Result, type Ok, type Err, type Error } from '@deessejs/fp';
import type {
  RPCHandler,
  RPCMessage,
  RPCResponse,
  RPCEvent,
  ElectronHandlerOptions
} from './types.js';

// Use a generic object type instead of APIInstance to avoid import issues
type API = {
  eventEmitter?: {
    on(event: string, handler: (name: string, data: unknown) => void): void;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// Create error builders using @deessejs/fp error builder
const InvalidRouteError = error<{ route: string }>({
  name: 'InvalidRouteError',
  message: ({ route }) => `Invalid route format: ${route}`,
});

const RouteNotFoundError = error<{ route: string }>({
  name: 'RouteNotFoundError',
  message: ({ route }) => `Route not found: ${route}`,
});

/**
 * Creates an Electron RPC handler for the given API instance.
 *
 * @param api - The API instance from @deessejs/server
 * @param options - Handler options including context and callbacks
 * @returns RPCHandler instance
 *
 * @example
 * ```typescript
 * const handler = createElectronHandler(api, {
 *   context: { userId: 123 },
 *   onPortConnect: (port) => console.log('Port connected'),
 *   onPortDisconnect: (port) => console.log('Port disconnected')
 * });
 *
 * // When a MessagePort arrives from the main process:
 * handler.upgrade(port, { windowId: 1, windowLabel: 'main' });
 *
 * // To broadcast events to all renderers:
 * handler.send('users.updated', { id: 1, name: 'John' });
 *
 * // Cleanup when shutting down:
 * handler.destroy();
 * ```
 */
export function createElectronHandler<Ctx>(
  api: API,
  options: ElectronHandlerOptions<Ctx>
): RPCHandler {
  const { onPortConnect, onPortDisconnect } = options;

  // Track MessagePorts with their associated window info
  const windowPorts = new Map<MessagePort, { windowId: number; windowLabel: string }>();

  // Track subscriptions for event forwarding
  const subscriptions = new Map<string, { port: MessagePort; callback: unknown }>();

  /**
   * Handle incoming RPC message from a port.
   */
  function handleMessage(port: MessagePort, message: RPCMessage) {
    const { id, path, args, type } = message;

    console.log('[ElectronHandler] Received message:', JSON.stringify({ id, path, type, hasArgs: !!args }));

    // Handle subscription requests
    if (type === 'subscription') {
      console.log('[ElectronHandler] Handling subscription for:', path);
      subscriptions.set(`${path}:${id}`, { port, callback: args });
      port.postMessage({ id, ok: true } as RPCResponse);
      return;
    }

    // Handle unsubscribe requests
    if (type === 'unsubscribe') {
      console.log('[ElectronHandler] Handling unsubscribe for:', path);
      subscriptions.delete(`${path}:${id}`);
      port.postMessage({ id, ok: true } as RPCResponse);
      return;
    }

    // Execute the request via proxy traversal
    console.log('[ElectronHandler] Executing via proxy for path:', path, 'with args:', args);
    const result = executeViaProxy(api, path, args);
    console.log('[ElectronHandler] Result isOk:', result.isOk(), 'result:', result);

    if (result.isOk()) {
      const ok = result as Ok<unknown>;
      console.log('[ElectronHandler] Success, value:', ok.value);
      const response = { id, ok: true, value: ok.value };
      console.log('[ElectronHandler] Sending response:', JSON.stringify(response));
      port.postMessage(response as RPCResponse);
    } else {
      const errResult = result as Err<Error>;
      const errorData = errResult.error;
      console.log('[ElectronHandler] Error:', errorData);
      const response = { id, ok: false, error: { code: errorData.name, message: errorData.message } };
      console.log('[ElectronHandler] Sending error response:', JSON.stringify(response));
      port.postMessage(response as RPCResponse);
    }
  }

  /**
   * Handle port close event.
   */
  function handlePortClose(port: MessagePort) {
    const windowInfo = windowPorts.get(port);
    if (windowInfo) {
      console.log(`[ElectronHandler] Port closed for window ${windowInfo.windowLabel} (${windowInfo.windowId})`);
      windowPorts.delete(port);
    }
    subscriptions.forEach((sub, key) => {
      if (sub.port === port) {
        subscriptions.delete(key);
      }
    });
    onPortDisconnect?.(port);
  }

  /**
   * Handle port message error.
   */
  function handleError(_port: MessagePort, error: Error) {
    console.error('[ElectronHandler] Port message error:', error);
  }

  const handler: RPCHandler = {
    /**
     * Upgrade a MessagePort to handle RPC requests.
     * Window info must be passed explicitly since MessagePort doesn't expose sender.
     */
    upgrade(port: MessagePort, windowInfo?: { windowId: number; windowLabel: string }) {
      console.log('[ElectronHandler] upgrade called');
      // Track window association - windowInfo must be passed since MessagePort has no sender
      windowPorts.set(port, {
        windowId: windowInfo?.windowId ?? -1,
        windowLabel: windowInfo?.windowLabel ?? 'unknown'
      });

      // Start the port first to enable message receiving
      port.start();
      console.log('[ElectronHandler] Port started');

      // Setup message handlers AFTER starting
      const messageHandler = (event: MessageEvent) => {
        console.log('[ElectronHandler] Message received! data:', event.data);
        handleMessage(port, event.data as RPCMessage);
      };

      // Set up onmessage (standard DOM API for MessagePort)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      port.onmessage = messageHandler as any;

      // Also try addEventListener as some implementations prefer it
      port.addEventListener('message', messageHandler);

      // Try the internal port (Electron-specific)
      const internalPort = (port as any)._internalPort;
      if (internalPort) {
        console.log('[ElectronHandler] Internal port methods:', Object.keys(internalPort));
        if (typeof internalPort.on === 'function') {
          internalPort.on('message', (msg: unknown) => {
            console.log('[ElectronHandler] Internal port on-message:', msg);
          });
        }
        if (typeof internalPort.addListener === 'function') {
          internalPort.addListener('message', (msg: unknown) => {
            console.log('[ElectronHandler] Internal port addListener-message:', msg);
          });
        }
      }

      port.onmessageerror = (event: MessageEvent) => handleError(port, event.data as Error);
      // @ts-expect-error - Electron MessagePort has onclose but standard DOM does not
      port.onclose = () => handlePortClose(port);

      console.log('[ElectronHandler] Port upgraded, listening for messages');
      onPortConnect?.(port);
    },

    /**
     * Broadcast an event to all connected renderer windows.
     */
    send(path: string, data: unknown) {
      const eventMessage: RPCEvent = { path, data };
      for (const [port] of windowPorts) {
        port.postMessage(eventMessage);
      }
    },

    /**
     * Cleanup all ports and subscriptions.
     */
    destroy() {
      for (const [port] of windowPorts) {
        port.close();
      }
      windowPorts.clear();
      subscriptions.clear();
    }
  };

  // Forward @deessejs events to all connected renderers
  if (api.eventEmitter) {
    api.eventEmitter.on('*', (name: string, data: unknown) => {
      handler.send(name, data);
    });
  }

  return handler;
}

/**
 * Validate route format to prevent path traversal attacks.
 * Valid routes: "users.get", "admin.users.list", "posts.byAuthor"
 * Invalid routes: "../../etc/passwd", "users..get", "123.invalid"
 */
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

/**
 * Execute a procedure by traversing the API proxy.
 *
 * This function traverses the proxy object directly (e.g., api['users']['get'])
 * rather than using internal functions, mimicking how a client would call the API.
 */
function executeViaProxy(
  api: API,
  route: string,
  args: unknown
): Result<unknown> {
  // Validate route format
  if (!isValidRoute(route)) {
    return err(InvalidRouteError({ route }));
  }

  // Traverse the API proxy like any client would
  const parts = route.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = api;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return err(RouteNotFoundError({ route }));
    }
    current = current[part];
  }

  if (typeof current !== 'function') {
    return err(RouteNotFoundError({ route }));
  }

  // Call the procedure - proxy handles validation, middleware, etc.
  // current(args) returns Result directly
  return current(args);
}