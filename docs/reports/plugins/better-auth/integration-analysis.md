# Better-Auth Integration for drpc: RPC-Managed Auth Routes

## Executive Summary

The goal is to use **better-auth as the internal engine** (password hashing, session storage, OAuth flows) while exposing its functionality through **drpc RPC procedures** (`t.auth.*`).

**In this design:**
- Better-auth manages the internal mechanics (session creation, validation, user storage)
- Our plugin exposes RPC procedures that call better-auth's internal API
- Auth routes become procedures: `t.auth.signIn()`, `t.auth.getSession()`, etc.
- No separate HTTP handler needed - everything goes through drpc

---

## 1. The Vision

### 1.1 Current (Better-Auth Owns Routes)

```typescript
// Better-auth owns HTTP endpoints
const auth = betterAuth({ database: dbAdapter });
app.use("/auth", auth.handler);  // HTTP handler for /sign-in, /sign-up, etc.

// But we want to use drpc for everything
const api = createAPI({ router: appRouter });
app.use("/api", api.handler);  // Our RPC routes
```

### 1.2 Target (drpc Manages Routes)

```typescript
// Better-auth provides the ENGINE
const { t, createAPI } = defineContext({ context: { db } })
  .use(betterAuthPlugin({ database: dbAdapter, ... }))
  .build();

const appRouter = t.router({
  // Our business logic
  users: {
    list: t.query({ ... }),
  },

  // Auth procedures - powered by better-auth engine
  auth: {
    signIn: t.auth.signIn({ ... }),       // → /auth.signIn RPC
    signUp: t.auth.signUp({ ... }),       // → /auth.signUp RPC
    signOut: t.auth.signOut({ ... }),      // → /auth.signOut RPC
    getSession: t.auth.getSession({ ... }), // → /auth.getSession RPC
    listSessions: t.auth.listSessions({ ... }), // → /auth.listSessions RPC
    updateUser: t.auth.updateUser({ ... }),    // → /auth.updateUser RPC
    deleteUser: t.auth.deleteUser({ ... }),    // → /auth.deleteUser RPC
  },
});

const api = createAPI({ router: appRouter });
app.use("/api", api.handler);  // Single handler for everything
```

---

## 2. Better-Auth as an Engine

### 2.1 What Better-Auth Provides

Better-auth's internal API (from `auth.api`) provides:

```typescript
// From packages/better-auth/src/auth/base.ts
interface Auth<Options> {
  api: {
    // Session management
    session: () => Promise<Session | null>;
    listSessions: () => Promise<Session[]>;
    revokeSession: (sessionId: string) => Promise<void>;
    revokeOtherSessions: () => Promise<void>;
    revokeAllSessions: () => Promise<void>;

    // User management
    getUser: () => Promise<User | null>;
    updateUser: (updates: Partial<User>) => Promise<User>;
    deleteUser: () => Promise<void>;
    changeEmail: (newEmail: string) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

    // Sign in/up
    signInEmail: (options: { email: string; password: string; rememberMe?: boolean }) => Promise<Session>;
    signUpEmail: (options: { email: string; password: string; name: string; ... }) => Promise<Session>;

    // OAuth
    signInOAuth: (options: { provider: string; ... }) => Promise<void>;  // Redirects

    // Sign out
    signOut: () => Promise<void>;

    // Account management
    linkAccount: (provider: string, ...) => Promise<void>;
    unlinkAccount: (provider: string) => Promise<void>;
    listAccounts: () => Promise<Account[]>;

    // Verification
    sendVerificationEmail: (email: string) => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;

    // Password reset
    requestPasswordReset: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;

    // And many more...
  };
}
```

### 2.2 Database Adapter Pattern

Better-auth uses an adapter pattern for storage:

```typescript
interface DBAdapter {
  // Users
  createUser: (user: NewUser) => Promise<User>;
  findUserByEmail: (email: string) => Promise<User | null>;
  findUserById: (id: string) => Promise<User | null>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  // Sessions
  createSession: (session: NewSession) => Promise<Session>;
  findSession: (token: string) => Promise<Session | null>;
  updateSession: (token: string, updates: Partial<Session>) => Promise<Session>;
  deleteSession: (token: string) => Promise<void>;
  deleteUserSessions: (userId: string) => Promise<void>;
  findSessionsByUserId: (userId: string) => Promise<Session[]>;

  // Accounts (OAuth linking)
  createAccount: (account: NewAccount) => Promise<Account>;
  findAccountByProviderId: (provider: string, accountId: string) => Promise<Account | null>;
  deleteAccount: (accountId: string) => Promise<void>;
}
```

