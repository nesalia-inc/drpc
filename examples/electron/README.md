# Electron RPC Example

This example demonstrates the full integration of `@deessejs/server-electron` and `@deessejs/electron-client` for building type-safe RPC communication between Electron main and renderer processes.

## Directory Structure

```
examples/electron/
├── package.json           # Package configuration (ESM)
├── tsconfig.json         # TypeScript configuration
├── scripts/
│   └── copy-static.js    # Copy HTML/CSS to dist after build
├── src/
│   ├── main.ts           # Main process - creates API and handles RPC
│   ├── preload.ts        # Preload - forwards MessagePort to main
│   └── renderer/
│       ├── index.html    # HTML page loaded in BrowserWindow
│       ├── app.ts        # Renderer - creates client and makes calls
│       └── styles.css    # Basic styling
└── dist/                 # Compiled output (generated after build)
```

## Architecture

```
+----------------+     MessageChannel      +------------------+
|    Main        | <---------------------> |    Renderer      |
|   Process      |                         |    Process       |
|                |                         |                  |
| +------------+ |      IPC + Port        | +--------------+ |
| | Deesse     | | <----- transfer -----> | | Deesse       | |
| | Handler    | |                         | | Client       | |
| +------------+ |                         | +--------------+ |
|                |                         |                  |
| +------------+ |                         |                  |
| | API Router | |                         |                  |
| | (queries/  | |                         |                  |
| | mutations) | |                         |                  |
| +------------+ |                         |                  |
+----------------+                         +------------------+
```

### Key Components

1. **Main Process (`main.ts`)**
   - Creates the `@deessejs/server` API with queries and mutations
   - Creates an `ElectronHandler` using `createElectronHandler()`
   - Listens for `start-deesse-server` IPC events
   - When a `MessagePort` is received, it upgrades it to handle RPC requests

2. **Preload Script (`preload.ts`)**
   - Creates a `PreloadBridge` using `createPreloadBridge()`
   - Sets up event listeners to forward `MessagePort` from renderer to main
   - Exposes `window.electronBridge.setup()` to the renderer

3. **Renderer Process (`app.ts`)**
   - Creates a `MessageChannel`
   - Calls `window.electronBridge.setup()` and `window.postMessage('start-deesse-client', '*', [port2])`
   - Creates an `ElectronClient` using `createElectronClient()` with `port1`
   - Makes RPC calls like `deesse.users.list()` and `deesse.users.get({ id: 1 })`

## Prerequisites

- Node.js 18+ and npm/pnpm
- Electron 33+

## Installation

1. Install dependencies from the root of the repository:

```bash
npm install
```

2. Build the required packages:

```bash
# Build @deessejs/server-electron
cd packages/server-electron
npm run build

# Build @deessejs/electron-client
cd packages/electron-client
npm run build

# Build @deessejs/server (if needed)
cd packages/server
npm run build

# Build the example
cd examples/electron
npm run build
```

Or from the root:

```bash
npm run build --workspace=@deessejs/server-electron
npm run build --workspace=@deessejs/electron-client
npm run build --workspace=@deessejs/server
```

## Running the Example

From the `examples/electron` directory:

```bash
npm start
```

Or with auto-rebuild:

```bash
npm run dev
```

## What the Example Does

The example creates a simple user management API with:

### Queries (read operations)
- `users.list()` - Returns all users
- `users.get({ id })` - Returns a user by ID

### Mutations (write operations)
- `users.create({ name, email })` - Creates a new user

When you run the example, you should see:
1. A window opens with the title "Deesse Electron Example"
2. The status shows "Setting up MessageChannel..."
3. Several RPC calls are made and results are displayed
4. The final list should include a newly created user "David"

## How It Works

### Step 1: Setup
```
Renderer creates MessageChannel -> port1, port2
Renderer calls window.electronBridge.setup()
Renderer posts 'start-deesse-client' with port2 via window.postMessage
```

### Step 2: Port Forwarding
```
Preload receives the postMessage event
Preload extracts port2 from event.ports
Preload forwards port2 to main via ipcRenderer.postMessage('start-deesse-server', null, [port2])
```

### Step 3: Handler Upgrade
```
Main receives the IPC message with the port
Main calls handler.upgrade(port, { windowId, windowLabel })
Handler starts listening for RPC messages on the port
```

### Step 4: RPC Calls
```
Renderer calls deesse.users.list()
Client sends RPCRequest via port1.postMessage()
Handler receives request, executes procedure, sends RPCResponse via port.postMessage()
Client receives response, resolves the Promise
```

## Security Considerations

- `contextIsolation: true` - Renderer cannot access Node.js or Electron internals directly
- `nodeIntegration: false` - No Node.js APIs in renderer
- `sandbox: false` - Required for MessagePort transfer (can be re-enabled with proper setup)
- The preload only exposes a minimal `setup()` function, not the full IPC API

## Troubleshooting

### Port not received
If you see "No port received from preload" in the console:
- Make sure the preload script is properly configured in `webPreferences`
- Check that `sandbox: false` is set (required for MessagePort transfer)

### Type errors
If you see TypeScript errors about missing types:
- Make sure all packages are built (`npm run build` in each package)
- Check that `esModuleInterop` is enabled in tsconfig.json

### Context isolation errors
If you see errors about `electronBridge` not being defined:
- Make sure `contextIsolation: true` is set in BrowserWindow options
- Verify the preload script path is correct and the file exists

## Extending the Example

To add more procedures:

1. Add them to the router in `main.ts`:
```typescript
const appRouter = t.router({
  users: t.router({
    // ... existing procedures
    delete: t.mutation({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => { /* ... */ },
    }),
  }),
  // Add more routers
});
```

2. Update the `AppRouter` type in `app.ts` to match the new procedures.

## Learn More

- [@deessejs/server Source Code](../../packages/server/src/)
- [@deessejs/server-electron Source Code](../../packages/server-electron/src/)
- [@deessejs/electron-client Source Code](../../packages/electron-client/src/)
