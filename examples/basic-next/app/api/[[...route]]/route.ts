/**
 * Next.js Route Handler for @deessejs/server
 *
 * This file exposes the @deessejs/server procedures via HTTP.
 * It uses @deessejs/server-next to create the handler.
 */

import { publicAPI } from "@/server/api";
import { createNextHandler } from "@deessejs/server-next";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createNextHandler(publicAPI);
