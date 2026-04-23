import { none } from "@deessejs/fp";
import { isProcedure } from "../../router/index.js";
import { isValidSymbol, buildFullPath, isNoArgsProcedure } from "./utils.js";
import { executeRoute } from "./route.js";
// ============================================================
// Router Proxy Creation (Memoized per instance)
// ============================================================
export const createRouterProxy = (proxyCtx, path = []
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
) => {
    const { router, ctx, globalMiddleware, rootRouter, eventEmitter, queue, plugins } = proxyCtx;
    // L1: Memoization cache for this proxy instance (stability for React/useEffect)
    const cache = new Map();
    return new Proxy({}, {
        get(target, prop) {
            // L2: Return cached result if exists (api.users === api.users)
            if (cache.has(prop))
                return cache.get(prop);
            if (!isValidSymbol(prop))
                return undefined;
            if (typeof prop !== "string")
                return none();
            const value = router[prop];
            if (value === undefined)
                return none();
            let result;
            if (isProcedure(value)) {
                const fullPath = buildFullPath(path, prop);
                // L2: Create routeCtx with rootRouter for proper procedure lookup
                const routeCtx = {
                    router: rootRouter,
                    ctx,
                    globalMiddleware,
                    eventEmitter,
                    queue,
                    plugins,
                };
                if (isNoArgsProcedure(value)) {
                    result = () => executeRoute(fullPath, undefined, routeCtx);
                }
                else {
                    result = (args) => executeRoute(fullPath, args, routeCtx);
                }
            }
            else if (typeof value === "object" && value !== null) {
                // L2: Nested proxy created once per path
                result = createRouterProxy({ ...proxyCtx, router: value }, [...path, prop]);
            }
            else {
                result = none();
            }
            // L2: Cache the result for consistent references
            cache.set(prop, result);
            return result;
        },
    });
};
//# sourceMappingURL=proxy.js.map