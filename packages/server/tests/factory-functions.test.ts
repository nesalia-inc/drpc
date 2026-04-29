import { describe, it, expect } from "vitest";
import { createQuery, createMutation, createInternalQuery, createInternalMutation, createProcedure } from "../src/query/index.js";
import { QueryBuilder } from "../src/query/builder.js";
import { z } from "zod";
import { ok, err } from "../src/errors/index.js";

describe("Factory Functions", () => {
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

  describe("createQuery", () => {
    it("creates a procedure with type 'query'", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number; name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id, name: ctx.name });
        },
      });

      expect(query.type).toBe("query");
    });

    it("creates a procedure with correct _def", () => {
      const argsSchema = z.object({ id: z.number() });
      const query = createQuery<TestCtx, { id: number }, { id: number; name: string }>({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok({ id: args.id, name: ctx.name });
        },
      });

      expect(query._def.type).toBe("query");
      expect(query._def.argsSchema).toBe(argsSchema);
      expect(query._def.$types.input).toBeDefined();
      // $types.output is intentionally undefined at runtime (type-level placeholder)
      expect(query._def.$types.output).toBeUndefined();
    });

    it("creates a query without args", () => {
      const query = createQuery<TestCtx, undefined, { name: string }>({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(query.type).toBe("query");
      expect(query._def.argsSchema).toBeUndefined();
    });
  });

  describe("createMutation", () => {
    it("creates a procedure with type 'mutation'", () => {
      const mutation = createMutation<TestCtx, { name: string }, { id: number; name: string }>({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok({ id: 1, name: args.name });
        },
      });

      expect(mutation.type).toBe("mutation");
    });

    it("creates a procedure with correct _def", () => {
      const argsSchema = z.object({ name: z.string() });
      const mutation = createMutation<TestCtx, { name: string }, { id: number; name: string }>({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok({ id: 1, name: args.name });
        },
      });

      expect(mutation._def.type).toBe("mutation");
      expect(mutation._def.argsSchema).toBe(argsSchema);
      expect(mutation._def.$types.input).toBeDefined();
      // $types.output is intentionally undefined at runtime (type-level placeholder)
      expect(mutation._def.$types.output).toBeUndefined();
    });
  });

  describe("createInternalQuery", () => {
    it("creates a procedure with type 'internalQuery'", () => {
      const internalQuery = createInternalQuery<TestCtx, { id: number }>({
        handler: async (ctx) => {
          return ok({ id: ctx.db.find().id });
        },
      });

      expect(internalQuery.type).toBe("internalQuery");
    });

    it("creates a procedure with correct _def", () => {
      const internalQuery = createInternalQuery<TestCtx, { id: number }>({
        handler: async (ctx) => {
          return ok({ id: ctx.db.find().id });
        },
      });

      expect(internalQuery._def.type).toBe("internalQuery");
      expect(internalQuery._def.argsSchema).toBeUndefined();
      // For createInternalQuery, argsSchema is undefined so $types.input is also undefined
      expect(internalQuery._def.$types.input).toBeUndefined();
      // $types.output is intentionally undefined at runtime (type-level placeholder)
      expect(internalQuery._def.$types.output).toBeUndefined();
    });
  });

  describe("createInternalMutation", () => {
    it("creates a procedure with type 'internalMutation'", () => {
      const internalMutation = createInternalMutation<TestCtx, { name: string }, { id: number }>({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok(ctx.db.create({ name: args.name }) as { id: number });
        },
      });

      expect(internalMutation.type).toBe("internalMutation");
    });

    it("creates a procedure with correct _def", () => {
      const argsSchema = z.object({ name: z.string() });
      const internalMutation = createInternalMutation<TestCtx, { name: string }, { id: number }>({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok(ctx.db.create({ name: args.name }) as { id: number });
        },
      });

      expect(internalMutation._def.type).toBe("internalMutation");
      expect(internalMutation._def.argsSchema).toBe(argsSchema);
      expect(internalMutation._def.$types.input).toBeDefined();
      // $types.output is intentionally undefined at runtime (type-level placeholder)
      expect(internalMutation._def.$types.output).toBeUndefined();
    });
  });

  describe("createProcedure", () => {
    it("creates a query procedure", () => {
      const procedure = createProcedure<TestCtx, { id: number }, { id: number; name: string }>(
        "query",
        {
          args: z.object({ id: z.number() }),
          handler: async (ctx, args) => {
            return ok({ id: args.id, name: ctx.name });
          },
        }
      );

      expect(procedure.type).toBe("query");
      expect(procedure._def.type).toBe("query");
    });

    it("creates a mutation procedure", () => {
      const procedure = createProcedure<TestCtx, { name: string }, { id: number }>(
        "mutation",
        {
          args: z.object({ name: z.string() }),
          handler: async (ctx, args) => {
            return ok(ctx.db.create({ name: args.name }) as { id: number });
          },
        }
      );

      expect(procedure.type).toBe("mutation");
      expect(procedure._def.type).toBe("mutation");
    });

    it("creates an internalQuery procedure", () => {
      const procedure = createProcedure<TestCtx, undefined, { id: number }>(
        "internalQuery",
        {
          handler: async (ctx) => {
            return ok({ id: ctx.db.find().id });
          },
        }
      );

      expect(procedure.type).toBe("internalQuery");
      expect(procedure._def.type).toBe("internalQuery");
    });

    it("creates an internalMutation procedure", () => {
      const procedure = createProcedure<TestCtx, { data: string }, { success: boolean }>(
        "internalMutation",
        {
          args: z.object({ data: z.string() }),
          handler: async (ctx, args) => {
            return ok({ success: true });
          },
        }
      );

      expect(procedure.type).toBe("internalMutation");
      expect(procedure._def.type).toBe("internalMutation");
    });

    it("creates a procedure with metadata", () => {
      const procedure = createProcedure<TestCtx, { id: number }, { id: number }>(
        "query",
        {
          args: z.object({ id: z.number() }),
          handler: async (ctx, args) => {
            return ok({ id: args.id });
          },
          metadata: { version: "1.0.0" },
        }
      );

      expect(procedure._def.metadata).toEqual({ version: "1.0.0" });
    });
  });

  describe("Procedure methods", () => {
    it("procedure has beforeInvoke method", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(typeof query.beforeInvoke).toBe("function");
    });

    it("procedure has afterInvoke method", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(typeof query.afterInvoke).toBe("function");
    });

    it("procedure has onSuccess method", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(typeof query.onSuccess).toBe("function");
    });

    it("procedure has onError method", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(typeof query.onError).toBe("function");
    });

    it("procedure has use method", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(typeof query.use).toBe("function");
    });

    it("procedure has _hooks object", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(query._hooks).toBeDefined();
      expect(typeof query._hooks).toBe("object");
    });

    it("procedure has _middleware array", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      expect(query._middleware).toBeDefined();
      expect(Array.isArray(query._middleware)).toBe(true);
    });
  });

  describe("Procedure chaining", () => {
    it("beforeInvoke returns the same procedure type", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      const chained = query.beforeInvoke((ctx, args) => {
        // before hook
      });

      // Should return same type (AnyProcedure)
      expect(chained).toBeDefined();
      expect(chained.type).toBe("query");
    });

    it("onSuccess returns the same procedure type", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      const chained = query.onSuccess((ctx, args, data) => {
        // success hook
      });

      expect(chained.type).toBe("query");
    });

    it("use returns the same procedure type", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const chained = query.use(middleware);

      expect(chained.type).toBe("query");
    });

    it("multiple hooks can be chained", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id });
        },
      });

      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const chained = query
        .beforeInvoke((ctx, args) => {})
        .afterInvoke((ctx, args, result) => {})
        .onSuccess((ctx, args, data) => {})
        .onError((ctx, args, error) => {})
        .use(middleware);

      expect(chained.type).toBe("query");
      // Note: Factory function's `use` returns `this` without adding to _middleware
      // The _middleware array remains empty for factory-created procedures
      expect(chained._middleware).toHaveLength(0);
    });
  });

  describe("Procedures with QueryBuilder (integration)", () => {
    it("procedures created by factory functions are compatible with QueryBuilder router", () => {
      const query = createQuery<TestCtx, { id: number }, { id: number; name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id, name: ctx.name });
        },
      });

      const mutation = createMutation<TestCtx, { name: string }, { id: number }>({
        args: z.object({ name: z.string() }),
        handler: async (ctx, args) => {
          return ok(ctx.db.create({ name: args.name }) as { id: number });
        },
      });

      // Use QueryBuilder to create a router with the procedures
      const builder = new QueryBuilder<TestCtx>(testCtx);

      const router = builder.router({
        queries: {
          getUser: query,
        },
        mutations: {
          createUser: mutation,
        },
      });

      expect(router.queries.getUser).toBeDefined();
      expect(router.mutations.createUser).toBeDefined();
    });
  });
});
