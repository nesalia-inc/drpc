# Dependencies

## 6. Dependencies

This document specifies the package.json for the `@deessejs/server-next` package.

```json
{
  "name": "@deessejs/server-next",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@deessejs/server": "workspace:*",
    "@deessejs/server-hono": "workspace:*",
    "hono": "^4.0.0"
  },
  "peerDependencies": {
    "next": "^14.0.0 || ^15.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Related Files

- [File Structure](./file-structure.md) - Learn about project structure
- [Implementation Phases](./implementation-phases.md) - Learn about implementation phases