/**
 * Type declarations for the renderer process.
 */

interface ElectronBridge {
  setup(): void;
}

declare global {
  interface Window {
    electronBridge?: ElectronBridge;
  }
}

export {};
