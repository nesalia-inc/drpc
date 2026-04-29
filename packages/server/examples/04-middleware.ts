/**
 * Example 04: Middleware
 *
 * Demonstrates:
 * - Creating middleware with createMiddleware
 * - Attaching middleware per-procedure (.use())
 * - Global middleware at API creation
 */

import { createAPI } from "../src/index.js";
import { createQueryBuilder } from "../src/query/index.js";
import { createMiddleware } from "../src/middleware/builder.js";
import { ok, err } from "@deessejs/fp";
import { z } from "zod";

interface Context {
  user: { id: string; role: string } | null;
  logs: string[];
}

// ============================================
// 1. Create middlewares
// ============================================

// Authentication middleware
const authMiddleware = createMiddleware({
  name: "auth",
  handler: async (ctx, opts) => {
    if (!ctx.user) {
      return err({ message: "Unauthorized - no user" });
    }
    return opts.next();
  },
});

// Admin-only middleware
const adminMiddleware = createMiddleware({
  name: "admin",
  handler: async (ctx, opts) => {
    if (ctx.user?.role !== "admin") {
      return err({ message: "Forbidden - requires admin role" });
    }
    return opts.next();
  },
});

// Logging middleware
const loggingMiddleware = createMiddleware({
  name: "logging",
  handler: async (ctx, opts) => {
    console.log(`[LOG] Starting: ${opts.meta?.procedure}`);
    const result = await opts.next();
    console.log(`[LOG] Completed: ${opts.meta?.procedure}`);
    return result;
  },
});

// ============================================
// 2. Build procedures with middleware
// ============================================

const t = createQueryBuilder<Context>();

// Public endpoint - no auth required
const publicEndpoint = t.query({
  handler: async (ctx) => {
    ctx.logs.push("public endpoint called");
    return ok({ message: "Public data" });
  },
});

// Protected endpoint - auth required
const protectedEndpoint = t.query({
  handler: async (ctx) => {
    ctx.logs.push(`protected called by ${ctx.user?.id}`);
    return ok({ secret: "Sensitive data" });
  },
}).use(authMiddleware);

// Admin-only endpoint
const adminEndpoint = t.query({
  handler: async (ctx) => {
    ctx.logs.push("admin endpoint called");
    return ok({ admin: true });
  },
}).use(authMiddleware).use(adminMiddleware);

// Endpoint with logging middleware
const loggedEndpoint = t.query({
  handler: async (ctx) => {
    return ok({ logged: true });
  },
}).use(loggingMiddleware);

// ============================================
// 3. Create API with global middleware
// ============================================

const router = t.router({
  public: publicEndpoint,
  protected: protectedEndpoint,
  admin: adminEndpoint,
  logged: loggedEndpoint,
});

// Global middleware runs BEFORE procedure middleware
const api = createAPI({
  router,
  context: { user: { id: "1", role: "user" }, logs: [] },
  middleware: [
    createMiddleware({
      name: "global-logger",
      handler: async (ctx, opts) => {
        console.log(`[GLOBAL] Starting`);
        return opts.next();
      },
    }),
  ],
});

// ============================================
// 4. Test execution order
// ============================================

async function main() {
  console.log("=== Public endpoint (no auth) ===");
  const publicResult = await api.public();
  console.log("Result ok:", publicResult.ok);

  console.log("\n=== Protected endpoint (auth middleware) ===");
  const protectedResult = await api.protected();
  console.log("Result ok:", protectedResult.ok);

  console.log("\n=== Admin endpoint (auth + admin middleware) ===");
  const adminResult = await api.admin();
  console.log("Result ok:", adminResult.ok);
  if (!adminResult.ok) {
    console.log("Error:", adminResult.error);
  }
}

main();
