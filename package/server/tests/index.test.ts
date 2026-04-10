import { describe, it, expect } from "vitest";
import { defineContext, ok, err } from "../src/index";
import { z } from "zod";

describe("defineContext", () => {
  it("should create t query builder", () => {
    const { t } = defineContext({
      context: { name: "test" },
    });

    expect(t).toBeDefined();
    expect(typeof t.query).toBe("function");
    expect(typeof t.mutation).toBe("function");
    expect(typeof t.router).toBe("function");
  });

  it("should create createAPI function", () => {
    const { t, createAPI } = defineContext({
      context: { name: "test" },
    });

    expect(typeof createAPI).toBe("function");
  });

  it("should support chained hooks", () => {
    const { t } = defineContext({
      context: { name: "test" },
    });

    const myQuery = t
      .query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          return ok({ id: args.id, name: ctx.name });
        },
      })
      .beforeInvoke((ctx, args) => {
        // before hook
      })
      .onSuccess((ctx, args, data) => {
        // success hook
      });

    expect(myQuery.type).toBe("query");
    expect(typeof myQuery.beforeInvoke).toBe("function");
    expect(typeof myQuery.onSuccess).toBe("function");
  });

  it("should create API with router", async () => {
    const { t, createAPI } = defineContext({
      context: { db: { find: () => ({ id: 1, name: "test" }) } },
    });

    const getUser = t.query({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        const user = ctx.db.find();
        return ok(user);
      },
    });

    const api = createAPI({
      router: t.router({
        users: {
          get: getUser,
        },
      }),
    });

    expect(api).toBeDefined();
    expect(api.router).toBeDefined();
    expect(api.execute).toBeDefined();
  });
});

describe("createAPI", () => {
  it("should execute a query using execute method", async () => {
    const { t, createAPI } = defineContext({
      context: { db: { find: () => ({ id: 1, name: "test" }) } },
    });

    const getUser = t.query({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        return ok({ id: args.id, name: "test" });
      },
    });

    const api = createAPI({
      router: t.router({
        users: {
          get: getUser,
        },
      }),
    });

    // Old syntax still works
    const result = await api.execute("users.get", { id: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ id: 1, name: "test" });
    }
  });

  it("should execute a query using direct proxy access", async () => {
    const { t, createAPI } = defineContext({
      context: { db: { find: () => ({ id: 1, name: "test" }) } },
    });

    const getUser = t.query({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        return ok({ id: args.id, name: "test" });
      },
    });

    const api = createAPI({
      router: t.router({
        users: {
          get: getUser,
        },
      }),
    });

    // New direct syntax: api.users.get({})
    const result = await api.users.get({ id: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ id: 1, name: "test" });
    }
  });

  it("should return error for unknown route", async () => {
    const { t, createAPI } = defineContext({
      context: { name: "test" },
    });

    const api = createAPI({
      router: t.router({}),
    });

    const result = await api.execute("unknown.route", {});

    expect(result.ok).toBe(false);
  });

  it("should return error for unknown route via direct access", async () => {
    const { t, createAPI } = defineContext({
      context: { name: "test" },
    });

    const api = createAPI({
      router: t.router({}),
    });

    // Accessing a non-existent route should return undefined function
    const unknownRoute = (api as any).unknown?.route;
    expect(unknownRoute).toBeUndefined();
  });
});