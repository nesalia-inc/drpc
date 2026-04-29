import { describe, it, expect } from "vitest";
import { createMutationWithHooks } from "../src/mutation/builder";
import { createInternalMutationWithHooks } from "../src/internal-mutation/builder";
import { createInternalQueryWithHooks } from "../src/internal-query/builder";
import { z } from "zod";
import { ok, err } from "../src/errors";

describe("Mutation Builder", () => {
  interface TestCtx {
    name: string;
  }

  const testCtx: TestCtx = { name: "test-context" };

  describe("createMutationWithHooks", () => {
    it("creates a mutation procedure with type 'mutation'", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ name: ctx.name });
        },
      });

      expect(mutation.type).toBe("mutation");
    });

    it("creates a mutation with correct type and argsSchema", () => {
      const argsSchema = z.object({ id: z.number() });
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok({ name: ctx.name });
        },
      });

      expect(mutation.type).toBe("mutation");
      expect(mutation.argsSchema).toBe(argsSchema);
    });

    it("handler receives (ctx, args)", async () => {
      let receivedCtx: unknown;
      let receivedArgs: unknown;

      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          receivedCtx = ctx;
          receivedArgs = args;
          return ok({ name: ctx.name });
        },
      });

      await mutation.handler(testCtx, { id: 42 });

      expect(receivedCtx).toBe(testCtx);
      expect(receivedArgs).toEqual({ id: 42 });
    });

    it("has _hooks object", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      expect(mutation._hooks).toBeDefined();
      expect(typeof mutation._hooks).toBe("object");
    });

    it("has _middleware array", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      expect(mutation._middleware).toBeDefined();
      expect(Array.isArray(mutation._middleware)).toBe(true);
    });

    it("beforeInvoke hook method works", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = mutation.beforeInvoke((ctx, args) => {
        // before hook
      });

      expect(hooked._hooks.beforeInvoke).toBeDefined();
    });

    it("afterInvoke hook method works", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = mutation.afterInvoke((ctx, args, result) => {
        // after hook
      });

      expect(hooked._hooks.afterInvoke).toBeDefined();
    });

    it("onSuccess hook method works", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = mutation.onSuccess((ctx, args, data) => {
        // success hook
      });

      expect(hooked._hooks.onSuccess).toBeDefined();
    });

    it("onError hook method works", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = mutation.onError((ctx, args, error) => {
        // error hook
      });

      expect(hooked._hooks.onError).toBeDefined();
    });

    it("use middleware method works", () => {
      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const withMiddleware = mutation.use(middleware);

      expect(withMiddleware._middleware).toHaveLength(1);
      expect(withMiddleware._middleware[0]).toBe(middleware);
    });

    it("multiple hooks can be chained", () => {
      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const mutation = createMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const chained = mutation
        .beforeInvoke((ctx, args) => {})
        .afterInvoke((ctx, args, result) => {})
        .onSuccess((ctx, args, data) => {})
        .onError((ctx, args, error) => {})
        .use(middleware);

      expect(chained._hooks.beforeInvoke).toBeDefined();
      expect(chained._hooks.afterInvoke).toBeDefined();
      expect(chained._hooks.onSuccess).toBeDefined();
      expect(chained._hooks.onError).toBeDefined();
      expect(chained._middleware).toHaveLength(1);
    });
  });
});

describe("InternalMutation Builder", () => {
  interface TestCtx {
    name: string;
  }

  const testCtx: TestCtx = { name: "test-context" };

  describe("createInternalMutationWithHooks", () => {
    it("creates a procedure with type 'internalMutation'", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ name: ctx.name });
        },
      });

      expect(internalMutation.type).toBe("internalMutation");
    });

    it("creates an internalMutation with correct type and argsSchema", () => {
      const argsSchema = z.object({ id: z.number() });
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: argsSchema,
        handler: async (ctx, args) => {
          return ok({ name: ctx.name });
        },
      });

      expect(internalMutation.type).toBe("internalMutation");
      expect(internalMutation.argsSchema).toBe(argsSchema);
    });

    it("handler receives (ctx, args)", async () => {
      let receivedCtx: unknown;
      let receivedArgs: unknown;

      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          receivedCtx = ctx;
          receivedArgs = args;
          return ok({ name: ctx.name });
        },
      });

      await internalMutation.handler(testCtx, { id: 42 });

      expect(receivedCtx).toBe(testCtx);
      expect(receivedArgs).toEqual({ id: 42 });
    });

    it("has _hooks object", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      expect(internalMutation._hooks).toBeDefined();
      expect(typeof internalMutation._hooks).toBe("object");
    });

    it("has _middleware array", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      expect(internalMutation._middleware).toBeDefined();
      expect(Array.isArray(internalMutation._middleware)).toBe(true);
    });

    it("beforeInvoke hook method works", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = internalMutation.beforeInvoke((ctx, args) => {
        // before hook
      });

      expect(hooked._hooks.beforeInvoke).toBeDefined();
    });

    it("afterInvoke hook method works", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = internalMutation.afterInvoke((ctx, args, result) => {
        // after hook
      });

      expect(hooked._hooks.afterInvoke).toBeDefined();
    });

    it("onSuccess hook method works", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = internalMutation.onSuccess((ctx, args, data) => {
        // success hook
      });

      expect(hooked._hooks.onSuccess).toBeDefined();
    });

    it("onError hook method works", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const hooked = internalMutation.onError((ctx, args, error) => {
        // error hook
      });

      expect(hooked._hooks.onError).toBeDefined();
    });

    it("use middleware method works", () => {
      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const withMiddleware = internalMutation.use(middleware);

      expect(withMiddleware._middleware).toHaveLength(1);
      expect(withMiddleware._middleware[0]).toBe(middleware);
    });

    it("multiple hooks can be chained", () => {
      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const internalMutation = createInternalMutationWithHooks<TestCtx, { id: number }, { name: string }>({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => ok({ name: ctx.name }),
      });

      const chained = internalMutation
        .beforeInvoke((ctx, args) => {})
        .afterInvoke((ctx, args, result) => {})
        .onSuccess((ctx, args, data) => {})
        .onError((ctx, args, error) => {})
        .use(middleware);

      expect(chained._hooks.beforeInvoke).toBeDefined();
      expect(chained._hooks.afterInvoke).toBeDefined();
      expect(chained._hooks.onSuccess).toBeDefined();
      expect(chained._hooks.onError).toBeDefined();
      expect(chained._middleware).toHaveLength(1);
    });
  });
});

