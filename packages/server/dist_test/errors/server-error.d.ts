import { type Result } from "@deessejs/fp";
export { ok, err } from "@deessejs/fp";
export declare class ServerException extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly args: Readonly<{
        message: string;
        data?: Record<string, unknown>;
    }>;
    constructor(code: string, message: string, statusCode?: number, data?: Record<string, unknown>);
}
export declare class NotFoundException extends ServerException {
    constructor(message?: string);
}
export declare class UnauthorizedException extends ServerException {
    constructor(message?: string);
}
export declare class ValidationException extends ServerException {
    constructor(message: string);
}
export declare const ErrorCodes: {
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly CONFLICT: "CONFLICT";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly INVALID_ARGS: "INVALID_ARGS";
};
export declare function createErrorResult(code: string, message: string, data?: Record<string, unknown>): Result<never>;
//# sourceMappingURL=server-error.d.ts.map