import type { Result } from "@deessejs/fp";

/**
 * RPC Request message sent to the main process
 */
interface RPCRequest {
  id: string;
  path: string;
  args?: unknown;
  type: "request" | "subscription" | "unsubscribe";
}

/**
 * RPC Response message received from the main process
 */
interface RPCResponse {
  id: string;
  ok: boolean;
  value?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * RPC Event message received from the main process (server-sent events)
 */
interface RPCEvent {
  path: string;
  data: unknown;
}

/**
 * Error interface for RPC errors
 */
export interface RPCError extends Error {
  code: string;
}

/**
 * Options for creating an Electron client
 */
export interface ElectronClientOptions<AppRouter> {
  /** MessagePort from MessageChannel for communication with main process */
  port: MessagePort;
  /** Optional request timeout in milliseconds (default: 30000ms) */
  timeout?: number;
  /** Optional global error handler */
  onError?: (error: RPCError) => void;
  /** Optional event handler for server-sent events */
  onEvent?: (path: string, data: unknown) => void;
}

/**
 * Electron client interface with destroy method
 */
export interface ElectronClient<AppRouter> {
  /** Cleanup function to remove listeners and close the port */
  destroy: () => void;
}

/**
 * Generates a unique ID for requests
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a type-safe RPC client for the Electron renderer process.
 *
 * @example
 * ```typescript
 * const { port1, port2 } = new MessageChannel();
 * window.postMessage("start-deesse-client", "*", [port2]);
 *
 * const deesse = createElectronClient<AppRouter>({
 *   port: port1,
 *   timeout: 30000,
 *   onEvent: (path, data) => {
 *     console.log("Event:", path, data);
 *   }
 * });
 *
 * // Make calls
 * const user = await deesse.users.get({ id: 1 });
 * const users = await deesse.users.list();
 * ```
 */
export function createElectronClient<AppRouter>(
  options: ElectronClientOptions<AppRouter>
): ElectronClient<AppRouter> {
  const { port, timeout = 30000, onError, onEvent } = options;

  let messageHandler: ((event: MessageEvent) => void) | null = null;
  const pendingRequests = new Map<
    string,
    { resolve: (value: Result<unknown>) => void; reject: (error: RPCError) => void; timer: ReturnType<typeof setTimeout> }
  >();

  /**
   * Sends an RPC request and returns a Promise with the result
   */
  function sendRequest(path: string, args: unknown): Promise<Result<unknown>> {
    return new Promise((resolve, reject) => {
      const id = generateId();

      // Set timeout
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        const error = new Error(`Request timeout: ${path}`) as RPCError;
        error.code = "TIMEOUT";
        reject(error);
      }, timeout);

      pendingRequests.set(id, { resolve, reject, timer });

      // Send request through port
      port.postMessage({
        id,
        path,
        args,
        type: "request",
      } as RPCRequest);
    });
  }

  /**
   * Creates a router proxy for chainable calls like deesse.users.get({ id: 1 })
   */
  function createRouterProxy(currentPath: string[] = []): ElectronClient<AppRouter> {
    return new Proxy({} as ElectronClient<AppRouter>, {
      get(_target, prop) {
        if (prop === "destroy") {
          return;
        }

        const newPath = [...currentPath, prop as string];

        return new Proxy({}, {
          get(_target2, prop2) {
            if (prop2 === "subscribe") {
              // Return subscription handle
              return (callback: (data: unknown) => void) => {
                const fullPath = newPath.join(".");
                const subPath = `${fullPath}.subscribe`;

                // Send subscription request
                port.postMessage({
                  id: generateId(),
                  path: subPath,
                  type: "subscription",
                } as RPCRequest);

                // Return subscription handle
                return {
                  unsubscribe: () => {
                    port.postMessage({
                      id: generateId(),
                      path: subPath,
                      type: "unsubscribe",
                    } as RPCRequest);
                  },
                };
              };
            }

            // This is a procedure call
            return async (args: unknown) => {
              const fullPath = [...newPath, prop2 as string].join(".");
              return sendRequest(fullPath, args);
            };
          },
        });
      },
    });
  }

  // Handle incoming messages (responses and events)
  messageHandler = (event: MessageEvent) => {
    const message = event.data;

    // Distinguish between response and event using 'ok' property
    // Responses have 'ok' (boolean), events have 'path' and 'data' but no 'ok'
    if ("ok" in message && "id" in message) {
      // RPCResponse - handle as request/response
      const pending = pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(message.id);

        if (message.ok) {
          pending.resolve({ ok: true, value: message.value } as Result<unknown>);
        } else {
          const error = new Error(message.error.message) as RPCError;
          error.code = message.error.code;
          onError?.(error);
          pending.reject(error);
        }
      }
      return;
    }

    // RPCEvent - check for event-specific pattern (no id, no ok, but has path and data)
    if (!("ok" in message) && !("id" in message) && "path" in message && "data" in message) {
      onEvent?.(message.path, message.data);
      return;
    }
  };

  port.addEventListener("message", messageHandler);
  port.start();

  // Create router proxy
  const client = createRouterProxy();

  // Cleanup function
  client.destroy = () => {
    if (messageHandler) {
      port.removeEventListener("message", messageHandler);
    }
    port.close();
    pendingRequests.forEach((pending) => clearTimeout(pending.timer));
    pendingRequests.clear();
  };

  return client;
}
