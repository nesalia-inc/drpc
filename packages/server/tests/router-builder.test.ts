import { describe, it, expect } from "vitest";
import { QueryBuilder } from "../src/query/builder.js";
import { z } from "zod";
import { ok } from "../src/errors/index.js";
import { EventEmitter } from "../src/events/emitter.js";

describe("RouterBuilder (QueryBuilder)", () => {
  // Test context type
  interface TestCtx {
    db: {
      find: () => { id: number; name: string };
      create: (data: unknown) => { id: number };
    };
    name: string;
  }

  const testCtx: TestCtx = {
    db: {
      find: () => ({ id: 1, name: "test" }),
      create: (data) => ({ id: 42, ...(data as object) }),
    },
    name: "test-context",
  };

  describe("query()", () => {
    it("creates a procedure with type 'query'", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id, name: ctx.name });
        },
      });

      expect(query.type).toBe("query");
    });

    it("creates a query with correct args schema", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const argsSchema = z.object({ id: z.number() });
      const query = builder.query({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(query._def.argsSchema).toBe(argsSchema);
      expect(query._def.type).toBe("query");
    });

    it("creates a query without args", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(query.type).toBe("query");
      expect(query._def.argsSchema).toBeUndefined();
    });
  });

  describe("mutation()", () => {
    it("creates a procedure with type 'mutation'", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const mutation = builder.mutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok({ id: 1, name: args.name });
        },
      });

      expect(mutation.type).toBe("mutation");
    });

    it("creates a mutation with correct args schema", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const argsSchema = z.object({ name: z.string() });
      const mutation = builder.mutation({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok({ id: 1, name: args.name });
        },
      });

      expect(mutation._def.argsSchema).toBe(argsSchema);
      expect(mutation._def.type).toBe("mutation");
    });
  });

  describe("internalQuery()", () => {
    it("creates a procedure with type 'internalQuery'", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const internalQuery = builder.internalQuery({
        handler: async (ctx) => {
          return ok({ id: ctx.db.find().id });
        },
      });

      expect(internalQuery.type).toBe("internalQuery");
    });

    it("creates an internalQuery without args", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const internalQuery = builder.internalQuery({
        handler: async (ctx) => {
          return ok({ id: ctx.db.find().id });
        },
      });

      expect(internalQuery.type).toBe("internalQuery");
      expect(internalQuery._def.argsSchema).toBeUndefined();
    });
  });

  describe("internalMutation()", () => {
    it("creates a procedure with type 'internalMutation'", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const internalMutation = builder.internalMutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok(ctx.db.create({ name: args.name }) as { id: number });
        },
      });

      expect(internalMutation.type).toBe("internalMutation");
    });

    it("creates an internalMutation with correct args schema", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const argsSchema = z.object({ name: z.string() });
      const internalMutation = builder.internalMutation({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok(ctx.db.create({ name: args.name }) as { id: number });
        },
      });

      expect(internalMutation._def.argsSchema).toBe(argsSchema);
      expect(internalMutation._def.type).toBe("internalMutation");
    });
  });

  describe("router()", () => {
    it("creates a router with queries and mutations", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);

      const router = builder.router({
        queries: {
          getUser: builder.query({
            args: z.object({ id: z.number() }),
            handler: async (ctx, args) => {
              return ok({ id: args.id, name: ctx.name });
            },
          }),
        },
        mutations: {
          createUser: builder.mutation({
            args: z.object({ name: z.string() }),
            handler: async (ctx, args) => {
              return ok({ id: 1, name: args.name });
            },
          }),
        },
      });

      expect(router.queries.getUser).toBeDefined();
      expect(router.queries.getUser.type).toBe("query");
      expect(router.mutations.createUser).toBeDefined();
      expect(router.mutations.createUser.type).toBe("mutation");
    });

    it("creates nested routers", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);

      const router = builder.router({
        users: builder.router({
          queries: {
            getUser: builder.query({
              handler: async (ctx) => {
                return ok({ id: 1, name: ctx.name });
              },
            }),
          },
        }),
      });

      expect(router.users).toBeDefined();
      expect(router.users.queries.getUser).toBeDefined();
      expect(router.users.queries.getUser.type).toBe("query");
    });
  });

  describe("middleware()", () => {
    it("creates a middleware", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const middleware = builder.middleware({
        name: "test-middleware",
        handler: async (ctx, opts) => {
          return opts.next();
        },
      });

      expect(middleware.name).toBe("test-middleware");
      expect(typeof middleware.handler).toBe("function");
    });

    it("creates middleware with args schema", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const middleware = builder.middleware({
        name: "auth-middleware",
        args: z.object({ token: z.string() }),
        handler: async (ctx, opts) => {
          return opts.next();
        },
      });

      expect(middleware.name).toBe("auth-middleware");
      expect(middleware.args).toBeDefined();
    });
  });

  describe("procedure hooks", () => {
    it("query has beforeInvoke method", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(typeof query.beforeInvoke).toBe("function");
    });

    it("query has afterInvoke method", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(typeof query.afterInvoke).toBe("function");
    });

    it("query has onSuccess method", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(typeof query.onSuccess).toBe("function");
    });

    it("query has onError method", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(typeof query.onError).toBe("function");
    });

    it("query has use method for middleware", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(typeof query.use).toBe("function");
    });

    it("mutation has all hook methods", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const mutation = builder.mutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok({ id: 1, name: args.name });
        },
      });

      expect(typeof mutation.beforeInvoke).toBe("function");
      expect(typeof mutation.afterInvoke).toBe("function");
      expect(typeof mutation.onSuccess).toBe("function");
      expect(typeof mutation.onError).toBe("function");
      expect(typeof mutation.use).toBe("function");
    });

    it("internalQuery has all hook methods", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const internalQuery = builder.internalQuery({
        handler: async (ctx) => {
          return ok({ id: ctx.db.find().id });
        },
      });

      expect(typeof internalQuery.beforeInvoke).toBe("function");
      expect(typeof internalQuery.afterInvoke).toBe("function");
      expect(typeof internalQuery.onSuccess).toBe("function");
      expect(typeof internalQuery.onError).toBe("function");
      expect(typeof internalQuery.use).toBe("function");
    });

    it("internalMutation has all hook methods", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const internalMutation = builder.internalMutation({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok(ctx.db.create({ name: args.name }) as { id: number });
        },
      });

      expect(typeof internalMutation.beforeInvoke).toBe("function");
      expect(typeof internalMutation.afterInvoke).toBe("function");
      expect(typeof internalMutation.onSuccess).toBe("function");
      expect(typeof internalMutation.onError).toBe("function");
      expect(typeof internalMutation.use).toBe("function");
    });
  });

  describe("middleware chaining with use()", () => {
    it("applies middleware to query via use()", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      const withMiddleware = query.use(middleware);

      expect(withMiddleware._middleware).toHaveLength(1);
      expect(withMiddleware._middleware[0]).toBe(middleware);
    });

    it("use() returns procedure with updated middleware array", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const middleware1 = {
        name: "middleware-1",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };
      const middleware2 = {
        name: "middleware-2",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      const withMiddleware = query.use(middleware1).use(middleware2);

      expect(withMiddleware._middleware).toHaveLength(2);
      expect(withMiddleware._middleware[0]).toBe(middleware1);
      expect(withMiddleware._middleware[1]).toBe(middleware2);
    });

    it("beforeInvoke returns same procedure type", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      const chained = query.beforeInvoke((ctx, args) => {});

      expect(chained.type).toBe("query");
    });
  });

  describe("on() event handling", () => {
    it("registers an event handler", () => {
      interface TestEvents {
        "user.created": { id: number; name: string };
      }

      const eventEmitter = new EventEmitter<TestEvents>();
      const builder = new QueryBuilder<TestCtx, TestEvents>(testCtx, eventEmitter);

      const unsubscribe = builder.on("user.created", (ctx, payload) => {
        // Handle event
      });

      expect(typeof unsubscribe).toBe("function");
    });

    it("returns a no-op unsubscribe function when no event emitter", () => {
      interface TestEvents {
        "user.created": { id: number; name: string };
      }

      const builder = new QueryBuilder<TestCtx, TestEvents>(testCtx);

      const unsubscribe = builder.on("user.created", (ctx, payload) => {
        // Handle event
      });

      expect(typeof unsubscribe).toBe("function");
      unsubscribe(); // Should not throw
    });
  });

  describe("nested routers with procedures", () => {
    it("creates deeply nested router structure", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);

      const router = builder.router({
        api: builder.router({
          v1: builder.router({
            users: builder.router({
              queries: {
                getUser: builder.query({
                  args: z.object({ id: z.number() }),
                  handler: async (ctx, args) => {
                    return ok({ id: args.id, name: ctx.name });
                  },
                }),
                listUsers: builder.query({
                  handler: async (ctx) => {
                    return ok([{ id: 1, name: ctx.name }]);
                  },
                }),
              },
              mutations: {
                createUser: builder.mutation({
                  args: z.object({ name: z.string() }),
                  handler: async (ctx, args) => {
                    return ok({ id: 1, name: args.name });
                  },
                }),
              },
            }),
          }),
        }),
      });

      expect(router.api).toBeDefined();
      expect(router.api.v1).toBeDefined();
      expect(router.api.v1.users).toBeDefined();
      expect(router.api.v1.users.queries.getUser).toBeDefined();
      expect(router.api.v1.users.queries.getUser.type).toBe("query");
      expect(router.api.v1.users.queries.listUsers).toBeDefined();
      expect(router.api.v1.users.mutations.createUser).toBeDefined();
      expect(router.api.v1.users.mutations.createUser.type).toBe("mutation");
    });

    it("mixes internal and public procedures in nested router", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);

      const router = builder.router({
        queries: {
          publicQuery: builder.query({
            handler: async (ctx) => {
              return ok({ data: "public" });
            },
          }),
        },
        internalQueries: {
          internalQuery: builder.internalQuery({
            handler: async (ctx) => {
              return ok({ data: "internal" });
            },
          }),
        },
        mutations: {
          publicMutation: builder.mutation({
            args: z.object({ data: z.string() }),
            handler: async (ctx, args) => {
              return ok({ success: true });
            },
          }),
        },
        internalMutations: {
          internalMutation: builder.internalMutation({
            args: z.object({ data: z.string() }),
            handler: async (ctx, args) => {
              return ok({ success: true });
            },
          }),
        },
      });

      expect(router.queries.publicQuery.type).toBe("query");
      expect(router.internalQueries.internalQuery.type).toBe("internalQuery");
      expect(router.mutations.publicMutation.type).toBe("mutation");
      expect(router.internalMutations.internalMutation.type).toBe("internalMutation");
    });
  });

  describe("procedure metadata", () => {
    it("procedures have _def with metadata", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(query._def).toBeDefined();
      expect(query._def.metadata).toBeDefined();
      expect(typeof query._def.metadata).toBe("object");
    });

    it("procedures have _hooks object", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(query._hooks).toBeDefined();
      expect(typeof query._hooks).toBe("object");
    });

    it("procedures have _middleware array", () => {
      const builder = new QueryBuilder<TestCtx>(testCtx);
      const query = builder.query({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(query._middleware).toBeDefined();
      expect(Array.isArray(query._middleware)).toBe(true);
    });
  });
});
