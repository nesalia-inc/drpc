/**
 * Preload bridge for forwarding MessagePorts from renderer to main process.
 *
 * This module provides a bridge that:
 * 1. Listens for MessagePort transfer via window.postMessage
 * 2. Forwards the port to the main process via ipcRenderer.postMessage
 */

import type { PreloadBridge } from './types.js';

// Note: In Electron preload context, ipcRenderer is available globally.
declare const ipcRenderer: {
  postMessage(channel: string, data: unknown, ports: MessagePort[]): void;
} | undefined;

/**
 * Creates a preload bridge that forwards MessagePorts from renderer to main.
 *
 * @param channelName - The IPC channel name for port transfer (default: 'start-deesse-server')
 * @returns PreloadBridge instance
 *
 * @example
 * ```typescript
 * // In preload script
 * import { createPreloadBridge } from '@deessejs/server-electron';
 *
 * const bridge = createPreloadBridge('start-deesse-server');
 * bridge.setup(window);
 * ```
 */
export function createPreloadBridge(channelName: string = 'start-deesse-server'): PreloadBridge {
  return {
    /**
     * Handle incoming message events from the window.
     * When a 'start-deesse-client' signal is received with ports,
     * forwards the MessagePort to the main process.
     */
    handleMessage(event: MessageEvent) {
      // Check if this is our signal to start the client
      if (event.data !== 'start-deesse-client') {
        return;
      }

      // Extract the MessagePort from the event
      const [serverPort] = event.ports;
      if (!serverPort) {
        console.error('[PreloadBridge] No port received in message');
        return;
      }

      // Forward the port to main process via IPC
      // Note: ipcRenderer.postMessage transfers the port to the main process
      ipcRenderer?.postMessage(channelName, null, [serverPort]);
    },

    /**
     * Setup the bridge by adding the message event listener.
     */
    setup(window: Window) {
      window.addEventListener('message', this.handleMessage);
    },

    /**
     * Cleanup by removing the message event listener.
     */
    teardown(window: Window) {
      window.removeEventListener('message', this.handleMessage);
    }
  };
}