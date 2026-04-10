import { handle } from "hono/vercel";
import { createHonoHandler } from "@deessejs/server-hono";
import type { HTTPClient } from "@deessejs/server-hono";

/**
 * Next.js handler object with HTTP methods
 */
export interface NextHandler {
  GET: typeof handle;
  POST: typeof handle;
  PUT: typeof handle;
  PATCH: typeof handle;
  DELETE: typeof handle;
  OPTIONS: typeof handle;
}

/**
 * Creates a Next.js handler from a deesse API client
 * Uses Hono internally via the handle() function from hono/vercel
 */
export function createNextHandler(client: HTTPClient): NextHandler {
  const app = createHonoHandler(client);

  return {
    GET: handle(app),
    POST: handle(app),
    PUT: handle(app),
    PATCH: handle(app),
    DELETE: handle(app),
    OPTIONS: handle(app),
  };
}
