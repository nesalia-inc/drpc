import { none } from "@deessejs/fp";
import type { Plugin, Router } from "../../types.js";
import { isProcedure } from "../../router/index.js";
import { createPendingEventQueue } from "../../events/queue.js";
import type { EventEmitterAny } from "../types/api.js";
import type { ExecuteRouteContext, RouterProxyContext } from "../types/internal.js";
import { isValidSymbol, buildFullPath, isNoArgsProcedure } from "./utils.js";
import { executeRoute } from "./route.js";

// ============================================================
// Router Proxy Creation
// ============================================================

export const createRouterProxy = <Ctx>(
  proxyCtx: RouterProxyContext<Ctx>,
  path: readonly string[] = []
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
): any => {
  const { router, ctx, globalMiddleware, rootRouter, eventEmitter, queue, plugins } = proxyCtx;

  return new Proxy({}, {
    get(target: unknown, prop: string | symbol): unknown {
      if (!isValidSymbol(prop)) return undefined;
      if (typeof prop !== "string") return none();

      const value = (router as Record<string, unknown>)[prop];
      if (value === undefined) return none();

      if (isProcedure(value)) {
        const fullPath = buildFullPath(path, prop);

        if (isNoArgsProcedure(value)) {
          const routeCtx: ExecuteRouteContext<Ctx> = {
            router: rootRouter,
            ctx,
            globalMiddleware,
            eventEmitter,
            queue,
            plugins,
          };
          return () => executeRoute(fullPath, undefined, routeCtx);
        }

        const routeCtx: ExecuteRouteContext<Ctx> = {
          router: rootRouter,
          ctx,
          globalMiddleware,
          eventEmitter,
          queue,
          plugins,
        };
        return (args: unknown) => executeRoute(fullPath, args, routeCtx);
      }

      if (typeof value === "object" && value !== null) {
        const nestedProxyCtx: RouterProxyContext<Ctx> = {
          router: value as Router<Ctx>,
          ctx,
          globalMiddleware,
          rootRouter,
          eventEmitter,
          queue,
          plugins,
        };
        return createRouterProxy(nestedProxyCtx, [...path, prop]);
      }

      return none();
    },
  });
};
