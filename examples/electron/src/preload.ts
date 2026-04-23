/**
 * Electron Preload Script
 *
 * This preload script bridges the renderer process with the main process.
 * It forwards MessagePorts from the renderer to the main process for
 * RPC communication.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Creates a preload bridge that forwards MessagePorts from renderer to main.
 */
function createPreloadBridge(channelName: string) {
  return {
    /**
     * Handle incoming message events from the window.
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
      ipcRenderer.postMessage(channelName, null, [serverPort]);
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

// Create the preload bridge for the default channel
const bridge = createPreloadBridge('start-deesse-server');

/**
 * Setup function exposed to the renderer via contextBridge.
 * The renderer calls this to initialize the port forwarding.
 */
function setup(): void {
  bridge.setup(window);
}

// Expose the setup function to the renderer
contextBridge.exposeInMainWorld('electronBridge', {
  setup,
});

// Log that preload script has loaded
console.log('[Preload] Script loaded, electronBridge.setup() available');
