import { createHandlerContext } from "./send.js";
import { validationFailed } from "../errors.js";
import { createInternalErrorResult, createServerErrorResult } from "./errors.js";
import { ServerException } from "../../errors/server-error.js";
// ============================================================
// L2: Procedure Execution with Hooks
// ============================================================
const executeProcedureWithHooks = async (ctx, args, hookedProc, procedure, route, queue, eventEmitter) => {
    // L1: Invoke beforeInvoke hook
    if (hookedProc._hooks?.beforeInvoke) {
        hookedProc._hooks.beforeInvoke(ctx, args);
    }
    try {
        const result = await procedure.handler(ctx, args);
        // L1: Invoke afterInvoke hook
        if (hookedProc._hooks?.afterInvoke) {
            hookedProc._hooks.afterInvoke(ctx, args, result);
        }
        if (result.ok) {
            // L1: Invoke onSuccess hook
            if (hookedProc._hooks?.onSuccess) {
                hookedProc._hooks.onSuccess(ctx, args, result.value);
            }
            // L1: Flush queue on success
            await queue.flush(eventEmitter);
        }
        else {
            // L1: Invoke onError hook
            if (hookedProc._hooks?.onError) {
                hookedProc._hooks.onError(ctx, args, result.error);
            }
        }
        return result;
    }
    catch (error) {
        // L1: Invoke onError hook on exception
        if (hookedProc._hooks?.onError) {
            hookedProc._hooks.onError(ctx, args, error);
        }
        return createInternalErrorResult(error instanceof Error ? error.message : String(error), route);
    }
};
// ============================================================
// L2: Middleware Chain Runner (with double-next protection)
// ============================================================
const runMiddlewareChain = (allMiddleware, handlerCtx, args, finalInvoke) => {
    let index = -1;
    const next = async (overrides) => {
        // L1: Double-next protection - validate index hasn't been reused
        const nextIndex = index + 1;
        if (nextIndex <= index) {
            throw new Error(`Middleware safety violation: next() called multiple times at index ${index}`);
        }
        index = nextIndex;
        const currentCtx = overrides?.ctx ? { ...handlerCtx, ...overrides.ctx } : handlerCtx;
        if (index >= allMiddleware.length) {
            return finalInvoke();
        }
        const mw = allMiddleware[index];
        return mw.handler(currentCtx, {
            next: (innerOverrides) => next(innerOverrides),
            args,
            meta: {},
        });
    };
    return next;
};
// ============================================================
// L3: Execute Procedure (main orchestration)
// ============================================================
export const executeProcedure = async (ctx) => {
    const { procedure, ctx: procedureCtx, args, middleware, eventEmitter, queue, route, plugins } = ctx;
    const handlerCtx = createHandlerContext(procedureCtx, queue, plugins);
    const hookedProc = procedure;
    // L1: Validate args if schema exists
    if (hookedProc.argsSchema) {
        const parseResult = hookedProc.argsSchema.safeParse(args);
        if (!parseResult.success) {
            return validationFailed(route, parseResult.error.issues).mapErr((e) => e.addNotes(`Validation failed for route: ${route}`));
        }
    }
    const procedureMiddleware = hookedProc._middleware || [];
    const allMiddleware = [...middleware, ...procedureMiddleware];
    // L2: Final invoke function
    const finalInvoke = () => executeProcedureWithHooks(handlerCtx, args, hookedProc, procedure, route, queue, eventEmitter);
    // L2: Run middleware chain
    const runChain = runMiddlewareChain(allMiddleware, handlerCtx, args, finalInvoke);
    try {
        return await runChain();
    }
    catch (error) {
        queue.clear();
        if (error instanceof ServerException) {
            return createServerErrorResult(error.code, error.message, route);
        }
        const errToReturn = error instanceof Error ? error : new Error(String(error));
        return createInternalErrorResult(errToReturn.message, route);
    }
};
//# sourceMappingURL=procedure.js.map