Available adapters:
- `drizzleAdapter` - Drizzle ORM
- `prismaAdapter` - Prisma
- `kyselyAdapter` - Kysely
- `mongoAdapter` - MongoDB
- `memoryAdapter` - In-memory (testing)

---

## 3. Plugin Design

### 3.1 The Plugin Function

```typescript
// packages/server/plugins/better-auth/src/index.ts

import { plugin } from "@deessejs/server";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import type { BetterAuthOptions, Session, User } from "better-auth/types";

export interface BetterAuthPluginArgs {
  database: Database;  // Drizzle, Prisma, etc.
  secretKey: string;
  baseURL?: string;
  emailPassword?: {
    enabled?: boolean;
    requireEmailVerification?: boolean;
  };
  email?: {
    senderName?: string;
    senderEmail?: string;
  };
  socialProviders?: Record<string, OAuthConfig>;
}

export interface BetterAuthEnrichment {
  auth: {
    signIn: (config: {
      args?: ZodType<{ email: string; password: string; rememberMe?: boolean }>;
      handler?: Handler;
    }) => MutationProcedure;

    signUp: (config: {
      args?: ZodType<{ email: string; password: string; name: string }>;
      handler?: Handler;
    }) => MutationProcedure;

    signOut: (config?: { args?: ZodType<{}> }) => MutationProcedure;

    getSession: (config?: { args?: ZodType<{}> }) => QueryProcedure;

    listSessions: (config?: { args?: ZodType<{}> }) => QueryProcedure;

    revokeSession: (config: {
      args?: ZodType<{ sessionId: string }>;
    }) => MutationProcedure;

    updateUser: (config: {
      args?: ZodType<Partial<User>>;
    }) => MutationProcedure;

    deleteUser: (config?: { args?: ZodType<{}> }) => MutationProcedure;
  };
}

export const betterAuthPlugin = plugin("better-auth", {
  // Custom args
  database: null as any,
  secretKey: "",
  baseURL: "http://localhost:3000",
  emailPassword: { enabled: true },
  socialProviders: {},

  // Setup better-auth internally
  setup: async (args) => {
    // Create better-auth instance
    const auth = betterAuth({
      database: drizzleAdapter(args.database, { type: "pg" }),
      secretKey: args.secretKey,
      baseURL: args.baseURL,
      emailAndPassword: args.emailPassword,
      socialProviders: args.socialProviders,
    });

    return {
      // Expose auth instance for procedures
      auth,
    };
  },

  // extend: session info available in ALL procedures
  extend: (ctx, args) => ({
    get session(): Session | null {
      // Call better-auth's session getter
      return args.auth.api.session();
    },
    get user(): User | null {
      return args.auth.api.getUser();
    },
  }),

  // extendInternal: full auth API in INTERNAL procedures only
  extendInternal: (ctx, args) => ({
    auth: {
      api: args.auth.api,
      session: args.auth.$context.session,
      user: args.auth.$context.session?.user,
    },
  }),

  // enrichT: expose auth procedures
  enrichT: (t, args) => ({
    auth: {
      // Sign In
      signIn: (config) => {
        return t.mutation({
          name: "auth.signIn",
          args: config?.args || z.object({
            email: z.string().email(),
            password: z.string().min(8),
            rememberMe: z.boolean().optional(),
          }),
          handler: async (ctx, args) => {
            try {
              const session = await ctx.auth.api.signInEmail(args);
              return ok(session);
            } catch (error) {
              return err(new Error(error.message));
            }
          },
        });
      },

      // Sign Up
      signUp: (config) => {
        return t.mutation({
          name: "auth.signUp",
          args: config?.args || z.object({
            email: z.string().email(),
            password: z.string().min(8),
            name: z.string().min(1),
          }),
          handler: async (ctx, args) => {
            try {
              const session = await ctx.auth.api.signUpEmail(args);
              return ok(session);
            } catch (error) {
              return err(new Error(error.message));
            }
          },
        });
      },

      // Sign Out
      signOut: (config) => {
        return t.mutation({
          name: "auth.signOut",
          args: config?.args || z.object({}),
          handler: async (ctx, _args) => {
            await ctx.auth.api.signOut();
            return ok({ success: true });
          },
        });
      },

      // Get Session (current)
      getSession: (config) => {
        return t.query({
          name: "auth.getSession",
          args: config?.args || z.object({}),
          handler: async (ctx, _args) => {
            const session = await ctx.auth.api.session();
            return ok(session);
          },
        });
      },

      // List All Sessions
      listSessions: (config) => {
        return t.query({
          name: "auth.listSessions",
          args: config?.args || z.object({}),
          handler: async (ctx, _args) => {
            const sessions = await ctx.auth.api.listSessions();
            return ok(sessions);
          },
        });
      },

      // Revoke Session
      revokeSession: (config) => {
        return t.mutation({
          name: "auth.revokeSession",
          args: config?.args || z.object({
            sessionId: z.string(),
          }),
          handler: async (ctx, args) => {
            await ctx.auth.api.revokeSession(args.sessionId);
            return ok({ success: true });
          },
        });
      },

      // Update User
      updateUser: (config) => {
        return t.mutation({
          name: "auth.updateUser",
          args: config?.args || z.object({
            name: z.string().optional(),
            image: z.string().optional(),
          }),
          handler: async (ctx, args) => {
            const user = await ctx.auth.api.updateUser(args);
            return ok(user);
          },
        });
      },

      // Delete User
      deleteUser: (config) => {
        return t.mutation({
          name: "auth.deleteUser",
          args: config?.args || z.object({}),
          handler: async (ctx, _args) => {
            await ctx.auth.api.deleteUser();
            return ok({ success: true });
          },
        });
      },
    },
  }),
});
```

