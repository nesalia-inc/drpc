import { createPublicAPI } from "@deessejs/server";

/**
 * HTTP client interface returned by createPublicAPI
 */
export type HTTPClient = ReturnType<typeof createPublicAPI>;
