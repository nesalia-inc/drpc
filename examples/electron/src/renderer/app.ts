/**
 * Electron Renderer Process
 *
 * This script demonstrates how to use @deessejs/electron-client
 * to make RPC calls to the main process.
 */

import { createElectronClient } from '@deessejs/electron-client';

// Type for our app router (would normally be shared from a types package)
type AppRouter = {
  users: {
    list: () => Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;
    get: (args: { id: number }) => Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;
    create: (args: { name: string; email: string }) => Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;
  };
};

// DOM Elements
const statusDiv = document.getElementById('status') as HTMLDivElement;
const resultsDiv = document.getElementById('results') as HTMLDivElement;

/**
 * Display status message
 */
function setStatus(message: string, isError = false): void {
  statusDiv.textContent = message;
  statusDiv.className = isError ? 'error' : 'success';
}

/**
 * Display results in the results div
 */
function displayResults(title: string, data: unknown): void {
  const resultItem = document.createElement('div');
  resultItem.className = 'result-item';
  resultItem.innerHTML = `
    <h3>${title}</h3>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  `;
  resultsDiv.appendChild(resultItem);
}

/**
 * Initialize the Deesse client and make RPC calls
 */
async function main(): Promise<void> {
  setStatus('Setting up MessageChannel...');

  // Create a MessageChannel for communication
  const { port1, port2 } = new MessageChannel();

  // Check if electronBridge is available (set up by preload)
  if (typeof window.electronBridge === 'undefined') {
    setStatus('Error: electronBridge not found. Preload script may not have loaded.', true);
    console.error('window.electronBridge is not defined');
    return;
  }

  setStatus('Calling electronBridge.setup()...');

  // Signal preload to forward port2 to main process
  // The preload script will receive this via window.postMessage and forward port2 via ipcRenderer
  window.electronBridge.setup();

  // Post the message with the port
  // This triggers the preload's message event handler which forwards the port to main
  window.postMessage('start-deesse-client', '*', [port2]);

  setStatus('Creating Deesse client...');

  // Create the Deesse client using port1 (the renderer-side of the channel)
  // Note: The type system doesn't fully capture the Proxy-based router structure,
  // so we use `as any` to bypass type checking for the router access
  const deesse = createElectronClient({
    port: port1,
    timeout: 5000,
    onError: (error) => {
      console.error('[Client] Error:', error);
      displayResults('Error', { code: error.code, message: error.message });
    },
    onEvent: (path, data) => {
      console.log('[Client] Event:', path, data);
      displayResults(`Event: ${path}`, data);
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  console.log('[Renderer] Client created, making RPC call...');

  setStatus('Making RPC calls...');

  console.log('[Renderer] deesse object:', deesse);
  console.log('[Renderer] deesse.users:', deesse.users);
  console.log('[Renderer] deesse.users.list:', deesse.users.list);

  try {
    // Call 1: List all users
    displayResults('Calling users.list()...', 'Waiting for response...');
    console.log('[Renderer] Calling deesse.users.list()...');
    const listResult = await deesse.users.list();
    console.log('[Renderer] listResult:', listResult);
    if (listResult.ok) {
      displayResults('users.list() Result', listResult.value);
    } else {
      displayResults('users.list() Error', listResult.error);
    }

    // Call 2: Get user by ID
    displayResults('Calling users.get({ id: 1 })...', 'Waiting for response...');
    const getResult = await deesse.users.get({ id: 1 });
    if (getResult.ok) {
      displayResults('users.get({ id: 1 }) Result', getResult.value);
    } else {
      displayResults('users.get({ id: 1 }) Error', getResult.error);
    }

    // Call 3: Create a new user
    displayResults('Calling users.create({ name: "David", email: "david@example.com" })...', 'Waiting for response...');
    const createResult = await deesse.users.create({
      name: 'David',
      email: 'david@example.com',
    });
    if (createResult.ok) {
      displayResults('users.create() Result', createResult.value);
    } else {
      displayResults('users.create() Error', createResult.error);
    }

    // Call 4: List users again to see the new one
    displayResults('Calling users.list() again...', 'Waiting for response...');
    const listResult2 = await deesse.users.list();
    if (listResult2.ok) {
      displayResults('users.list() Result (after create)', listResult2.value);
    } else {
      displayResults('users.list() Error', listResult2.error);
    }

    setStatus('All RPC calls completed successfully!');
  } catch (error) {
    setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
    console.error('[Client] Unexpected error:', error);
  }
}

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
