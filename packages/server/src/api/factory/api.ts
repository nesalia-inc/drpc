import type { Result } from "@deessejs/fp";
import { none } from "@deessejs/fp";
import type { Middleware, Plugin, Router } from "../../types.js";
import { createPendingEventQueue } from "../../events/queue.js";
import { isRouter, isProcedure } from "../../router/index.js";
import type { APIInstance, RequestInfo, EventEmitterAny } from "../types/api.js";
import type { TypedAPIInstance, PublicRouter } from "../types/proxy.js";
import type { APIInstanceState } from "../types/internal.js";
import { createRouterProxy } from "./proxy.js";
import type { RouterProxyContext } from "../types/internal.js";

// ============================================================
// Public API Creation
// ============================================================

export const createAPI = <Ctx, TRoutes extends Router<Ctx>>(
  config: {
    router: TRoutes;
    context?: Ctx;
    createContext?: (requestInfo?: RequestInfo) => Ctx;
    plugins?: readonly Plugin<Ctx>[];
    middleware?: readonly Middleware<Ctx>[];
    eventEmitter?: EventEmitterAny;
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

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const routerProxy = createRouterProxy(proxyCtx) as any;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return new Proxy(state as any, {
    get(target, prop: string | symbol): unknown {
      if (prop === "router") return target.router;
      if (prop === "ctx") return target.ctx;
      if (prop === "plugins") return target.plugins;
      if (prop === "globalMiddleware") return target.globalMiddleware;
      if (prop === "eventEmitter") return target.eventEmitter;
      if (prop === "getEvents")
        return () => target.eventEmitter?.getEventLog() ?? [];
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return (routerProxy as any)[prop];
    },
  });
};

// ============================================================
// Public Router Filter
// ============================================================

const isQueryOrMutation = (procedure: unknown): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = (procedure as any).type;
  return type === "query" || type === "mutation";
};

export const filterPublicRouter = <TRoutes extends Router<any, any>>(
  router: TRoutes
): PublicRouter<TRoutes> => {
  const result: any = {};
  for (const key in router) {
    const value = (router as any)[key];
    if (isRouter(value)) {
      result[key] = filterPublicRouter(value);
    } else if (isProcedure(value) && isQueryOrMutation(value)) {
      result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const createPublicAPI = <Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, PublicRouter<TRoutes>> => {
  const publicRouter = filterPublicRouter(api.router);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const originalCreateContext = (api as any).createContext;
  const contextFactory =
    typeof originalCreateContext === "function"
      ? originalCreateContext
      : (_requestInfo?: RequestInfo) => api.ctx;

  return createAPI({
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    router: publicRouter as any,
    context: api.ctx,
    createContext: contextFactory,
    plugins: api.plugins,
    middleware: api.globalMiddleware,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  }) as any;
};
