/**
 * @deessejs/server-electron
 *
 * Electron adapter for @deessejs/server providing MessagePort-based RPC communication.
 */

// Types
export type {
  RPCHandler,
  RPCMessage,
  RPCResponse,
  RPCEvent,
  ElectronHandlerOptions,
  PreloadBridge
} from './types.js';

// Handler
export { createElectronHandler } from './handler.js';

// Preload bridge
export { createPreloadBridge } from './preload.js';
