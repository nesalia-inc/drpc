/**
 * Electron Main Process
 *
 * This file demonstrates how to integrate @deessejs/server with Electron.
 * It creates a BrowserWindow with a preload script that forwards MessagePorts
 * to the RPC handler.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { defineContext, createAPI, createPublicAPI, type Router } from '@deessejs/server';
import { createElectronHandler } from '@deessejs/server-electron';
import { ok, err, error } from '@deessejs/fp';
import { z } from 'zod';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Error Definitions
// ============================================================================

const NotFoundError = error({
  name: 'NotFoundError',
  message: (args: { resource: string; id: number }) =>
    `${args.resource} ${args.id} not found`,
});

const ConflictError = error({
  name: 'ConflictError',
  message: (args: { field: string; value: string }) =>
    `${args.field} "${args.value}" already exists`,
});

// ============================================================================
// Mock Database
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
}

const mockDb = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ] as User[],
  nextId: 4,
};

// ============================================================================
// Define Context
// ============================================================================

const { t } = defineContext({
  context: {
    db: mockDb,
    logger: console,
  },
});

// ============================================================================
// Define Procedures
// ============================================================================

// Query: List all users
const listUsers = t.query({
  handler: async (ctx) => {
    return ok(ctx.db.users);
  },
});

// Query: Get user by ID
const getUser = t.query({
  args: z.object({
    id: z.number(),
  }),
  handler: async (ctx, args) => {
    const user = ctx.db.users.find((u) => u.id === args.id);
    if (!user) {
      return err(NotFoundError({ resource: 'User', id: args.id }));
    }
    return ok(user);
  },
});

// Mutation: Create a new user
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(1),
    email: z.email(),
  }),
  handler: async (ctx, args) => {
    const existing = ctx.db.users.find((u) => u.email === args.email);
    if (existing) {
      return err(ConflictError({ field: 'email', value: args.email }));
    }
    const user: User = {
      id: ctx.db.nextId++,
      name: args.name,
      email: args.email,
    };
    ctx.db.users.push(user);
    return ok(user);
  },
});

// ============================================================================
// Create Router
// ============================================================================

type AppCtx = { db: typeof mockDb; logger: Console };

// Use type assertions to bypass complex type inference issues
// The runtime structure is correct, but TypeScript's Router type doesn't
// properly recognize QueryWithHooks/MutationWithHooks as Procedure types
const usersRouter = t.router(
  {
    list: listUsers,
    get: getUser,
    create: createUser,
  } as unknown as Router<AppCtx>
);

const appRouter = t.router(
  {
    users: usersRouter,
  } as unknown as Router<AppCtx>
);

// ============================================================================
// Create API
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = createAPI<any, any>({
  router: appRouter,
});

// Create public API (exposes only queries and mutations, not internal procedures)
const publicApi = createPublicAPI(api);

// ============================================================================
// Create Electron Handler
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = createElectronHandler(publicApi as any, {
  context: { db: mockDb, logger: console },
  onPortConnect: (port: MessagePort) => {
    console.log('[Main] Client port connected');
  },
  onPortDisconnect: (port: MessagePort) => {
    console.log('[Main] Client port disconnected');
  },
});

// ============================================================================
// IPC Handler
// ============================================================================

// Listen for 'start-deesse-server' event from preload script
// This event carries the MessagePort from the renderer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ipcMain.on('start-deesse-server', (event: any) => {
  console.log('[Main] Received start-deesse-server IPC event');
  console.log('[Main] Event ports:', event.ports);

  // The port is transferred via the ipcRenderer.postMessage in preload
  // We need to extract it from the event's ports
  const [port] = event.ports;
  if (!port) {
    console.error('[Main] No port received from preload');
    return;
  }

  console.log('[Main] Port received, type:', typeof port);
  console.log('[Main] Port has start:', typeof port.start);
  console.log('[Main] Port has onmessage:', typeof port.onmessage);

  console.log('[Main] Port received, upgrading...');

  // Get window info - we use a simple approach here
  // In production, you'd track window IDs more carefully
  const windowId = BrowserWindow.getFocusedWindow()?.id ?? -1;
  const windowLabel = BrowserWindow.getFocusedWindow()?.getTitle() ?? 'unknown';

  console.log(`[Main] Upgrading port for window ${windowLabel} (${windowId})`);

  // Upgrade the port to handle RPC requests
  // Note: Electron's MessagePortMain needs to be cast to MessagePort for compatibility
  handler.upgrade(port as unknown as MessagePort, { windowId, windowLabel });
});

// ============================================================================
// BrowserWindow Creation
// ============================================================================

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Deesse Electron Example',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for MessagePort transfer
    },
  });

  // Load the renderer HTML
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Log when window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Renderer finished loading');
  });

  // Cleanup on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(() => {
  console.log('[Main] App ready, creating window...');
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('[Main] All windows closed');
  // Cleanup handler
  handler.destroy();
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[Main] App quitting...');
  handler.destroy();
});
