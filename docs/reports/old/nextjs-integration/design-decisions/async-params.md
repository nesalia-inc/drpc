# Next.js 15 Async Params

## 4.3 Next.js 15 Async params

Next.js 15+ has async params:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  // ...
}
```

### Related Decisions

- See [context.md](./context.md) for how to handle per-request context
- See [architecture.md](../architecture.md) for request flow details