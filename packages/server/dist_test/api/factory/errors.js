import { error as errorFn } from "@deessejs/fp";
import { internalError, serverError } from "../errors.js";
// ============================================================
// L1: Error Creation
// ============================================================
export const createInternalErrorResult = (message, route) => internalError(message).mapErr((e) => e
    .addNotes(`Error in route: ${route}`)
    .from(errorFn({ name: "INTERNAL_ERROR", message: (_) => message })({
    message,
})));
export const createServerErrorResult = (code, message, route) => serverError(code, message).mapErr((e) => e
    .addNotes(`Route: ${route}`)
    .from(errorFn({ name: code, message: (_) => message })({ message })));
//# sourceMappingURL=errors.js.map