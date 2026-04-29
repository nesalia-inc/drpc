/**
 * Example 07: ContextBuilder and Plugins
 *
 * Demonstrates:
 * - createContextBuilder: fluent builder for context
 * - .use(plugin): adding plugins
 * - Plugin.extend: enriching the context
 *
 * NOTE: This is a simplified demonstration. The ContextBuilder.build()
 * currently has a bug where the context passed to createAPI is ignored.
 * The plugin.extend() enriches the QueryBuilder's context, but that enriched
 * context isn't properly passed to createAPI yet.
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
      handler: async (_, args) => ok({ id: "1", name: args.name }),
    }),
  },
});

// ============================================
// 4. Create API
// ============================================

// Note: Context must be passed here, but plugin enrichment isn't working yet
// due to a bug in ContextBuilder.build()
const api = createApiWithPlugins({
  router,
  context: { auditLog: [] }, // This is passed but not enriched by plugins
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

  console.log("\n=== Context passed to createAPI ===");
  console.log("api.ctx:", api.ctx);
  console.log("(Note: plugin.extend() enriches QueryBuilder context, not createAPI context yet)");
}

main();
