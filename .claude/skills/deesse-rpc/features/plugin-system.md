# Plugin System

Plugins allow extending the context (`ctx`) with additional properties and adding API routes.

## Overview

The plugin system allows:
1. **Context Extension** - Add properties to the context object
2. **API Routes** - Add queries and mutations to the router
3. **Lifecycle Hooks** - Execute code on invoke, success, or error
4. **Request Access** - Access headers and cookies

## Plugin Type

Plugins are declared using the `plugin()` helper function:

```typescript
const myPlugin = plugin<Ctx>({
  name: "myPlugin",
  extend: (ctx) => ({ ... }),
  router: (t) => ({ ... }),
  hooks: { ... }
})
```

### Plugin Definition

```typescript
type PluginDefinition<Ctx, PluginRouter extends Router = {}> = {
  name: string
  extend: (ctx: Ctx) => Partial<Ctx>
  router?: (t: QueryBuilder<Ctx>) => PluginRouter
  hooks?: PluginHooks<Ctx>
}

type PluginHooks<Ctx> = {
  onInvoke?: (ctx: Ctx, args: unknown) => void | Promise<void>
  onSuccess?: (ctx: Ctx, args: unknown, result: unknown) => void | Promise<void>
  onError?: (ctx: Ctx, args: unknown, error: unknown) => void | Promise<void>
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier for the plugin |
| `extend` | `(ctx: Ctx) => Partial<Ctx>` | Function that returns additional context properties |
| `router` | `(t: QueryBuilder<Ctx>) => PluginRouter` | Optional function that returns plugin queries and mutations |
| `hooks` | `PluginHooks` | Optional lifecycle hooks |

## Plugin Factory Functions

Plugins can be configured with options using factory functions:

```typescript
// plugins/notifications.ts
import { Plugin } from "@deessejs/server"

type NotificationOptions = {
  retryCount?: number
  defaultChannel?: "email" | "sms" | "push"
}

export const notificationPlugin = (options: NotificationOptions = {}): Plugin<Ctx> => ({
  name: "notifications",
  extend: (ctx) => ({
    sendNotification: async (to: string, message: string) => {
      // Use options
      const retry = options.retryCount ?? 3
      const channel = options.defaultChannel ?? "email"

      // Send notification with retry logic
      for (let i = 0; i < retry; i++) {
        try {
          return await ctx.notificationService.send(to, message, channel)
        } catch (error) {
          if (i === retry - 1) throw error
        }
      }
    }
  })
})

// Usage
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  plugins: [
    notificationPlugin({ retryCount: 5, defaultChannel: "push" })
  ]
})
```

## Lifecycle Hooks

Plugins can execute code at specific points during request execution:

```typescript
type PluginHooks<Ctx> = {
  onInvoke?: (ctx: Ctx, args: unknown) => void | Promise<void>
  onSuccess?: (ctx: Ctx, args: unknown, result: unknown) => void | Promise<void>
  onError?: (ctx: Ctx, args: unknown, error: unknown) => void | Promise<void>
}
```

### Execution Order

```
Request Flow:
┌─────────────────────────────────────────────────────────────┐
│  onInvoke (plugins 1→2→3)                               │
│      │                                                     │
│      ▼                                                     │
│  ┌─────────────┐                                          │
│  │   Handler   │                                          │
│  └─────────────┘                                          │
│      │                                                     │
│      ├──► onSuccess (plugins 3→2→1)  ◄── Reverse order  │
│      │                                                     │
│      └──► onError (plugins 3→2→1)    ◄── Reverse order  │
└─────────────────────────────────────────────────────────────┘
```

### Guard (Stopping Execution)

The `onInvoke` hook can stop request execution by throwing an error:

```typescript
// Plugin: Maintenance Mode
const maintenancePlugin = plugin({
  name: "maintenance",
  hooks: {
    onInvoke: async (ctx, args) => {
      const isInMaintenance = await ctx.db.config.get("maintenance_mode")
      if (isInMaintenance) {
        throw new Error("SERVICE_IN_MAINTENANCE")
      }
    }
  }
})
```

## Example: Logging Plugin

```typescript
const loggerPlugin = plugin<Ctx>({
  name: "logger",
  extend: (ctx) => ({
    logger: {
      info: (msg: string) => console.log("[INFO]", msg),
      error: (msg: string) => console.error("[ERROR]", msg)
    }
  }),
  hooks: {
    onInvoke: (ctx, args) => {
      console.log(`[INVOKE] ${ctx.operation}`, args)
    },
    onSuccess: (ctx, args, result) => {
      console.log(`[SUCCESS] ${ctx.operation}`)
    },
    onError: (ctx, args, error) => {
      console.error(`[ERROR] ${ctx.operation}`, error)
    }
  }
})
```

## Example: Auth Plugin

Plugins can access HTTP headers and cookies from the request:

```typescript
const authPlugin = plugin<Ctx>({
  name: "auth",
  extend: async (ctx) => {
    // Access headers (Next.js)
    const headers = await headers()
    const cookieStore = await cookies()

    const authHeader = headers.get("authorization")
    const sessionToken = cookieStore.get("session")?.value

    let user = null
    if (sessionToken) {
      user = await verifySession(sessionToken)
    }

    return {
      userId: user?.id ?? null,
      userRoles: user?.roles ?? [],
      isAuthenticated: !!user
    }
  }
})
```

> **Note:** The `extend` function can be `async` to support awaiting headers/cookies.

## Namespace Enforcement

Plugin routes are automatically namespaced under the plugin name:

```typescript
const notificationPlugin = plugin<Ctx, {
  list: Query
  send: Mutation
  markRead: Mutation
}>({
  name: "notifications",
  extend: (ctx) => ({ sendNotification: (...args) => { ... } }),
  router: (t) => ({
    list: t.query({ ... }),
    send: t.mutation({ ... }),
    markRead: t.mutation({ ... })
  })
})

