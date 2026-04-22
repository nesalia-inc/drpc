# Next.js v15 to v16 Migration Guide

**Date:** 2026-04-22  
**Risk Level:** High  
**Source:** [Next.js v16.0.0 Release Notes](https://github.com/vercel/next.js/releases/tag/v16.0.0) | [Upgrade Documentation](https://nextjs.org/docs/getting-started/upgrading)

## Summary

Next.js v16 is a major release with significant architectural changes. The most notable changes include Turbopack becoming the default bundler, deprecation of Middleware in favor of the new Proxy API, stabilization of Cache Components, and React 19 support.

---

## Breaking Changes

### 1. Turbopack is Now Default

**Change:** Turbopack is now the default bundler for all builds (previously opt-in).

```bash
# No longer need --turbopack flag
next build  # Now uses Turbopack by default

# --webpack flag to opt-out
next build --webpack
```

**Migration:**
- If you have custom webpack configurations, test thoroughly
- Remove any --turbopack flags from scripts
- Use --webpack flag if you need webpack temporarily

---

### 2. Middleware Deprecated - Proxy API Introduced

**Change:** Middleware is deprecated, replaced by the new Proxy API.

```typescript
// OLD (middleware.ts)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.rewrite(new URL('/api', request.url))
}

// NEW (proxy.ts)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return NextResponse.rewrite(new URL('/api', request.url))
}
```

**Migration Steps:**
1. Rename middleware.ts to proxy.ts
2. Rename middleware export to proxy
3. Use the codemod: npx @next/codemod@latest middleware-to-proxy
4. Update any imports from middleware field to proxy in onRequestError

**Note:** MiddlewareMatcher is now ProxyMatcher.

---

### 3. Dynamic APIs Now Require Async Access

**Change:** Synchronous access to dynamic APIs is removed.

```typescript
// BEFORE (v15) - Sync access still worked in some cases
const searchParams = useSearchParams()
const dynamic = cookies()

// AFTER (v16) - Must be async
const searchParams = await useSearchParams()
const dynamic = await cookies()
```

**Migration:**
- All cookies(), headers(), searchParams, params, and similar dynamic APIs now return Promises
- Update all usages to await these values

---

### 4. Cache Components Enabled by Default

**Change:** cacheComponents is now enabled by default (previously experimental).

```typescript
// Use cache directive now works by default
export default async function Page() {
  const data = await fetch('/api/data', { cache: 'force-cache' })
  return <div>{data}</div>
}
```

**Removed Configuration Flags:**
- experimental.cacheComponents - Now the default behavior
- experimental.dynamicIO - Removed, bundled with cacheComponents
- experimental.clientParamParsing - Removed, bundled with cacheComponents
- experimental.rdcForNavigations - Removed, bundled with cacheComponents

---

### 5. Removed Deprecated Configurations

#### publicRuntimeConfig and serverRuntimeConfig
```typescript
// REMOVED - These no longer exist
module.exports = {
  publicRuntimeConfig: { ... },
  serverRuntimeConfig: { ... }
}
```

#### unstable_rootParams
```typescript
// REMOVED - Use the new routing API instead
export const unstable_rootParams = { ... }
```

#### .turbo config object
```typescript
// REMOVED - Turbopack config is now automatic
module.exports = {
  turbo: { ... }  // This config is no longer used
}
```

---

### 6. AMP Support Completely Removed

**Change:** AMP is no longer supported.

- AMP codemod removed (npx @next/codemod@latest amp)
- Built-in AMP functionality removed
- examples/amp example removed
- Documentation for AMP removed

**Migration:** If you use AMP, you need to maintain it independently or migrate to a different solution.

---

### 7. TypeScript Minimum Version Bumped

**Change:** Minimum TypeScript version is now 5.1.0.

```bash
# Before upgrading, ensure TypeScript >= 5.1.0
npm install typescript@latest
```

---

### 8. ESLint Flat Config Default

**Change:** @next/eslint-plugin-next now uses ESLint Flat Config by default.

```javascript
// eslint.config.mjs (NEW - default)
import { FlatCompat } from '@eslint/eslintrc'
import plugin from '@next/eslint-plugin-next'

const compat = new FlatCompat()
const eslintConfig = [
  ...compat.config({ plugins: { [plugin.name]: plugin } }),
  { rules: { [plugin.ruleName]: 'error' } }
]

export default eslintConfig
```

**Migration:**
- Legacy .eslintrc is deprecated
- Use flat config by default
- Codemod available: npx @next/codemod@latest-latest eslint-config-migration

---

### 9. Browserslist Config Updated

**Change:** Default browserslist has been updated.

---

### 10. Sass-loader Upgraded to v16

**Change:** sass-loader v16 is now required.

---

### 11. Image Component Changes

#### images.domains Deprecated
Use images.localPatterns instead.

#### next/legacy/image Deprecated
Use next/image instead.

#### images.imageSizes Default Changed
16px removed from default config.

#### images.minimumCacheTTL Changed
Default changed from 1 minute to 4 hours (14400 seconds).

#### New Image Options
- images.dangerouslyAllowLocalIP: true
- images.maximumRedirects: 5

---

### 12. PPR (Partial Prerendering) Deprecated

**Change:** experimental_ppr route-level configuration is removed.

---

### 13. Router Scroll Optimization Enabled

**Change:** experimental.routerScrollOptimization is now enabled by default.

---

### 14. ESLint Removed from Build

**Change:** next lint no longer runs automatically during next build.

---

### 15. unstable_ Prefix Removed from Cache APIs

cacheLife() and cacheTag() no longer require unstable_ prefix.

---

### 16. React 19 Support

Next.js v16 upgrades to React 19, bringing new features and improvements.

---

## Migration Checklist

- [ ] Review and test with Turbopack (remove --turbopack flags)
- [ ] Migrate Middleware to Proxy API (use codemod)
- [ ] Update dynamic API calls to async/await
- [ ] Remove deprecated configurations
- [ ] Update TypeScript to >= 5.1.0
- [ ] Migrate to ESLint Flat Config
- [ ] Replace images.domains with images.localPatterns
- [ ] Replace next/legacy/image with next/image
- [ ] Update images.minimumCacheTTL if relying on old default
- [ ] Review browserslist changes
- [ ] Upgrade sass-loader to v16
- [ ] Remove any PPR (experimental_ppr) configurations
- [ ] Update unstable_cacheLife/unstable_cacheTag to cacheLife/cacheTag
- [ ] Run codemods: npx @next/codemod@latest middleware-to-proxy

---

## References

- [Next.js v16.0.0 Release](https://github.com/vercel/next.js/releases/tag/v16.0.0)
- [Next.js Upgrade Guide](https://nextjs.org/docs/getting-started/upgrading)
- [Next.js Blog - Next 16](https://nextjs.org/blog/next-16)
