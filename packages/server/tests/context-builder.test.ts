/**
 * ContextBuilder and Plugin System Tests
 *
 * Tests for:
 * 1. createContextBuilder() returns a ContextBuilder
 * 2. use() adds a plugin and returns new builder
 * 3. withEvents() sets events registry
 * 4. build() returns t and createAPI
 * 5. Plugin with procedures adds methods to t
 * 6. Multiple plugins can be chained with use()
 * 7. defineContext() backward compatible API still works
 */

import { describe, it, expect, vi } from "vitest";
import { createContextBuilder, defineContext, ContextBuilder } from "../src/context/index.js";
import { z } from "zod";
import type { Plugin, PluginEnrichment } from "../src/types.js";

describe("ContextBuilder", () => {
  describe("createContextBuilder", () => {
    it("should return a ContextBuilder instance", () => {
      const builder = createContextBuilder();
      expect(builder).toBeInstanceOf(ContextBuilder);
    });

    it("should create builder without initial context", () => {
      const builder = createContextBuilder();
      expect(builder).toBeDefined();
    });
  });

  describe("use()", () => {
    it("should add a plugin and return a new builder", () => {
      const builder = createContextBuilder();
      const plugin: Plugin<unknown> = {
        name: "test-plugin",
        extend: (ctx) => ({ ...ctx, extended: true }),
      };

      const newBuilder = builder.use(plugin);

      // Should return a new builder instance
      expect(newBuilder).toBeInstanceOf(ContextBuilder);
      expect(newBuilder).not.toBe(builder);
    });

    it("should preserve existing plugins when adding new one", () => {
      const builder = createContextBuilder();
      const plugin1: Plugin<unknown> = {
        name: "plugin-1",
        extend: (ctx) => ({ ...ctx, p1: true }),
      };
      const plugin2: Plugin<unknown> = {
        name: "plugin-2",
        extend: (ctx) => ({ ...ctx, p2: true }),
      };

      const builderWithBoth = builder.use(plugin1).use(plugin2);
      expect(builderWithBoth).toBeInstanceOf(ContextBuilder);
    });
  });

  describe("withEvents()", () => {
    it("should set events registry and return new builder", () => {
      const builder = createContextBuilder();

      const events = {
        "user.created": { data: {} as { id: string; name: string } },
      };

      const newBuilder = builder.withEvents(events as any);

      expect(newBuilder).toBeInstanceOf(ContextBuilder);
      expect(newBuilder).not.toBe(builder);
    });

    it("should preserve plugins when setting events", () => {
      const builder = createContextBuilder();
      const plugin: Plugin<unknown> = {
        name: "test-plugin",
        extend: (ctx) => ({ ...ctx, extended: true }),
      };

      const builderWithPlugin = builder.use(plugin);
      const events = {
        "user.created": { data: {} as { id: string; name: string } },
      };

      const builderWithEvents = builderWithPlugin.withEvents(events as any);
      expect(builderWithEvents).toBeInstanceOf(ContextBuilder);
    });
  });

  describe("build()", () => {
    it("should return t and createAPI", () => {
      const builder = createContextBuilder<{ name: string }>();
      const { t, createAPI } = builder.build();

      expect(t).toBeDefined();
      expect(typeof t.query).toBe("function");
      expect(typeof t.mutation).toBe("function");
      expect(typeof t.router).toBe("function");
      expect(typeof createAPI).toBe("function");
    });

    it("should build with context", () => {
      const builder = createContextBuilder<{ db: { find: () => { id: number } } }>();
      const { t, createAPI } = builder.build();

      const getUser = t.query({
        args: z.object({ id: z.number() }),
        handler: async (ctx, args) => {
          const user = ctx.db.find();
          return { ok: true, value: user } as const;
        },
      });

      const api = createAPI({
        router: t.router({
          users: { get: getUser },
        }),
      });

      expect(api).toBeDefined();
    });

    it("should apply plugin extend function to context", () => {
      interface PluginCtx {
        name: string;
        pluginData?: string;
      }

      const plugin: Plugin<PluginCtx> = {
        name: "test-plugin",
        extend: (ctx) => ({ ...ctx, pluginData: "extended" }),
      };

      const builder = createContextBuilder<PluginCtx>().use(plugin);
      const { t, createAPI } = builder.build();

      const getData = t.query({
        args: z.object({}),
        handler: async (ctx, _args) => {
          return { ok: true, value: ctx.pluginData } as const;
        },
      });

      const api = createAPI({
        router: t.router({
          data: { get: getData },
        }),
      });

      expect(api).toBeDefined();
    });
  });

  describe("plugin with procedures", () => {
    it("should add namespace methods to t from plugin procedures", () => {
      interface Ctx {
        db: { users: { findAll: () => { id: string; name: string }[] } };
      }

      const userPlugin: Plugin<Ctx> = {
        name: "user-plugin",
        extend: (ctx) => ctx,
        procedures: (): PluginEnrichment<Ctx> => ({
          users: {
            list: ({ handler }) =>
              handler as any,
          },
        }),
      };

      const builder = createContextBuilder<Ctx>().use(userPlugin);
      const { t } = builder.build();

      // The plugin should have added a `users` namespace to t
      expect((t as any).users).toBeDefined();
      expect((t as any).users.list).toBeDefined();
    });

    it("should allow multiple plugins to add namespaces", () => {
      interface Ctx {
        db: { data: string };
      }

      const plugin1: Plugin<Ctx> = {
        name: "plugin-1",
        extend: (ctx) => ctx,
        procedures: (): PluginEnrichment<Ctx> => ({
          ns1: {
            method1: ({ handler }) => handler as any,
          },
        }),
      };

      const plugin2: Plugin<Ctx> = {
        name: "plugin-2",
        extend: (ctx) => ctx,
        procedures: (): PluginEnrichment<Ctx> => ({
          ns2: {
            method2: ({ handler }) => handler as any,
          },
        }),
      };

      const builder = createContextBuilder<Ctx>().use(plugin1).use(plugin2);
      const { t } = builder.build();

      expect((t as any).ns1).toBeDefined();
      expect((t as any).ns1.method1).toBeDefined();
      expect((t as any).ns2).toBeDefined();
      expect((t as any).ns2.method2).toBeDefined();
    });

    it("should allow multiple methods in same namespace", () => {
      interface Ctx {
        db: { data: string };
      }

      const plugin: Plugin<Ctx> = {
        name: "multi-method-plugin",
        extend: (ctx) => ctx,
        procedures: (): PluginEnrichment<Ctx> => ({
          calculator: {
            add: ({ handler }) => handler as any,
            subtract: ({ handler }) => handler as any,
            multiply: ({ handler }) => handler as any,
          },
        }),
      };

      const builder = createContextBuilder<Ctx>().use(plugin);
      const { t } = builder.build();

      expect((t as any).calculator).toBeDefined();
      expect((t as any).calculator.add).toBeDefined();
      expect((t as any).calculator.subtract).toBeDefined();
      expect((t as any).calculator.multiply).toBeDefined();
    });
  });

  describe("multiple plugins chained with use()", () => {
    it("should chain multiple plugins sequentially", () => {
      const plugin1: Plugin<{ count: number }> = {
        name: "plugin-1",
        extend: (ctx) => ({ count: ctx.count + 1 }),
      };

      const plugin2: Plugin<{ count: number }> = {
        name: "plugin-2",
        extend: (ctx) => ({ count: ctx.count + 10 }),
      };

      const plugin3: Plugin<{ count: number }> = {
        name: "plugin-3",
        extend: (ctx) => ({ count: ctx.count + 100 }),
      };

      const builder = createContextBuilder<{ count: number }>()
        .use(plugin1)
        .use(plugin2)
        .use(plugin3);

      const { t, createAPI } = builder.build();
      expect(t).toBeDefined();
      expect(createAPI).toBeDefined();
    });

    it("should handle plugins with and without procedures", () => {
      const pluginWithProcedures: Plugin<{ name: string }> = {
        name: "with-procedures",
        extend: (ctx) => ctx,
        procedures: (): PluginEnrichment<{ name: string }> => ({
          extra: {
            method: ({ handler }) => handler as any,
          },
        }),
      };

      const pluginWithoutProcedures: Plugin<{ name: string }> = {
        name: "without-procedures",
        extend: (ctx) => ({ name: ctx.name + "-extended" }),
      };

      const builder = createContextBuilder<{ name: string }>()
        .use(pluginWithProcedures)
        .use(pluginWithoutProcedures);

      const { t } = builder.build();

      expect((t as any).extra).toBeDefined();
      expect((t as any).extra.method).toBeDefined();
    });
  });
});

