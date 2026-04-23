import { error, err } from "@deessejs/fp";
import { z } from "zod";
import  { type Result } from "@deessejs/fp";

/**
 * RouteNotFoundError - Returned when a route path cannot be resolved.
 */
export const RouteNotFoundError = error({
  name: "RouteNotFoundError",
  schema: z.object({ route: z.string() }),
  message: (args) => `Route not found: ${args.route}`,
});

/**
 * ValidationError - Returned when Zod validation fails for procedure args.
 */
export const ValidationError = error({
  name: "ValidationError",
  schema: z.object({
    route: z.string(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })),
  }),
  message: (args) =>
    `Validation failed for route ${args.route}: ${args.errors.map((e) => e.message).join(", ")}`,
});

/**
 * MiddlewareError - Returned when middleware execution fails.
 */
export const MiddlewareError = error({
  name: "MiddlewareError",
  schema: z.object({ middleware: z.string(), reason: z.string() }),
  message: (args) => `Middleware '${args.middleware}' failed: ${args.reason}`,
});

/**
 * InternalError - Returned for unrecoverable internal errors.
 */
export const InternalError = error({
  name: "InternalError",
  schema: z.object({ context: z.string() }),
  message: (args) => `Internal error: ${args.context}`,
});

/**
 * ServerError - Used for server-side exceptions with a code.
 */
export const ServerError = error({
  name: "ServerError",
  schema: z.object({ code: z.string(), message: z.string() }),
  message: (args) => `[${args.code}] ${args.message}`,
});

/**
 * Create a route not found error result.
 */
export const routeNotFound = (route: string): Result<never, ReturnType<typeof RouteNotFoundError>> =>
  // eslint-disable-next-line unicorn/throw-new-error -- error() returns a factory function, not a class
  err(RouteNotFoundError({ route }));

/**
 * Create a validation error result from Zod issues.
 */
export const validationFailed = (
  route: string,
  zodIssues: z.ZodError["issues"]
): Result<never, ReturnType<typeof ValidationError>> =>
  err(
    // eslint-disable-next-line unicorn/throw-new-error -- error() returns a factory function, not a class
    ValidationError({
      route,
      errors: zodIssues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    })
  );

/**
 * Create an internal error result.
 */
export const internalError = (context: string): Result<never, ReturnType<typeof InternalError>> =>
  // eslint-disable-next-line unicorn/throw-new-error -- error() returns a factory function, not a class
  err(InternalError({ context }));

/**
 * Create a server error result.
 */
export const serverError = (
  code: string,
  message: string
): Result<never, ReturnType<typeof ServerError>> =>
  // eslint-disable-next-line unicorn/throw-new-error -- error() returns a factory function, not a class
  err(ServerError({ code, message }));
