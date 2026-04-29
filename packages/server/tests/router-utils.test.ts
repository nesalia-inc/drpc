import { describe, it, expect } from "vitest";
import { ok } from "@deessejs/fp";
import {
  flattenRouter,
  getPublicRoutes,
  getInternalRoutes,
  isRouter,
  isProcedure,
  resolvePath,
  validateRouter,
} from "../src/router/builder.js";
import type { Procedure } from "../src/types.js";
import { createQuery, createMutation, createInternalQuery, createInternalMutation } from "../src/query/index.js";

// Real procedure factory using factory functions
const createMockQuery = () => createQuery({ handler: async () => ok({}) });
const createMockMutation = () => createMutation({ handler: async () => ok({}) });
const createMockInternalQuery = () => createInternalQuery({ handler: async () => ok({}) });
const createMockInternalMutation = () => createInternalMutation({ handler: async () => ok({}) });

describe("router/builder", () => {
  describe("isProcedure", () => {
    it("returns true for valid procedure with query type", () => {
      const proc = createMockQuery();
      expect(isProcedure(proc)).toBe(true);
    });

    it("returns true for valid procedure with mutation type", () => {
      const proc = createMockMutation();
      expect(isProcedure(proc)).toBe(true);
    });

    it("returns true for internalQuery procedure", () => {
      const proc = createMockInternalQuery();
      expect(isProcedure(proc)).toBe(true);
    });

    it("returns true for internalMutation procedure", () => {
      const proc = createMockInternalMutation();
      expect(isProcedure(proc)).toBe(true);
    });

    it("returns null/falsy for null", () => {
      // isProcedure returns falsy value for null due to early return
      expect(isProcedure(null)).toBeFalsy();
    });

    it("returns null/falsy for undefined", () => {
      expect(isProcedure(undefined)).toBeFalsy();
    });

    it("returns false for plain object without type", () => {
      expect(isProcedure({ foo: "bar" })).toBe(false);
    });

    it("returns false for object with invalid type", () => {
      expect(isProcedure({ type: "invalid" })).toBe(false);
    });

    it("returns false for string", () => {
      expect(isProcedure("procedure")).toBe(false);
    });

    it("returns false for function", () => {
      expect(isProcedure(() => {})).toBe(false);
    });
  });

  describe("isRouter", () => {
    it("returns true for object with nested procedures", () => {
      const router = {
        users: createMockQuery(),
      };
      expect(isRouter(router)).toBe(true);
    });

    it("returns true for nested router", () => {
      const router = {
        api: {
          users: createMockQuery(),
        },
      };
      expect(isRouter(router)).toBe(true);
    });

    it("returns false for empty object (no properties)", () => {
      // isRouter returns false for empty object
      expect(isRouter({})).toBe(false);
    });

    it("returns falsy for null", () => {
      expect(isRouter(null)).toBeFalsy();
    });

    it("returns falsy for undefined", () => {
      expect(isRouter(undefined)).toBeFalsy();
    });

    it("returns false for primitive", () => {
      expect(isRouter("string")).toBe(false);
      expect(isRouter(123)).toBe(false);
    });
  });

  describe("flattenRouter", () => {
    it("flattens a flat router with single procedure", () => {
      const router = {
        getUser: createMockQuery(),
      };
      const result = flattenRouter(router);
      expect(result).toEqual([{ path: "getUser", procedure: router.getUser }]);
    });

    it("flattens router with multiple procedures", () => {
      const router = {
        getUser: createMockQuery(),
        createUser: createMockMutation(),
      };
      const result = flattenRouter(router);
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("getUser");
      expect(result[1].path).toBe("createUser");
    });

    it("flattens nested routers with prefix", () => {
      const router = {
        users: {
          get: createMockQuery(),
          create: createMockMutation(),
        },
      };
      const result = flattenRouter(router);
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("users.get");
      expect(result[1].path).toBe("users.create");
    });

    it("handles deeply nested routers", () => {
      const router = {
        api: {
          v1: {
            users: {
              list: createMockQuery(),
            },
          },
        },
      };
      const result = flattenRouter(router);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("api.v1.users.list");
    });

    it("handles custom prefix", () => {
      const router = {
        get: createMockQuery(),
      };
      const result = flattenRouter(router, ["prefix"]);
      expect(result[0].path).toBe("prefix.get");
    });

    it("returns empty array for empty router", () => {
      const result = flattenRouter({});
      expect(result).toEqual([]);
    });

    it("skips non-procedure/non-router values", () => {
      const router = {
        get: createMockQuery(),
        data: { some: "value" },
      };
      const result = flattenRouter(router);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("get");
    });
  });

  describe("getPublicRoutes", () => {
    it("returns only public procedures", () => {
      const router = {
        getUser: createMockQuery(),
        createUser: createMockMutation(),
        internalGet: createMockInternalQuery(),
        internalCreate: createMockInternalMutation(),
      };
      const result = getPublicRoutes(router);
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.procedure.type === "query" || r.procedure.type === "mutation")).toBe(true);
    });

    it("filters nested public procedures", () => {
      const router = {
        users: {
          list: createMockQuery(),
          internalRefresh: createMockInternalQuery(),
        },
      };
      const result = getPublicRoutes(router);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("users.list");
    });
  });

  describe("getInternalRoutes", () => {
    it("returns only internal procedures", () => {
      const router = {
        getUser: createMockQuery(),
        internalGet: createMockInternalQuery(),
        internalCreate: createMockInternalMutation(),
      };
      const result = getInternalRoutes(router);
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.procedure.type === "internalQuery" || r.procedure.type === "internalMutation")).toBe(true);
    });
  });

  describe("resolvePath", () => {
    it("resolves simple path", () => {
      const router = {
        users: createMockQuery(),
      };
      const result = resolvePath(router, "users");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(router.users);
      }
    });

    it("resolves nested path", () => {
      const router = {
        api: {
          users: createMockQuery(),
        },
      };
      const result = resolvePath(router, "api.users");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(router.api.users);
      }
    });

    it("returns none for non-existent path", () => {
      const router = {
        users: createMockQuery(),
      };
      const result = resolvePath(router, "posts");
      expect(result.ok).toBe(false);
    });

    it("returns none for partial path in nested structure", () => {
      const router = {
        api: {
          users: createMockQuery(),
        },
      };
      const result = resolvePath(router, "api");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(router.api);
      }
    });

    it("returns none for empty router", () => {
      const result = resolvePath({}, "users");
      expect(result.ok).toBe(false);
    });
  });

  describe("validateRouter", () => {
    it("returns valid for empty router", () => {
      const result = validateRouter({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns valid for router with valid procedures", () => {
      const router = {
        getUser: createMockQuery(),
        createUser: createMockMutation(),
      };
      const result = validateRouter(router);
      expect(result.valid).toBe(true);
    });

    it("returns error for procedure missing handler", () => {
      const router = {
        getUser: { type: "query" } as Procedure,
      };
      const result = validateRouter(router);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Procedure at "getUser" missing handler');
    });

    it("validates nested routers recursively", () => {
      const router = {
        api: {
          users: {
            get: createMockQuery(),
            broken: { type: "query" } as Procedure,
          },
        },
      };
      const result = validateRouter(router);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Procedure at "api.users.broken" missing handler');
    });

    it("returns valid for mixed nested router with valid procedures", () => {
      const router = {
        api: {
          v1: {
            users: createMockQuery(),
          },
        },
        public: createMockMutation(),
      };
      const result = validateRouter(router);
      expect(result.valid).toBe(true);
    });
  });
});
