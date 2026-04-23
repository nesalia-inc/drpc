# File Structure

## 7. File Structure

This document shows the project structure for `packages/server-next/`.

```
packages/server-next/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main exports (createNextHandler)
│   ├── createNextHandler.ts  # Handler factory (uses Hono internally)
│   ├── honoApp.ts           # Hono app setup with routes
│   ├── mapRoute.ts          # Slug + method → procedure mapping
│   ├── errors.ts            # HTTP status mapping
│   ├── types.ts             # Next.js specific types
│   └── cors.ts              # CORS helpers
└── tests/
    └── createNextHandler.test.ts
```

Note: Internally uses Hono via `handle()` from `hono/vercel` for the Next.js adapter.

## Related Files

- [Dependencies](./dependencies.md) - See package.json dependencies
- [Implementation Phases](./implementation-phases.md) - See implementation phases