/**
 * Example 05: Events System
 *
 * Demonstrates:
 * - Defining events with defineEvents
 * - Subscribing to events with on()
 * - Emitting events via ctx.send()
 * - Event queue (batched until success)
 * - Wildcard subscriptions
 */

import { createAPI, EventEmitter, defineEvents, event } from "../src/index.js";
import { createQueryBuilder } from "../src/query/index.js";
import { ok } from "@deessejs/fp";
import { z } from "zod";

// ============================================
// 1. Define events
// ============================================

const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
    updated: event({ args: z.object({ id: z.string(), name: z.string() }) }),
  },
  post: {
    published: event({ args: z.object({ id: z.string(), title: z.string() }) }),
  },
});

interface Context {
  userId: string;
}

const t = createQueryBuilder<Context, typeof events>();

// ============================================
// 2. Create procedures that emit events
// ============================================

const createUser = t.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = { id: "new-user", email: args.email };
    // Emit event (batched until procedure succeeds)
    ctx.send("user.created", { id: user.id, email: user.email });
    return ok(user);
  },
});

const updateUser = t.mutation({
  args: z.object({ id: z.string(), name: z.string() }),
  handler: async (ctx, args) => {
    // Emit multiple events
    ctx.send("user.updated", { id: args.id, name: args.name });
    ctx.send("post.published", { id: "post-1", title: "Announcement" });
    return ok({ id: args.id, name: args.name });
  },
});

// ============================================
// 3. Create API with event emitter
// ============================================

const eventEmitter = new EventEmitter(events);

const api = createAPI({
  router: t.router({ users: { create: createUser, update: updateUser } }),
  eventEmitter,
  context: { userId: "user-1" },
});

// ============================================
// 4. Subscribe to events via eventEmitter
// ============================================

// Access eventEmitter from API
const emitter = api.eventEmitter;
if (emitter) {
  // Specific event subscription
  emitter.on("user.created", (payload) => {
    console.log("[EVENT] User created:", payload.data);
  });

  // Wildcard subscription
  emitter.on("user.*", (payload) => {
    console.log("[EVENT] Any user event:", payload.name, payload.data);
  });

  // Global wildcard
  emitter.on("*", (payload) => {
    console.log("[EVENT] Global:", payload.name, payload.data);
  });
}

// ============================================
// 5. Test
// ============================================

async function main() {
  console.log("=== Creating user ===");
  const result = await api.users.create({ email: "test@example.com" });
  console.log("Result:", result.ok);

  console.log("\n=== Updating user ===");
  const updateResult = await api.users.update({ id: "1", name: "Updated" });
  console.log("Result:", updateResult.ok);

  console.log("\n=== Event log ===");
  console.log(api.getEvents());
}

main();
