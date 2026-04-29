/**
 * Example 07: ContextBuilder and Plugins
 *
 * Demonstrates:
 * - createContextBuilder: fluent builder for context
 * - .use(plugin): adding plugins
 * - Plugin.extend: enriching the context
 */

import { createContextBuilder } from "../src/context/index.js";
import { createAPI } from "../src/index.js";
import { ok } from "@deessejs/fp";
import { z } from "zod";
import type { Plugin } from "../src/types.js";

// ============================================
// 1. Create a custom plugin
// ============================================

interface PluginContext {
  auditLog: string[];
}

// Plugin that adds audit log to context
const auditPlugin = <Ctx extends PluginContext>(): Plugin<Ctx> => ({
  name: "audit",
  extend: (ctx: Ctx) => ({
    auditLog: ctx.auditLog ?? [],
  }),
});

// Plugin that adds timing info
const timingPlugin = <Ctx>(): Plugin<Ctx> => ({
  name: "timing",
  extend: (ctx: Ctx) => ({
    startTime: Date.now(),
  }),
});

// ============================================
// 2. Using ContextBuilder
// ============================================

const { t, createAPI: createApiWithPlugins } = createContextBuilder<PluginContext>()
  .use(auditPlugin())
  .use(timingPlugin())
  .build();

// t now has query(), mutation(), router(), etc.

// ============================================
// 3. Define router
// ============================================

const router = t.router({
  users: {
    list: t.query({
      handler: async () => ok([{ id: "1", name: "User" }]),
    }),
    create: t.mutation({
      args: z.object({ name: z.string() }),
      handler: async (ctx, args) => {
        ctx.auditLog.push(`Creating user: ${args.name}`);
        return ok({ id: "1", name: args.name });
      },
    }),
  },
});

// ============================================
// 4. Create API
// ============================================

// Context can be passed but is enriched by plugins
const api = createApiWithPlugins({
  router,
  context: { auditLog: [] }, // Initial context, enriched by plugins
});

// ============================================
// 5. Test
// ============================================

async function main() {
  console.log("=== Using ContextBuilder with plugins ===");

  const users = await api.users.list();
  console.log("List:", users.ok);

  const created = await api.users.create({ name: "Alice" });
  console.log("Created:", created.ok);

  console.log("\n=== Context with audit log ===");
  console.log("api.ctx:", api.ctx);
  console.log("auditLog:", api.ctx.auditLog);
}

main();
