/**
 * Server API Export
 *
 * This is the main entry point that exports the API for use
 * by both the local executor and HTTP server.
 */

import { createAPI } from "./context";
import { appRouter } from "./routers";

// ============================================================================
// Create API Instance
// ============================================================================

// Full API instance for server-side use
// IMPORTANT: Use createAPI from ./context (which wraps the eventEmitter)
// not the raw createAPI from @deessejs/server
export const api = createAPI({
  router: appRouter,
});

// Type export for client usage
export type { AppRouter } from "./routers";
