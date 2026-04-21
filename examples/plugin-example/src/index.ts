/**
 * Hono Server Entry Point
 *
 * This is a standalone Hono server that exposes the @deessejs/server API via HTTP.
 * It demonstrates the plugin system with auth and cache plugins.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { publicAPI } from "./api/index.js";
import type { Error, Result } from "@deessejs/fp";

// Type for the procedure function
type ProcedureFn = (args?: unknown) => Promise<Result<unknown>>;

/**
 * Get a procedure function from the client proxy using a dot-separated path.
 * Follows the same pattern as createHonoHandler in @deessejs/server-hono.
 */
function getProcedure(client: unknown, pathParts: string[]): ProcedureFn | undefined {
  let current: unknown = client;
  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    const value = (current as Record<string, unknown>)[part];
    if (value === undefined) {
      return undefined;
    }
    current = value;
  }
  return typeof current === "function" ? (current as ProcedureFn) : undefined;
}

/**
 * Map deesse error names to HTTP status codes.
 */
function mapErrorToStatus(error: Error | undefined): number {
  if (!error) return 500;
  switch (error.name) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
      return 400;
    default:
      return 500;
  }
}

const app = new Hono();

// Enable CORS for all origins during development
app.use(cors());

/**
 * Convert path to dot-separated procedure name.
 * Handles both /api/users.list and /api/users/list formats.
 */
function normalizePath(rawPath: string): string {
  // If path contains dots already (e.g., posts.list), use it directly
  // Otherwise convert slashes to dots (e.g., users/list -> users.list)
  if (rawPath.includes(".")) {
    return rawPath;
  }
  return rawPath.replace(/\//g, ".");
}

/**
 * Determine if a method is a mutation (requires body parsing).
 */
function isMutationMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

/**
 * Extract args from request based on HTTP method.
 */
async function extractArgs(c: any, method: string): Promise<unknown> {
  if (isMutationMethod(method)) {
    try {
      const body = await c.req.json();
      // Support both { args: {...} } and direct {...} body formats
      return body.args ?? body;
    } catch {
      return {};
    }
  }
  // For GET, look for args in query string
  const argsParam = c.req.query("args");
  return argsParam ? JSON.parse(argsParam) : undefined;
}

// Register route for all procedures
app.all("/api/*", async (c) => {
  // Get the path without the /api/ prefix
  const rawPath = c.req.path.replace(/^\/api\//, "");
  const normalizedPath = normalizePath(rawPath);
  const method = c.req.method;

  // Extract args based on method
  const args = await extractArgs(c, method);

  // Get the procedure function through the proxy
  const pathParts = normalizedPath.split(".");
  const procedure = getProcedure(publicAPI, pathParts);

  if (!procedure) {
    const notFoundResult = {
      ok: false as const,
      error: { name: "ROUTE_NOT_FOUND", message: `Route not found: ${normalizedPath}` },
    };
    return c.json(notFoundResult, 404);
  }

  // Call the procedure
  const result = await procedure(args);

  if (result.ok) {
    return c.json(result);
  }

  // Map error to HTTP status and return
  const status = mapErrorToStatus(result.error as Error | undefined);
  return c.json(result, status as 400 | 401 | 403 | 404 | 409 | 500);
});

const port = 3000;

console.log(`Plugin Example API running at http://localhost:${port}`);
console.log(`  - GET  /api/posts.list             (list all posts)`);
console.log(`  - GET  /api/posts.get?args={"id":1}  (get post by ID)`);
console.log(`  - POST /api/posts.create            (create post, requires auth)`);
console.log(`  - GET  /api/users.list              (list all users)`);
console.log(`  - GET  /api/users.get?args={"id":1} (get user by ID)`);
console.log(`  - POST /api/users.create            (create user, requires auth)`);
console.log();
console.log(`Auth: Include "Authorization: Bearer <userId>" header`);
console.log(`Users: 1=Alice (admin), 2=Bob (user), 3=Carol (user)`);

serve({
  fetch: app.fetch,
  port,
});

export default { port };
