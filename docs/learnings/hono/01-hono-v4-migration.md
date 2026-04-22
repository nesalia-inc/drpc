# Hono v4 Migration Guide

**Date:** 2026-04-22
**Risk:** Medium
**From:** v3.x to v4.x (currently using v4.0.0, latest is v4.12.x)

---

## Summary

Hono v4 is a major release that introduces Static Site Generation (SSG), Client Components (hono/jsx/dom), and File-based Routing (HonoX). While the core framework remains lightweight, several breaking changes were introduced that require migration attention.

This project currently uses `hono@^4.0.0` through `@deessejs/server-hono` and `@deessejs/server-next`.

---

## Breaking Changes (v3.x to v4.0.0)

### 1. Removed Deprecated Features

| Removed | Replacement |
|---------|-------------|
| `LambdaFunctionUrlRequestContext` | `ApiGatewayRequestContextV2` |
| `hono/nextjs` | `hono/vercel` |
| `c.jsonT()` | `c.json()` |
| `c.stream()` / `c.streamText()` | `stream()` / `streamText()` from `hono/streaming` |
| `c.env()` | `getRuntimeKey()` from `hono/adapter` |
| `app.showRoutes()` | `showRoutes()` from `hono/dev` |
| `app.routerName` | `getRouterName()` from `hono/dev` |
| `app.head()` | `app.get()` (implicit HEAD handling) |
| `app.handleEvent()` | `app.fetch()` |
| `req.cookie()` | `getCookie()` from `hono/cookie` |
| `req.headers()`, `req.body()`, etc. | `req.raw.headers()`, `req.raw.body()`, etc. |

### 2. Cloudflare Workers serveStatic Requires Manifest

If using Cloudflare Workers adapter's `serve-static`, you must now specify the `manifest` option:

```ts
import manifest from '__STATIC_CONTENT_MANIFEST'

app.use('/static/*', serveStatic({ root: './assets', manifest }))
```

### 3. JSX Renderer Middleware docType Default Changed

The `docType` option now defaults to `true`:

```ts
// Before (v3): docType defaulted to false
// After (v4): docType defaults to true
```

### 4. FC Does Not Pass children Automatically

```tsx
// Before (v3)
const Foo: FC = (props) => <div>{props.children}</div>

// After (v4) - Use PropsWithChildren
import type { PropsWithChildren } from 'hono/jsx'
const Foo: FC<PropsWithChildren> = (props) => <div>{props.children}</div>
```

### 5. Mime Types Reduced

Some mime types were removed from default support. If you rely on obscure mime types, you may need to configure them explicitly:

```ts
serveStatic({
  root: './assets',
  mimes: {
    // Add any missing mime types here
  }
})
```

### 6. Type Changes for Validator and Route Chaining

The validator now throws errors rather than returning `c.json()`:

```ts
// Before (v3) - validator returned error response
app.post('/posts', validator('json', schema), async (c) => {
  // validation failed would return c.json() automatically
})

// After (v4) - validator throws HTTPException
app.post('/posts', validator('json', schema), async (c) => {
  const body = c.req.valid('json')
  // Must handle validation errors manually
})
```

Validator also now supports transformation:

```ts
const schema = z.object({
  name: z.string(),
  age: z.string().transform(v => parseInt(v, 10))  // Now supported
})
```

---

## @hono/node-server v1 to v2 Breaking Changes

### 1. Node.js v18 No Longer Supported

v2 requires **Node.js v20 or later**. Node.js v18 reached end-of-life.

### 2. Vercel Adapter Removed

The `@hono/node-server/vercel` adapter has been removed. For Vercel deployments, use the built-in adapter approach:

```ts
// Before - used @hono/node-server/vercel
import { handle } from '@hono/node-server/vercel'

// After - use getRequestListener directly
import type { Hono } from 'hono'
import { getRequestListener } from '@hono/node-server'

export const handle = (app: Hono) => {
  return getRequestListener(app.fetch)
}
```

### 3. Performance Improvements

v2 is up to **2.3x faster** for body parsing scenarios due to:
- Direct reading from Node.js `IncomingMessage` for request bodies
- LightweightRequest/LightweightResponse optimizations
- Various caching improvements

---

## Migration Steps

### Step 1: Update Deprecated API Usage

Search for and replace deprecated APIs:

```bash
# Find deprecated usage
grep -r "c\.jsonT\|c\.stream\|c\.env\|app\.showRoutes\|app\.routerName\|app\.handleEvent" --include="*.ts"
grep -r "req\.cookie\|req\.headers\|req\.body" --include="*.ts"
```

### Step 2: Update Cloudflare Workers Static Files

If using serveStatic on Cloudflare Workers, add the manifest option.

### Step 3: Update JSX Components

```tsx
// If using FC with children
import type { FC, PropsWithChildren } from 'hono/jsx'

// Change from:
const Layout: FC = (props) => <div>{props.children}</div>

// To:
const Layout: FC<PropsWithChildren> = (props) => <div>{props.children}</div>
```

### Step 4: Update Node.js Version

Ensure your environment uses Node.js v20+:

```bash
node --version  # Should be >= 20.0.0
```

### Step 5: Update Vercel Deployments

If deploying to Vercel, update the handler:

```ts
// Replace @hono/node-server/vercel with direct getRequestListener
```

### Step 6: Verify Validator Usage

Check all validator usage and ensure proper error handling:

```ts
// Add try/catch for validation errors or use middleware
app.post('/posts', 
  validator('json', schema),
  async (c) => {
    try {
      const data = c.req.valid('json')
      return c.json({ success: true, data })
    } catch (e) {
      return c.json({ error: 'Validation failed' }, 400)
    }
  }
)
```

---

## Security Fixes in v4.12.x (Recent)

Recent versions include important security fixes:

| Version | Issue |
|---------|-------|
| v4.12.14 | JSX SSR attribute name validation fix |
| v4.12.12 | Middleware bypass via repeated slashes (GHSA-wmmm-f939-6g9c) |
| v4.12.12 | Path traversal in toSSG() (GHSA-xf4j-xp2r-rqqx) |
| v4.12.12 | Incorrect IP matching in ipRestriction() |
| v4.12.12 | Cookie validation fixes (multiple GHSAs) |

**Recommendation:** Upgrade to v4.12.12+ for security fixes.

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Update deprecated API calls | 2-4 hours |
| Fix JSX components (FC/PropsWithChildren) | 1-2 hours |
| Cloudflare Workers manifest config | 30 minutes |
| Node.js version update | 15 minutes |
| Vercel handler update (if applicable) | 30 minutes |
| Validator error handling review | 1-2 hours |
| Testing and verification | 2-4 hours |

**Total:** 7-14 hours depending on codebase size

---

## References

- [Hono Migration Guide](https://github.com/honojs/hono/blob/main/docs/MIGRATION.md)
- [Hono v4.0.0 Release Notes](https://github.com/honojs/hono/releases/tag/v4.0.0)
- [Hono Node.js Adapter v2.0.0](https://github.com/honojs/node-server/releases/tag/v2.0.0)
- [Hono Documentation](https://hono.dev)
