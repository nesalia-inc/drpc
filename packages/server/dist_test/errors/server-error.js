import { error as errorFn, err as errFn } from "@deessejs/fp";
export { ok, err } from "@deessejs/fp";
export class ServerException extends Error {
    code;
    statusCode;
    args;
    constructor(code, message, statusCode = 500, data) {
        const errData = createError(code, { message, data });
        super(message);
        this.name = "ServerException";
        this.code = code;
        this.statusCode = statusCode;
        this.stack = errData.stack;
        this.cause = errData.cause;
        this.args = errData.args;
    }
}
export class NotFoundException extends ServerException {
    constructor(message = "Resource not found") {
        super("NOT_FOUND", message, 404);
        this.name = "NotFoundException";
    }
}
export class UnauthorizedException extends ServerException {
    constructor(message = "Unauthorized") {
        super("UNAUTHORIZED", message, 401);
        this.name = "UnauthorizedException";
    }
}
export class ValidationException extends ServerException {
    constructor(message) {
        super("VALIDATION_ERROR", message, 400);
        this.name = "ValidationException";
    }
}
// ============================================
// Error Codes
// ============================================
export const ErrorCodes = {
    NOT_FOUND: "NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    FORBIDDEN: "FORBIDDEN",
    CONFLICT: "CONFLICT",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
    INVALID_ARGS: "INVALID_ARGS",
};
// ============================================
// Error Builder Helper
// ============================================
const ERROR_BUILDERS = {
    NOT_FOUND: errorFn({
        name: "NOT_FOUND",
        message: (args) => args.message,
    }),
    FORBIDDEN: errorFn({
        name: "FORBIDDEN",
        message: (args) => args.message,
    }),
    CONFLICT: errorFn({
        name: "CONFLICT",
        message: (args) => args.message,
    }),
    INTERNAL_ERROR: errorFn({
        name: "INTERNAL_ERROR",
        message: (args) => args.message,
    }),
    ROUTE_NOT_FOUND: errorFn({
        name: "ROUTE_NOT_FOUND",
        message: (args) => args.message,
    }),
    VALIDATION_ERROR: errorFn({
        name: "VALIDATION_ERROR",
        message: (args) => args.message,
    }),
};
function createError(name, args) {
    const builder = ERROR_BUILDERS[name];
    if (builder) {
        return builder(args);
    }
    return errorFn({ name, message: (a) => a.message })(args);
}
// Helper to create error result properly typed
export function createErrorResult(code, message, data) {
    const err = createError(code, { message, data });
    return errFn(err);
}
//# sourceMappingURL=server-error.js.map