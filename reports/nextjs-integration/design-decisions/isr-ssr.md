# ISR/SSR Support

## 4.4 ISR/SSR Support

These are determined at the route handler level, not procedure level:

```typescript
export const dynamic = 'force-dynamic'  // or 'force-static' for ISR
export const revalidate = 3600          // revalidate every hour
```

### Related Decisions

- See [hono.md](./hono.md) for the overall architectural decision
- See [architecture.md](../architecture.md) for request flow details