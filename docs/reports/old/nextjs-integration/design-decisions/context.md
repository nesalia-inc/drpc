# Context Per-Request

## 4.2 Context Per-Request (Headers, Cookies)

Next.js provides headers/cookies via special functions:

```typescript
import { headers, cookies } from 'next/headers'

// These must be passed to procedures via args
const authHeader = headersList.get('authorization')
const sessionCookie = cookieStore.get('session')
```

### Solution

Pass as part of args or extend context via middleware.

### Related Decisions

- See [hono.md](./hono.md) for the overall architectural decision
- See [async-params.md](./async-params.md) for Next.js 15 async params handling