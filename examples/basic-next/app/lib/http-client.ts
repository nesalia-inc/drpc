/**
 * Client-side API wrapper for @deessejs/server
 *
 * Uses @deessejs/client for type-safe procedure calling.
 */

import { createClient, fetchTransport } from "@deessejs/client";
import type { AppRouter } from "@/server/api";

// Create client with fetch transport
const transport = fetchTransport("/api");
export const client = createClient<AppRouter>({ transport });