---

## 4. Usage

### 4.1 Setup

```typescript
// src/server/index.ts
import { drizzle } from "drizzle-orm";
import { postgres } from "drizzle-orm/pg-core";
import { defineContext } from "@deessejs/server";
import { betterAuthPlugin } from "@deessejs/server/plugins/better-auth";

const db = drizzle(postgres(process.env.DATABASE_URL!));

const { t, createAPI } = defineContext({ context: { db } })
  .use(betterAuthPlugin({
    database: db,
    secretKey: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
    emailPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  }))
  .build();

const appRouter = t.router({
  users: {
    list: t.query({
      args: z.object({ limit: z.number().default(10) }),
      handler: async (ctx, args) => {
        // ctx.session is available (from extend)
        // ctx.user is available (from extend)
        // ctx.auth is NOT available (only in internal procedures)
        const users = await ctx.db.query.users.findMany({ limit: args.limit });
        return ok(users);
      },
    }),
  },

  // Auth procedures from better-auth
  auth: {
    signIn: t.auth.signIn(),
    signUp: t.auth.signUp(),
    signOut: t.auth.signOut(),
    getSession: t.auth.getSession(),
    listSessions: t.auth.listSessions(),
  },
});

export const api = createAPI({ router: appRouter });
```

### 4.2 Client Usage

```typescript
// Client - typed RPC calls
const client = createClient({ transport: fetch, url: "/api" });

// Sign in
const signInResult = await client.auth.signIn({
  email: "user@example.com",
  password: "password123",
  rememberMe: true,
});

// Get session
const session = await client.auth.getSession({});

// Sign out
await client.auth.signOut({});
```

---

## 5. Two-Tier Context Security

### 5.1 What `extend` Provides (ALL Procedures)

```typescript
extend: (ctx, args) => ({
  session: args.auth.api.session(),  // Current session
  user: args.auth.api.getUser(),     // Current user
}),
```

**Available in:**
- `t.query()`
- `t.mutation()`

### 5.2 What `extendInternal` Provides (INTERNAL Procedures Only)

```typescript
extendInternal: (ctx, args) => ({
  auth: {
    api: args.auth.api,           // Full auth API
    session: args.auth.$context.session,
    user: args.auth.$context.session?.user,
  },
}),
```

**Available in:**
- `t.internalQuery()`
- `t.internalMutation()`

### 5.3 Security Model

| Procedure | `ctx.session` | `ctx.user` | `ctx.auth` |
|-----------|---------------|------------|------------|
| `t.query()` | ✅ | ✅ | ❌ |
| `t.mutation()` | ✅ | ✅ | ❌ |
| `t.internalQuery()` | ✅ | ✅ | ✅ |
| `t.internalMutation()` | ✅ | ✅ | ✅ |

This means:
- **Public procedures** can access session/user for authorization
- **Internal procedures** have full auth API for admin operations
- **Better-auth's privileged operations** (delete user, revoke all sessions, etc.) are in `internalMutation`

---

## 6. Auth Routes as RPC Procedures

### 6.1 Procedure Mapping

