export function createMutationWithHooks(config) {
    return createHookedProcedure({
        type: "mutation",
        argsSchema: config.args,
        handler: config.handler,
    });
}
function createHookedProcedure(proc) {
    const hookedProc = {
        type: proc.type,
        argsSchema: proc.argsSchema,
        handler: proc.handler,
        _hooks: {},
        _middleware: [],
    };
    hookedProc.beforeInvoke = function (hook) {
        hookedProc._hooks.beforeInvoke = hook;
        return hookedProc;
    };
    hookedProc.afterInvoke = function (hook) {
        hookedProc._hooks.afterInvoke = hook;
        return hookedProc;
    };
    hookedProc.onSuccess = function (hook) {
        hookedProc._hooks.onSuccess = hook;
        return hookedProc;
    };
    hookedProc.onError = function (hook) {
        hookedProc._hooks.onError = hook;
        return hookedProc;
    };
    hookedProc.use = function (middleware) {
        const newProc = {
            type: hookedProc.type,
            argsSchema: hookedProc.argsSchema,
            handler: hookedProc.handler,
            _hooks: { ...hookedProc._hooks },
            _middleware: [...hookedProc._middleware, middleware],
        };
        newProc.beforeInvoke = function (hook) {
            newProc._hooks.beforeInvoke = hook;
            return newProc;
        };
        newProc.afterInvoke = function (hook) {
            newProc._hooks.afterInvoke = hook;
            return newProc;
        };
        newProc.onSuccess = function (hook) {
            newProc._hooks.onSuccess = hook;
            return newProc;
        };
        newProc.onError = function (hook) {
            newProc._hooks.onError = hook;
            return newProc;
        };
        newProc.use = function (mw) {
            const result = {
                type: newProc.type,
                argsSchema: newProc.argsSchema,
                handler: newProc.handler,
                _hooks: { ...newProc._hooks },
                _middleware: [...newProc._middleware, mw],
            };
            result.beforeInvoke = function (hook) {
                result._hooks.beforeInvoke = hook;
                return result;
            };
            result.afterInvoke = function (hook) {
                result._hooks.afterInvoke = hook;
                return result;
            };
            result.onSuccess = function (hook) {
                result._hooks.onSuccess = hook;
                return result;
            };
            result.onError = function (hook) {
                result._hooks.onError = hook;
                return result;
            };
            result.use = newProc.use;
            return result;
        };
        return newProc;
    };
    return hookedProc;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
//# sourceMappingURL=builder.js.map