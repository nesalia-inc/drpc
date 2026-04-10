# @deessejs/server Basic Example

Minimal example showing how to use `@deessejs/server` to create a type-safe RPC API.

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

## What it demonstrates

1. **`defineContext()`** - Create a context with database access
2. **`t.query()`** - Define public read operations
3. **`t.mutation()`** - Define public write operations
4. **`t.internalQuery()`** - Define server-only read operations
5. **`t.router()`** - Organize procedures hierarchically
6. **`createAPI()`** - Create an executable API
7. **`api.execute()`** - Call procedures by route string

## Code Overview

```typescript
import { defineContext } from "@deessejs/server";
import { ok, err } from "@deessejs/fp";
import { z } from "zod";

const { t, createAPI } = defineContext({
  context: { db, logger: console },
});

// Define procedures
const listUsers = t.query({
  handler: async (ctx) => ok(ctx.db.users),
});

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = ctx.db.users.find(u => u.id === args.id);
    if (!user) return err({ code: "NOT_FOUND", message: "User not found" });
    return ok(user);
  },
});

// Create API and execute
const api = createAPI({
  router: t.router({ users: t.router({ list: listUsers, get: getUser }) }),
});

const result = await api.execute("users.list");
```

## Output

```
=== @deessejs/server Basic Example ===

1. List all users:
   Success: [{ id: 1, name: 'Alice', ... }, { id: 2, name: 'Bob', ... }]

2. Get user by ID:
   Success: { id: 1, name: 'Alice', ... }

3. Get non-existent user:
   Error: { code: 'NOT_FOUND', message: 'User 999 not found' }

...
```
