import type { Middleware, Plugin, Router } from "../../types.js";
import { createPendingEventQueue } from "../../events/queue.js";
import { isRouter, isProcedure } from "../../router/index.js";
import type { APIInstance, RequestInfo, EventEmitterAny } from "../types/api.js";
import type { TypedAPIInstance, PublicRouter } from "../types/proxy.js";
import type { APIInstanceState, RouterProxyContext } from "../types/internal.js";
import { createRouterProxy } from "./proxy.js";

// ============================================================
// Constants
// ============================================================

const ROOT_PROPERTIES = new Set([
  "router",
  "ctx",
  "plugins",
  "globalMiddleware",
  "eventEmitter",
] as const);

// ============================================================
// Public Router Filter
// ============================================================

const isQueryOrMutation = (procedure: unknown): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = (procedure as any).type;
  return type === "query" || type === "mutation";
};

/**
 * Filters a router to only include public queries and mutations.
 * Internal procedures and unknown types are explicitly excluded.
 */
export const filterPublicRouter = <TRoutes extends Router<any, any>>(
  router: TRoutes
): PublicRouter<TRoutes> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const key in router as any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (router as any)[key];

    if (isRouter(value)) {
      // Recursively filter nested routers
      result[key] = filterPublicRouter(value);
    } else if (isProcedure(value) && isQueryOrMutation(value)) {
      // Only include public queries and mutations
      result[key] = value;
    }
    // Explicitly ignore everything else (internal procedures, unknown types)
  }

  return result as PublicRouter<TRoutes>;
};

// ============================================================
// Public API Creation
// ============================================================

export const createAPI = <Ctx, TRoutes extends Router<Ctx>>(
  config: {
    readonly router: TRoutes;
    readonly context?: Ctx;
    readonly createContext?: (requestInfo?: RequestInfo) => Ctx;
    readonly plugins?: readonly Plugin<Ctx>[];
    readonly middleware?: readonly Middleware<Ctx>[];
    readonly eventEmitter?: EventEmitterAny;
  }
): TypedAPIInstance<Ctx, TRoutes> => {
  const {
    router,
    context,
    createContext,
    plugins = [],
    middleware = [],
    eventEmitter,
  } = config;

  const queue = createPendingEventQueue();

  // Note: contextFactory is called once at creation.
  // For per-request context, use createContext with proper request handling.
  const contextFactory =
    createContext ?? ((_requestInfo?: RequestInfo) => context as Ctx);
  const initialCtx = contextFactory();

  const state: APIInstanceState<Ctx, TRoutes> = {
    router,
    ctx: initialCtx,
    plugins,
    globalMiddleware: middleware,
    eventEmitter,
  };

  const proxyCtx: RouterProxyContext<Ctx> = {
    router: state.router,
    ctx: state.ctx,
    globalMiddleware: state.globalMiddleware,
    rootRouter: state.router,
    eventEmitter,
    queue,
    plugins: state.plugins,
  };

  const routerProxy = createRouterProxy(proxyCtx);

  // Create a typed Proxy for the API instance
  const handler: ProxyHandler<APIInstanceState<Ctx, TRoutes>> = {
    get(target, prop) {
      // Handle root properties (string only)
      if (typeof prop === "string") {
        switch (prop) {
          case "router":
            return target.router;
          case "ctx":
            return target.ctx;
          case "plugins":
            return target.plugins;
          case "globalMiddleware":
            return target.globalMiddleware;
          case "eventEmitter":
            return target.eventEmitter;
        }
      }

      // Handle special property 'getEvents'
      if (prop === "getEvents") {
        return () => target.eventEmitter?.getEventLog() ?? [];
      }

      // Delegate to router proxy for route access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (routerProxy as any)[prop];
    },
  };

  return new Proxy(state, handler) as TypedAPIInstance<Ctx, TRoutes>;
};

/**
 * Creates a public-only view of an API by filtering out internal procedures.
 * Shares the same queue and event emitter for efficiency.
 */
export const createPublicAPI = <Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, PublicRouter<TRoutes>> => {
  const publicRouter = filterPublicRouter(api.router);

  // Note: createContext is preserved from original API but called once.
  // This is a known limitation - per-request context requires architecture change.
  return createAPI({
    router: publicRouter as TRoutes,
    context: api.ctx,
    createContext: undefined,
    plugins: api.plugins,
    middleware: api.globalMiddleware,
    eventEmitter: api.eventEmitter,
  }) as APIInstance<Ctx, PublicRouter<TRoutes>>;
};
