import { describe, it, expect } from "vitest";
import { defineContext, createPublicAPI, ok, err } from "@deessejs/server";
import { createHonoHandler } from "../src/index";
import { z } from "zod";

describe("createHonoHandler", () => {
  it("should create a Hono app instance", () => {
    const { t, createAPI } = defineContext({
      context: { name: "test" },
    });

    const getUser = t.query({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        return ok({ id: args.id, name: ctx.name });
      },
    });

    const api = createAPI({
      router: t.router({
        users: {
          get: getUser,
        },
      }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should register routes for all procedures", () => {
    const { t, createAPI } = defineContext({
      context: { name: "test" },
    });

    const getUser = t.query({
      args: z.object({ id: z.number() }),
      handler: async (ctx, args) => {
        return ok({ id: args.id, name: ctx.name });
      },
    });

    const createUser = t.mutation({
      args: z.object({ name: z.string() }),
      handler: async (ctx, args) => {
        return ok({ id: 1, name: args.name });
      },
    });

    const api = createAPI({
      router: t.router({
        users: {
          get: getUser,
          create: createUser,
        },
      }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    expect(app).toBeDefined();
  });
});
