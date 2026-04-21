/**
 * Auth Plugin (Server-Only Version)
 *
 * Demonstrates how to extend the context with authentication helpers
 * in a pure server-side setup - no HTTP headers, no requests.
 *
 * In this example the userId comes from the base context directly, which
 * means whatever userId was set when the API instance was created is what
 * the plugin works with. In a real application this would come from a
 * session store, a database lookup, or a server action parameter.
 *
 * The plugin adds:
 *   - userId: the authenticated user ID (number | null)
 *   - isAuthenticated: convenience boolean flag
 *   - requireAuth(): guard that throws if no user is present
 */

import { plugin } from "@deessejs/server";
import { UnauthorizedException } from "@deessejs/server";
import type { AppContext } from "../api/index.js";

/**
 * Auth plugin that reads userId from the base context and exposes auth helpers.
 *
 * Because there is no HTTP layer, the userId is already present in the context
 * at API-creation time. The plugin's job is only to derive the helper values
 * (isAuthenticated, requireAuth) from that userId.
 */
export const authPlugin = plugin("auth", (ctx) => ({
  userId: ctx.userId,
  isAuthenticated: ctx.userId !== null,
  requireAuth: () => {
    if (ctx.userId === null) {
      throw new UnauthorizedException(
        "Authentication required. The current API context has no authenticated user."
      );
    }
  },
}));