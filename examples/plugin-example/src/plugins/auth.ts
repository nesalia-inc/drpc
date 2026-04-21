/**
 * Auth Plugin
 *
 * This plugin demonstrates how to extend the context with authentication-related
 * properties and helpers. It adds:
 *   - userId: the authenticated user's ID (null if not authenticated)
 *   - isAuthenticated: boolean flag for quick auth checks
 *   - requireAuth(): method that throws UnauthorizedException if not authenticated
 *
 * PLUGIN ANATOMY:
 * A plugin is an object with:
 *   - name: unique identifier (useful for debugging/logging)
 *   - extend: function that receives the current context and returns new properties
 *             to merge into the context
 *
 * The extend function is called for each request, allowing per-request personalization
 * (e.g., extracting user info from request headers).
 */

import { plugin } from "@deessejs/server";
import type { AppContext } from "@/api";
import { UnauthorizedException } from "@deessejs/server";

/**
 * Auth plugin that adds authentication helpers to the context.
 *
 * Note: TypeScript generics are used here to express that this plugin extends
 * a context that has at least the properties this plugin depends on.
 * The actual AppContext (defined in api/index.ts) includes ALL properties,
 * including those added by this plugin and the cache plugin.
 */
export const authPlugin = plugin("auth", (ctx) => ({
  userId: ctx.userId,
  isAuthenticated: ctx.userId !== null,
  requireAuth: () => {
    if (ctx.userId === null) {
      throw new UnauthorizedException(
        "Authentication required. Please include a valid Authorization header."
      );
    }
  },
}));