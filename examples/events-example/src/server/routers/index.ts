/**
 * Main Router
 *
 * Combines all sub-routers into the application router.
 */

import { t } from "./context";
import { usersRouter } from "./users";

// ============================================================================
// Main Application Router
// ============================================================================

export const appRouter = t.router({
  users: usersRouter,
});

// Type export for the router
export type AppRouter = typeof appRouter;