describe("InternalQuery Builder", () => {
  interface TestCtx {
    name: string;
  }

  const testCtx: TestCtx = { name: "test-context" };

  describe("createInternalQueryWithHooks", () => {
    it("creates a procedure with type 'internalQuery'", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(internalQuery.type).toBe("internalQuery");
    });

    it("creates an internalQuery with correct type and no argsSchema", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => {
          return ok({ name: ctx.name });
        },
      });

      expect(internalQuery.type).toBe("internalQuery");
      expect(internalQuery.argsSchema).toBeUndefined();
    });

    it("handler receives only (ctx) - no args", async () => {
      let receivedCtx: unknown;
      let receivedArgs: unknown = "NOT_CALLED";

      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => {
          receivedCtx = ctx;
          // Note: InternalQuery handler only receives ctx, no args parameter
          return ok({ name: ctx.name });
        },
      });

      // InternalQuery handler signature is (ctx) only, not (ctx, args)
      await internalQuery.handler(testCtx);

      expect(receivedCtx).toBe(testCtx);
      expect(receivedArgs).toBe("NOT_CALLED");
    });

    it("has _hooks object", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      expect(internalQuery._hooks).toBeDefined();
      expect(typeof internalQuery._hooks).toBe("object");
    });

    it("has _middleware array", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      expect(internalQuery._middleware).toBeDefined();
      expect(Array.isArray(internalQuery._middleware)).toBe(true);
    });

    it("beforeInvoke hook method works", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      // InternalQuery hooks have void args since there's no args
      const hooked = internalQuery.beforeInvoke((ctx, args) => {
        // before hook - args is void
      });

      expect(hooked._hooks.beforeInvoke).toBeDefined();
    });

    it("afterInvoke hook method works", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      const hooked = internalQuery.afterInvoke((ctx, args, result) => {
        // after hook
      });

      expect(hooked._hooks.afterInvoke).toBeDefined();
    });

    it("onSuccess hook method works", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      const hooked = internalQuery.onSuccess((ctx, args, data) => {
        // success hook
      });

      expect(hooked._hooks.onSuccess).toBeDefined();
    });

    it("onError hook method works", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      const hooked = internalQuery.onError((ctx, args, error) => {
        // error hook
      });

      expect(hooked._hooks.onError).toBeDefined();
    });

    it("use middleware method works", () => {
      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const withMiddleware = internalQuery.use(middleware);

      expect(withMiddleware._middleware).toHaveLength(1);
      expect(withMiddleware._middleware[0]).toBe(middleware);
    });

    it("multiple hooks can be chained", () => {
      const middleware = {
        name: "test-middleware",
        handler: async (ctx: TestCtx, opts: { next: () => Promise<any>; args: unknown; meta: Record<string, unknown> }) => {
          return opts.next();
        },
      };

      const internalQuery = createInternalQueryWithHooks<TestCtx, { name: string }>({
        handler: async (ctx) => ok({ name: ctx.name }),
      });

      const chained = internalQuery
        .beforeInvoke((ctx, args) => {})
        .afterInvoke((ctx, args, result) => {})
        .onSuccess((ctx, args, data) => {})
        .onError((ctx, args, error) => {})
        .use(middleware);

      expect(chained._hooks.beforeInvoke).toBeDefined();
      expect(chained._hooks.afterInvoke).toBeDefined();
      expect(chained._hooks.onSuccess).toBeDefined();
      expect(chained._hooks.onError).toBeDefined();
      expect(chained._middleware).toHaveLength(1);
    });
  });
});