// Usage: api.notifications.list()
// NOT: api.list()
```

## Using Multiple Plugins

```typescript
import { defineContext, plugin } from "@deessejs/server"
import { authPlugin } from "./plugins/auth"
import { cachePlugin } from "./plugins/cache"
import { loggerPlugin } from "./plugins/logger"

type BaseContext = {
  db: Database
}

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
  },
  plugins: [
    authPlugin,
    cachePlugin,
    loggerPlugin,
  ],
})

const api = createAPI({
  router: t.router({ ... })
})

// Context now has: db, userId, isAuthenticated, cache, logger
```

### Plugin Order Matters

```typescript
// CORRECT: authPlugin runs first, loggerPlugin can use ctx.userId
plugins: [
  authPlugin,      // Adds userId to context
  loggerPlugin,   // Can access ctx.userId in hooks
]

// INCORRECT: loggerPlugin runs first, ctx.userId not available
plugins: [
  loggerPlugin,   // Cannot access ctx.userId yet
  authPlugin,     // Adds userId after
]
```

**Why?** Plugins that add properties to context must be declared **before** plugins that need those properties in their hooks.

## Plugin with API Routes

Plugins can also add queries and mutations to the API router:

```typescript
export const notificationPlugin = plugin<NotificationContext, NotificationRouter>({
  name: "notifications",

  // Extend context with notification helper
  extend: (ctx) => ({
    async sendNotification(userId: string, message: string) {
      await ctx.db.notifications.create({ userId, message })
    }
  }),

  // Add routes to the API
  router: (t) => ({
    list: t.query({
      args: z.object({}),
      handler: async (ctx) => {
        const notifications = await ctx.db.notifications.findMany({
          where: { userId: ctx.userId },
          orderBy: { createdAt: "desc" }
        })
        return ok(notifications)
      }
    }),

    markAsRead: t.mutation({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        await ctx.db.notifications.update({
          where: { id: args.id },
          data: { read: true }
        })
        return ok({ success: true })
      }
    }),

    send: t.mutation({
      args: z.object({
        userId: z.string(),
        message: z.string()
      }),
      handler: async (ctx, args) => {
        const notification = await ctx.db.notifications.create(args)
        return ok(notification)
      }
    })
  })
})
```

## Type Safety

### Extending Context Types

```typescript
import { plugin } from "@deessejs/server"

// Define your full context type
type MyContext = {
  db: Database
  // Plugin-extended properties
  userId: string | null
  cache: Cache
  logger: Logger
}

// Create plugins with full type safety
export const authPlugin = plugin<MyContext>({
  name: "auth",
  extend: () => ({
    userId: null,
  }),
})

// TypeScript knows all context properties
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx: MyContext, args) => {
    // All properties available with full autocomplete
    ctx.db // Database
    ctx.userId // string | null
    ctx.cache // Cache
    ctx.logger // Logger
  }
})
```

## Best Practices

1. **Keep plugins focused** - Each plugin should do one thing well
2. **Use descriptive names** - Plugin names should clearly indicate their purpose
3. **Initialize lazily** - Don't do heavy computation in `extend()`
4. **Document your plugins** - Clear documentation helps users understand available context properties

```typescript
// Good: Focused plugin
export const cachePlugin = plugin({
  name: "cache",
  extend: () => ({ cache: ... })
})

// Good: Descriptive name
export const authPlugin = plugin({
  name: "auth",
  extend: () => ({ userId: ... })
})

// Avoid: Do everything in one plugin
export const everythingPlugin = plugin({
  name: "everything",
  extend: () => ({ cache: ..., logger: ..., userId: ..., analytics: ... })
})
```

## See Also

- [Defining Context](features/defining-context.md) - Entry point with plugin support
- [Creating API](features/creating-api.md) - Creating the API instance
- [Event System](features/event-system.md) - Event emission and handling