| Better-Auth Endpoint | RPC Procedure | Type |
|---------------------|---------------|------|
| POST `/sign-in/email` | `t.auth.signIn()` | mutation |
| POST `/sign-up/email` | `t.auth.signUp()` | mutation |
| POST `/sign-out` | `t.auth.signOut()` | mutation |
| GET `/get-session` | `t.auth.getSession()` | query |
| GET `/list-sessions` | `t.auth.listSessions()` | query |
| POST `/revoke-session` | `t.auth.revokeSession()` | mutation |
| POST `/update-session` | `t.auth.updateUser()` | mutation |
| POST `/delete-user` | `t.auth.deleteUser()` | mutation |
| GET `/callback/:provider` | `t.auth.callback()` | mutation |

### 6.2 OAuth Flow

OAuth requires a redirect, which is different from regular RPC:

```typescript
// For OAuth, we need a different approach
enrichT: (t, args) => ({
  auth: {
    // OAuth sign in - returns URL to redirect to
    signInOAuth: (config) => {
      return t.mutation({
        name: "auth.signInOAuth",
        args: z.object({ provider: z.string() }),
        handler: async (ctx, args) => {
          // Better-auth handles the OAuth redirect
          const url = await ctx.auth.api.signInOAuth({
            provider: args.provider,
            callbackURL: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
          });
          return ok({ redirectUrl: url });
        },
      });
    },

    // OAuth callback - called by the callback page
    callbackOAuth: (config) => {
      return t.mutation({
        name: "auth.callbackOAuth",
        args: z.object({ url: z.string() }),
        handler: async (ctx, args) => {
          await ctx.auth.api.signInOAuth(args);
          return ok({ success: true });
        },
      });
    },
  },
})),
```

---

## 7. Implementation Challenges

### 7.1 Session Extraction

Better-auth stores session in cookies. We need to extract it per-request:

```typescript
// Problem: better-auth's session() reads from request cookies
// Our RPC handler doesn't automatically pass cookies

// Solution: Middleware that extracts session
const authMiddleware: Middleware = {
  name: "better-auth-session",
  handler: async (ctx, { next, request }) => {
    // Get session from better-auth using the request
    const session = await ctx.auth.api.session();

    // Pass session in context
    return next({ ctx: { ...ctx, session } });
  },
};
```

### 7.2 Cookie Handling

Better-auth uses HTTP-only cookies. Our RPC needs to:

1. **Read cookies** from the incoming request
2. **Set cookies** in the response

```typescript
// In our RPC handler
handler: async (request: Request) => {
  // Extract session from cookie
  const session = await betterAuth.api.session(request);

  // Set session cookie on response
  const response = await executeProcedure(...);
  response.headers.set("Set-Cookie", sessionCookie);

  return response;
}
```

### 7.3 Type Bridge

Better-auth's types don't match our generics. We need a type bridge:

```typescript
// Type bridge
import type { Session, User } from "better-auth/types";
import type { ZodType } from "zod";

interface AuthContext {
  session: Session | null;
  user: User | null;
  auth?: {
    api: AuthApi;
  };
}
```

---

## 8. Key Files to Create

```
packages/server/plugins/better-auth/
├── src/
│   ├── index.ts              # Main plugin
│   ├── types.ts               # TypeScript types
│   ├── session-middleware.ts # Cookie extraction middleware
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## 9. Implementation Plan

### Phase 1: Core Plugin

1. Create plugin structure
2. Implement `betterAuthPlugin()` function
3. Set up better-auth instance internally
4. Implement basic procedures (signIn, signUp, signOut, getSession)

### Phase 2: Session Handling

5. Add session extraction middleware
6. Handle cookie reading/writing
7. Test session persistence

### Phase 3: Full Procedures

8. Add all user management procedures
9. Add session management procedures
10. Test OAuth flows

### Phase 4: Security

11. Ensure `extendInternal` works correctly
12. Add tests for procedure isolation
13. Document security model

---

## 10. Conclusion

This design allows:
- **Better-auth** to provide the authentication engine (password hashing, session storage, OAuth)
- **drpc** to expose auth functionality as RPC procedures
- **Unified API** - everything goes through our RPC, no separate auth HTTP handler
- **Two-Tier Context** - session/user in all procedures, full auth API in internal procedures

The plugin bridges better-auth's internal API to our procedure system, making auth a first-class RPC citizen.

---

## See Also

- [Plugin Enrich `t`](../enrich-t/README.md) - The behavior enrichment approach
- [Plugin Procedure System](../enrich-t/plugin-procedure-system.md) - Alternative approach
- [Plugin Typing Solutions](../enrich-t/plugin-typing-solutions.md) - TypeScript typing solutions
- [drpc Plugins](../plugins/drpc-plugins.md) - Current drpc plugin architecture
- [Better-Auth Repository](https://github.com/better-auth/better-auth) - Official better-auth project
- [Better-Auth Documentation](https://better-auth.com) - Official documentation
