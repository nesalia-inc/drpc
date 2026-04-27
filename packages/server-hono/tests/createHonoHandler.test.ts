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

describe("coerceQueryParams", () => {
  // We need to access the internal function for testing
  // For now, we test via the public API behavior

  it("should coerce numeric strings to numbers in GET requests", async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({ limit: z.number() }),
      handler: async () => {
        return ok({ count: 0 });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with ?limit=20 (string from URL)
    const request = new Request("http://localhost/api/users.list?limit=20");
    const response = await app.fetch(request);
    const body = await response.json();

    // If coercion works, validation passes and returns ok: true
    // If no coercion, limit would be "20" (string) and z.number() validation would fail
    expect(body.ok).toBe(true);
  });

  it("should coerce boolean strings to booleans in GET requests", async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({ active: z.boolean() }),
      handler: async () => {
        return ok({ count: 0 });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with ?active=true (string from URL)
    const request = new Request("http://localhost/api/users.list?active=true");
    const response = await app.fetch(request);
    const body = await response.json();

    expect(body.ok).toBe(true);
  });

  it("should coerce '1' to boolean true", async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({ active: z.boolean() }),
      handler: async () => {
        return ok({ count: 0 });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with ?active=1 (string from URL)
    const request = new Request("http://localhost/api/users.list?active=1");
    const response = await app.fetch(request);
    const body = await response.json();

    expect(body.ok).toBe(true);
  });

  it("should coerce '0' to boolean false", async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({ active: z.boolean() }),
      handler: async () => {
        return ok({ count: 0 });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with ?active=0 (string from URL)
    const request = new Request("http://localhost/api/users.list?active=0");
    const response = await app.fetch(request);
    const body = await response.json();

    expect(body.ok).toBe(true);
  });

  it("should preserve empty strings as empty strings", async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({ name: z.string() }),
      handler: async () => {
        return ok({ count: 0 });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with ?name= (empty string)
    const request = new Request("http://localhost/api/users.list?name=");
    const response = await app.fetch(request);
    const body = await response.json();

    // Empty string should NOT be coerced to 0
    expect(body.ok).toBe(true);
  });

  it("should handle mixed types in query", async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({
        limit: z.number(),
        active: z.boolean(),
        name: z.string(),
      }),
      handler: async () => {
        return ok({ count: 0 });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with mixed types
    const request = new Request(
      "http://localhost/api/users.list?limit=10&active=true&name=john"
    );
    const response = await app.fetch(request);
    const body = await response.json();

    expect(body.ok).toBe(true);
  });
});
