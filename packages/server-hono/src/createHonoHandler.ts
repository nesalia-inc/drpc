import { Hono } from "hono";
import type { HTTPClient } from "./types.js";
import { getHTTPStatus } from "./errors.js";
import type { Error, Result } from "@deessejs/fp";

interface RequestInfo {
  headers?: Record<string, string>;
  method?: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * Converts a path like "users/get" to "users.get" for procedure lookup
 */
function normalizePath(path: string): string {
  return path.replace(/\//g, ".");
}

/**
 * Checks if a method is a mutation method
 */
function isMutationMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

/**
 * Coerces URL query string values to primitive types.
 * Mirrors tRPC OpenAPI behavior:
 * - "true"/"1" → true (boolean)
 * - "false"/"0" → false (boolean)
 * - Numeric strings → number
 * - Empty strings remain empty strings (not coerced to 0)
 * - Everything else → string
 */
function coerceQueryParams(query: Record<string, string[]>): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  for (const [key, values] of Object.entries(query)) {
    const value = values[0]; // Take first value from array (Hono returns string[])
    if (value === 'true' || value === '1') {
      coerced[key] = true;
    } else if (value === 'false' || value === '0') {
      coerced[key] = false;
    } else if (value !== '' && !isNaN(Number(value))) {
      // Guard against empty string to prevent "" → 0 coercion bug
      coerced[key] = Number(value);
    } else {
      coerced[key] = value;
    }
  }
  return coerced;
}

/**
 * Gets a procedure function from the client proxy using a dot-separated path
 */
function getProcedure(client: unknown, pathParts: string[]): ((args: unknown) => Promise<Result<unknown>>) | undefined {
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
  return typeof current === "function" ? (current as (args: unknown) => Promise<Result<unknown>>) : undefined;
}

/**
 * Creates a Hono handler from a deesse API client
 */
export function createHonoHandler(client: HTTPClient): Hono {
  const app = new Hono();

  // Register route for all procedures
  // The route captures the path after /api/ prefix
  app.all("/api/:path{.*}", async (c) => {
    // Get the path without the /api/ prefix
    const rawPath = c.req.param("path") || "";
    const normalizedPath = normalizePath(rawPath);
    const method = c.req.method;

    // Determine args based on method
    let args: Record<string, unknown> = {};
    if (isMutationMethod(method)) {
      // For mutations, parse JSON body
      try {
        const body = await c.req.json();
        // Unwrap args if client wrapped them as { args: {...} }
        args = body.args ?? body;
      } catch {
        args = {};
      }
    } else {
      // For queries, parse search params with type coercion
      const queryParams = c.req.queries();
      args = coerceQueryParams(queryParams);
    }

    // Get the procedure function using the proxy-based access
    const pathParts = normalizedPath.split(".");
    const procedure = getProcedure(client, pathParts);

    if (!procedure) {
      const notFoundResult = { ok: false as const, error: { name: "ROUTE_NOT_FOUND", message: `Route not found: ${normalizedPath}` } };
      return c.json(notFoundResult, 404);
    }

    // Call the procedure using proxy access (direct method call)
    const result = await procedure(args);

    if (result.ok) {
      return c.json(result);
    }

    // Map error code to HTTP status
    const error = result.error as Error | undefined;
    const status = getHTTPStatus(error?.name);
    return c.json(result, status as 400 | 401 | 403 | 404 | 409 | 500);
  });

  return app;
}
