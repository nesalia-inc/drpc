/**
 * Example 06: Internal Procedures
 *
 * Demonstrates:
 * - internalQuery: queries not exposed to public API (no args)
 * - internalMutation: mutations not exposed to public API
 * - createPublicAPI: filters out internal procedures
 * - Why internal procedures exist: server-to-server communication
 */

import { createAPI, createPublicAPI } from "../src/index.js";
import { createQueryBuilder } from "../src/query/index.js";
import { ok } from "@deessejs/fp";
import { z } from "zod";

interface Context {
  db: { health: string };
}

const t = createQueryBuilder<Context>();

// ============================================
// 1. Public procedures
// ============================================

const listUsers = t.query({
  handler: async () => {
    return ok([{ id: "1", name: "Alice" }]);
  },
});

// ============================================
// 2. Internal procedures (not exposed publicly)
// ============================================

// internalQuery: no args, not callable from public API
// Use case: health checks, server-only data
const healthCheck = t.internalQuery({
  handler: async (ctx) => {
    return ok({ status: ctx.db.health, timestamp: Date.now() });
  },
});

// internalMutation: server-to-server communication
// Not exposed via createPublicAPI
const syncData = t.internalMutation({
  args: z.object({ source: z.string(), data: z.unknown() }),
  handler: async (ctx, args) => {
    console.log(`Syncing from ${args.source}:`, args.data);
    return ok({ synced: true, items: 1 });
  },
});

// Internal query to check permissions
const checkPermission = t.internalQuery({
  handler: async () => {
    return ok({ allowed: true, role: "admin" });
  },
});

// ============================================
// 3. Full router (with internal procedures)
// ============================================

// Internal procedures are nested under _ prefix
const router = t.router({
  users: {
    list: listUsers,
    // Internal procedures - filtered from public API
    _health: healthCheck,
    _sync: syncData,
    _checkPerm: checkPermission,
  },
});

// ============================================
// 4. Create full API and public API
// ============================================

const fullApi = createAPI({
  router,
  context: { db: { health: "ok" } },
});

// Public API filters out internalQuery and internalMutation
// Only exposes: query and mutation
const publicApi = createPublicAPI(fullApi);

// ============================================
// 5. Test
// ============================================

async function main() {
  console.log("=== Full API (all procedures) ===");
  const users = await fullApi.users.list();
  console.log("users.list:", users.ok);

  // Internal procedures are accessible
  const health = await fullApi.users._health();
  console.log("users._health:", health.ok);

  const sync = await fullApi.users._sync({ source: "external", data: {} });
  console.log("users._sync:", sync.ok);

  console.log("\n=== Public API (internal filtered) ===");
  // Access the public router directly to see filtered results
  console.log("publicApi.router:", publicApi.router);

  // The proxy access works correctly
  const pubUsers = await publicApi.users.list();
  console.log("publicApi.users.list():", pubUsers.ok);

  // _health and _sync should NOT exist on publicApi
  // They would be typed as errors if uncommented:
  // await publicApi.users._health();
  // await publicApi.users._sync();
}

main();
