/**
 * Type definitions for @deessejs/server-electron
 */

/**
 * RPC handler returned by createElectronHandler.
 * Provides lifecycle management for MessagePort-based RPC communication.
 */
export interface RPCHandler {
  /**
   * Upgrade a MessagePort to handle RPC requests.
   * Window info must be passed explicitly since MessagePort doesn't expose sender.
   */
  upgrade(port: MessagePort, windowInfo?: { windowId: number; windowLabel: string }): void;

  /**
   * Broadcast an event to all connected renderer windows.
   */
  send(path: string, data: unknown): void;

  /**
   * Cleanup all ports and resources.
   */
  destroy(): void;
}

/**
 * Message format for RPC requests from renderer to main.
 */
export interface RPCMessage {
  /** Unique identifier for the request/response pair */
  id: string;
  /** Dot-separated route path (e.g., "users.get", "posts.list") */
  path: string;
  /** Arguments to pass to the procedure (undefined for no-arg procedures) */
  args?: unknown;
  /** Message type determining how to handle it */
  type: 'request' | 'subscription' | 'unsubscribe';
}

/**
 * Response format for RPC responses from main to renderer.
 */
export interface RPCResponse {
  /** Matches the id from the request */
  id: string;
  /** Whether the request succeeded */
  ok: boolean;
  /** The result value if successful */
  value?: unknown;
  /** Error details if not successful */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Event format for server-initiated events sent to renderers.
 */
export interface RPCEvent {
  /** Event path/name */
  path: string;
  /** Event payload */
  data: unknown;
}

/**
 * Options for creating an Electron handler.
 */
export interface ElectronHandlerOptions<Ctx> {
  /** Application context */
  context: Ctx;
  /** Optional callback when a port connects */
  onPortConnect?: (port: MessagePort) => void;
  /** Optional callback when a port disconnects */
  onPortDisconnect?: (port: MessagePort) => void;
}

/**
 * Preload bridge interface for forwarding MessagePorts.
 */
export interface PreloadBridge {
  /**
   * Handle incoming window message events.
   */
  handleMessage(event: MessageEvent): void;

  /**
   * Setup the bridge (adds event listeners).
   */
  setup(window: Window): void;

  /**
   * Cleanup the bridge (removes event listeners).
   */
  teardown(window: Window): void;
}