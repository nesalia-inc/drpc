/**
 * Example 03: Hooks
 *
 * Demonstrates:
 * - beforeInvoke: runs before handler
 * - afterInvoke: runs after handler (always)
 * - onSuccess: runs only when result is ok
 * - onError: runs only when result is err
 */

import { createAPI } from "../src/index.js";
import { createQueryBuilder } from "../src/query/index.js";
import { ok, err } from "@deessejs/fp";
import { z } from "zod";

interface Context {
  requestId: string;
  logger: string[];
}

const t = createQueryBuilder<Context>();

// ============================================
// 1. Define query with all hooks
// ============================================

const getUser = t.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx, args) => {
    ctx.logger.push(`handler called for ${args.id}`);
    return ok({ id: args.id, name: "User" });
  },
});

// Chain hooks (they return the procedure for chaining)
getUser
  .beforeInvoke((ctx, args) => {
    ctx.logger.push(`beforeInvoke: fetching user ${args.id}`);
    console.log(`[${ctx.requestId}] Before: ${args.id}`);
  })
  .afterInvoke((ctx, args, result) => {
    ctx.logger.push(`afterInvoke: result is ${result.ok ? "ok" : "error"}`);
    console.log(`[${ctx.requestId}] After:`, result.ok ? "success" : "failure");
  })
  .onSuccess((ctx, args, data) => {
    ctx.logger.push(`onSuccess: user ${args.id} = ${data.name}`);
    console.log(`[${ctx.requestId}] Success:`, data);
  })
  .onError((ctx, args, error) => {
    ctx.logger.push(`onError: ${error.message}`);
    console.log(`[${ctx.requestId}] Error:`, error.message);
  });

// ============================================
// 2. Mutation with error case
// ============================================

const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    if (args.name === "error") {
      return err({ message: "Cannot create user with name 'error'" });
    }
    return ok({ id: "1", name: args.name });
  },
});

createUser
  .beforeInvoke((ctx, args) => {
    console.log(`Creating user: ${args.name}`);
  })
  .onSuccess((ctx, args, data) => {
    console.log(`User created: ${data.id} - ${data.name}`);
  })
  .onError((ctx, args, error) => {
    console.log(`Creation failed: ${error.message}`);
  });

// ============================================
// 3. Create API
// ============================================

const router = t.router({ users: { get: getUser, create: createUser } });

const api = createAPI({
  router,
  context: { requestId: "req-123", logger: [] },
});

// ============================================
// 4. Test
// ============================================

async function main() {
  console.log("=== Successful getUser ===");
  const result = await api.users.get({ id: "1" });
  console.log("Final result ok:", result.ok);
  console.log("Logger:", api.ctx.logger);

  console.log("\n=== Failed createUser ===");
  const failResult = await api.users.create({ name: "error" });
  console.log("Final result ok:", failResult.ok);
}

main();
