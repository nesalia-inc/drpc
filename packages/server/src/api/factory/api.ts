import { createPendingEventQueue } from "../../events/queue.js";
import { isRouter, isProcedure } from "../../router/index.js";
import  { type APIInstance, type RequestInfo, type EventEmitterAny } from "../types/api.js";
import  { type TypedAPIInstance, type PublicRouter, apiInternalSymbol } from "../types/proxy.js";
import  { type APIInstanceState, type RouterProxyContext } from "../types/internal.js";
import { createRouterProxy } from "./proxy.js";
import  { type Middleware, type Plugin, type Router } from "../../types.js";

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
export const filterPublicRouter = <TRoutes extends Router<Ctx>, Ctx>(
  router: TRoutes
): PublicRouter<TRoutes> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  for (const key in router) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (router as Record<string, any>)[key];

    // Check procedure FIRST - isRouter returns true for procedure objects too
    if (isProcedure(value) && isQueryOrMutation(value)) {
      // Only include public queries and mutations
      result[key] = value;
    } else if (isRouter(value)) {
      // Recursively filter nested routers
      const filtered = filterPublicRouter(value);
      // Only include nested router if it has public procedures
      if (Object.keys(filtered).length > 0) {
        result[key] = filtered;
      }
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
      // Handle symbol access for internal properties
      if (typeof prop === "symbol") {
        if (prop === apiInternalSymbol) {
          return {
            router: target.router,
            ctx: target.ctx,
            plugins: target.plugins,
            eventEmitter: target.eventEmitter,
          };
        }
        return undefined;
      }

      // Handle root properties (string only)
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
        case "getEvents":
          return () => target.eventEmitter?.getEventLog() ?? [];
      }

      // Delegate to router proxy for route access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (routerProxy as any)[prop];
    },
  };

  return new Proxy(state, handler) as unknown as TypedAPIInstance<Ctx, TRoutes>;
};

/**
 * Creates a public-only view of an API by filtering out internal procedures.
 * Shares the same queue and event emitter for efficiency.
 */
export const createPublicAPI = <Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): TypedAPIInstance<Ctx, PublicRouter<TRoutes>> => {
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
  });
};
