# Extensions System Specification

## Overview

Extensions are predefined functionality modules that plugins can depend on. While plugins extend the context with custom properties, extensions provide common utilities (auth, cache, logging, jobs, etc.) that multiple plugins can use.

## Core Concept

- **Extension** - Predefined functionality (auth, cache, logging, jobs)
- **Plugin** - Can declare dependencies on extensions
- **Runtime Check** - If a required extension is missing, an error is thrown

```
Extension (auth, cache, logging, jobs)
    │
    ▼ (provides)
Plugin A ────► depends on ────► Extension
Plugin B ────► depends on ────► Extension
```

## API Reference

### Extension Type

```typescript
type Extension = {
  name: string
  // Predefined operations
  operations: {
    [key: string]: (...args: unknown[]) => unknown
  }
}
```

### Plugin with Extension Dependency

```typescript
type Plugin<Ctx> = {
  name: string
  extend: (ctx: Ctx) => Partial<Ctx>
  needs?: ExtensionName[]  // Required extensions
}
```

### Register Extension

```typescript
function registerExtension(extension: Extension): void
```

## Usage Examples

### Creating an Extension

```typescript
// extensions/cache.ts
import { Extension } from "@deessejs/server"

export const cacheExtension: Extension = {
  name: "cache",

  operations: {
    get: async (key: string) => { ... },
    set: async (key: string, value: unknown, ttl?: number) => { ... },
    delete: async (key: string) => { ... },
    clear: async () => { ... },
  },
}

// Register globally
registerExtension(cacheExtension)
```

### Creating a Plugin with Dependency

```typescript
// plugins/session.ts
import { Plugin } from "@deessejs/server"

export const sessionPlugin: Plugin<Context> = {
  name: "session",

  // Declare required extensions
  needs: ["cache", "logger"],

  extend: (ctx) => {
    // Can use extensions via ctx
    const cache = ctx.extensions.cache
    const logger = ctx.extensions.logger

    return {
      session: {
        get: async <T>(key: string): Promise<T | null> => {
          logger.info("session:get", { key })
          return cache.get(`session:${key}`)
        },
        set: async <T>(key: string, value: T, ttl = 3600): Promise<void> => {
          logger.info("session:set", { key })
          return cache.set(`session:${key}`, value, ttl)
        },
      },
    }
  },
}
```

### Using Extensions in defineContext

```typescript
import { defineContext } from "@deessejs/server"
import { cacheExtension } from "./extensions/cache"
import { loggerExtension } from "./extensions/logger"
import { sessionPlugin } from "./plugins/session"

// Register extensions first
registerExtension(cacheExtension)
registerExtension(loggerExtension)

const { t, createAPI } = defineContext({
  initialValues: {
    db: myDatabase,
  },
  plugins: [sessionPlugin],
})
// OK - cache and logger extensions are available

const { t, createAPI } = defineContext({
  initialValues: {
    db: myDatabase,
  },
  plugins: [sessionPlugin],
})
// ERROR - Missing required extension "cache"
```

### Built-in Extensions

```typescript
// cache extension
ctx.extensions.cache.get(key)
ctx.extensions.cache.set(key, value, ttl)
ctx.extensions.cache.delete(key)

// logger extension
ctx.extensions.logger.info(message, meta)
ctx.extensions.logger.warn(message, meta)
ctx.extensions.logger.error(message, error, meta)

// auth extension
ctx.extensions.auth.getUserId()
ctx.extensions.auth.setUserId(userId)
ctx.extensions.auth.clear()

// jobs extension
ctx.extensions.jobs.enqueue(name, payload, options)
ctx.extensions.jobs.schedule(name, payload, cron)
```

## Error Handling

### Missing Extension Error

```typescript
// If a plugin requires an extension that's not registered
const { t, createAPI } = defineContext({
  initialValues: { db: myDatabase },
  plugins: [sessionPlugin], // sessionPlugin needs "cache"
})

// Error: Plugin "session" requires extension "cache" to be registered
// Available extensions: []
// Required: ["cache"]
```

## Type Safety

### Extension Declaration

```typescript
// Define available extensions
type Extensions = {
  cache: {
    get: <T>(key: string) => Promise<T | null>
    set: <T>(key: string, value: T, ttl?: number) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void
    warn: (msg: string, meta?: Record<string, unknown>) => void
    error: (msg: string, error?: Error) => void
  }
}

// Plugin with typed extensions
type MyPlugin = Plugin<Context> & {
  needs: (keyof Extensions)[]
}
```

### Using Extensions in Plugin

```typescript
export const myPlugin: Plugin<Context> = {
  name: "myPlugin",
  needs: ["cache", "logger"],

  extend: (ctx) => {
    // Fully typed
    const cache = ctx.extensions.cache
    const logger = ctx.extensions.logger

    return {
      myFeature: async () => {
        await cache.set("key", "value")
        logger.info("feature executed")
      },
    }
  },
}
```

## Extension vs Plugin

| Feature | Plugin | Extension |
|---------|--------|-----------|
| Custom properties | Yes | No |
| Predefined operations | No | Yes |
| Can depend on extensions | Yes | No |
| Required at runtime | No (optional) | Yes (if needed by plugin) |

## Best Practices

1. **Register extensions early** - Call `registerExtension()` at app startup before defining context

2. **Document extension requirements** - Plugins should clearly document which extensions they need

3. **Provide sensible defaults** - Built-in extensions should work out of the box

4. **Fail fast** - Missing extensions should throw clear errors at initialization time

```typescript
// Good: Clear error message
// ERROR: Plugin "analytics" requires extension "logger"
// Register loggerExtension before using analyticsPlugin

// Good: Document requirements
/**
 * sessionPlugin
 * @requires cache - For session storage
 * @requires logger - For session logging
 */
```

## Future Considerations

- Extension configuration/options
- Extension overrides
- Multiple implementations (e.g., Redis vs memory cache)
- Extension lifecycle hooks