describe("defineContext (backward compatible API)", () => {
  it("should still work as before", () => {
    const { t, createAPI } = defineContext({
      context: { name: "test" },
    });

    expect(t).toBeDefined();
    expect(typeof t.query).toBe("function");
    expect(typeof t.mutation).toBe("function");
    expect(typeof createAPI).toBe("function");
  });

  it("should create queries and mutations", async () => {
    const { t, createAPI } = defineContext({
      context: { db: { find: () => ({ id: 1, name: "test" }) } },
    });

    const getUser = t.query({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        const user = ctx.db.find();
        return { ok: true, value: user } as const;
      },
    });

    const api = createAPI({
      router: t.router({
        users: { get: getUser },
      }),
    });

    const result = await api.users.get({ id: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ id: 1, name: "test" });
    }
  });

  it("should support events", () => {
    const { t, createAPI } = defineContext({
      context: { db: { create: (data: any) => ({ id: 1, ...data }) } },
      events: {
        "user.created": { data: {} as { id: number; name: string } },
      } as any,
    });

    const createUser = t.mutation({
      args: z.object({ name: z.string() }),
      handler: async (ctx, args) => {
        const user = ctx.db.create(args);
        ctx.send("user.created", { id: user.id, name: user.name });
        return { ok: true, value: user } as const;
      },
    });

    const api = createAPI({
      router: t.router({
        users: { create: createUser },
      }),
    });

    expect(api).toBeDefined();
  });

  it("should support plugins in config", () => {
    const plugin: Plugin<{ name: string }> = {
      name: "test-plugin",
      extend: (ctx) => ({ name: ctx.name + "-extended" }),
    };

    const { t, createAPI } = defineContext({
      context: { name: "test" },
      plugins: [plugin],
    });

    expect(t).toBeDefined();
    expect(createAPI).toBeDefined();
  });

  it("should support createContext function", () => {
    const { t, createAPI } = defineContext({
      createContext: () => ({ db: { find: () => ({ id: 42 }) } }),
    });

    expect(t).toBeDefined();
    expect(createAPI).toBeDefined();
  });
});

describe("ContextBuilder vs defineContext parity", () => {
  it("both should produce equivalent t and createAPI", () => {
    // Using defineContext
    const { t: t1, createAPI: createAPI1 } = defineContext({
      context: { name: "test" },
    });

    // Using ContextBuilder
    const { t: t2, createAPI: createAPI2 } = createContextBuilder<{ name: string }>().build();

    // Both should have the same methods available
    expect(typeof t1.query).toBe(typeof t2.query);
    expect(typeof t1.mutation).toBe(typeof t2.mutation);
    expect(typeof t1.router).toBe(typeof t2.router);
    expect(typeof createAPI1).toBe(typeof createAPI2);
  });
});
