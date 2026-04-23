import type { Result } from "@deessejs/fp";
import type { ZodIssue } from "zod";
/**
 * RouteNotFoundError - Returned when a route path cannot be resolved.
 */
export declare const RouteNotFoundError: import("@deessejs/fp").ErrorBuilder<{
    route: string;
}>;
/**
 * ValidationError - Returned when Zod validation fails for procedure args.
 */
export declare const ValidationError: import("@deessejs/fp").ErrorBuilder<{
    route: string;
    errors: {
        path: string;
        message: string;
    }[];
}>;
/**
 * MiddlewareError - Returned when middleware execution fails.
 */
export declare const MiddlewareError: import("@deessejs/fp").ErrorBuilder<{
    middleware: string;
    reason: string;
}>;
/**
 * InternalError - Returned for unrecoverable internal errors.
 */
export declare const InternalError: import("@deessejs/fp").ErrorBuilder<{
    context: string;
}>;
/**
 * ServerError - Used for server-side exceptions with a code.
 */
export declare const ServerError: import("@deessejs/fp").ErrorBuilder<{
    code: string;
    message: string;
}>;
/**
 * Create a route not found error result.
 */
export declare const routeNotFound: (route: string) => Result<never, ReturnType<typeof RouteNotFoundError>>;
/**
 * Create a validation error result from Zod issues.
 */
export declare const validationFailed: (route: string, zodIssues: ZodIssue[]) => Result<never, ReturnType<typeof ValidationError>>;
/**
 * Create an internal error result.
 */
export declare const internalError: (context: string) => Result<never, ReturnType<typeof InternalError>>;
/**
 * Create a server error result.
 */
export declare const serverError: (code: string, message: string) => Result<never, ReturnType<typeof ServerError>>;
//# sourceMappingURL=errors.d.ts.map