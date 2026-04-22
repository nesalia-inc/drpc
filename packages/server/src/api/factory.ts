import type { Result } from "@deessejs/fp";
import { err, error as errorFn, none } from "@deessejs/fp";
import { type Plugin, type Middleware, type Router, type Procedure, type SendOptions, type EventRegistry, type HandlerContext } from "../types.js";
import { createPendingEventQueue } from "../events/queue.js";
import { ServerException } from "../errors/server-error.js";
import { isRouter, isProcedure } from "../router/index.js";
import { type APIInstance, type RequestInfo, type EventEmitterAny } from "./types/api.js";
import { type TypedAPIInstance, type PublicRouter } from "./types/proxy.js";
import { type ProcedureWithHooks, type APIInstanceState } from "./types/internal.js";
import { routeNotFound, validationFailed, serverError, internalError } from "./errors.js";
/* eslint-disable unicorn/throw-new-error */

// ============================================================
// Context Objects (to reduce parameters to max 3)
// ============================================================

type RouterProxyContext<Ctx> = {
  readonly router: Router<Ctx>;
  readonly ctx: Ctx;
  readonly globalMiddleware: readonly Middleware<Ctx>[];
  readonly rootRouter: Router<Ctx>;
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: ReturnType<typeof createPendingEventQueue>;
  readonly plugins: readonly Plugin<Ctx>[];
};

type ExecuteRouteContext<Ctx> = {
  readonly router: Router<Ctx>;
  readonly ctx: Ctx;
  readonly globalMiddleware: readonly Middleware<Ctx>[];
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: ReturnType<typeof createPendingEventQueue>;
  readonly plugins: readonly Plugin<Ctx>[];
};

type ExecuteProcedureContext<Ctx, Args, Output> = {
  readonly procedure: Procedure<Ctx, Args, Output>;
  readonly ctx: Ctx;
  readonly args: Args;
  readonly middleware: readonly Middleware<Ctx>[];
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: ReturnType<typeof createPendingEventQueue>;
  readonly route: string;
  readonly plugins: readonly Plugin<Ctx>[];
};

// ============================================================
// L1: Atomic Operations
// ============================================================

const splitRoutePath = (route: string): readonly string[] => route.split(".");

const getProcedureFromPath = (
  router: Router<unknown>,
  pathParts: readonly string[]
): Procedure<unknown, unknown, unknown> | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, unknown> = router as any;
  for (let i = 0; i < pathParts.length - 1; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current = current[pathParts[i]] as any;
    if (!current) return undefined;
  }
  const procedure = current[pathParts.at(-1)!];
  return isProcedure(procedure) ? procedure : undefined;
};

const isValidSymbol = (prop: string | symbol): boolean =>
  prop !== "then" && prop !== "toJSON" && prop !== "valueOf" && prop !== Symbol.toStringTag;

const getSymbolProperty = (prop: string | symbol): unknown => {
  if (typeof prop !== "string") return none();
  return none();
};

const buildFullPath = (path: readonly string[], prop: string): string => [...path, prop].join(".");

const isNoArgsProcedure = (procedure: unknown): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !(procedure as any).argsSchema;
};

// ============================================================
// L1: Plugin Application
// ============================================================

const applyPlugins = <Ctx>(ctx: Ctx, plugins: readonly Plugin<Ctx>[]): Ctx => {
  let extendedCtx = ctx;
  for (const plugin of plugins) {
    extendedCtx = { ...extendedCtx, ...plugin.extend(extendedCtx) } as Ctx;
  }
  return extendedCtx;
};

// ============================================================
// L1: Handler Context Creation
// ============================================================

const createSendFn =
  <Ctx, Events extends EventRegistry>(
    queue: ReturnType<typeof createPendingEventQueue>
  ) =>
  (name: keyof Events, data: Events[typeof name]["data"], options?: SendOptions): void => {
    queue.enqueue({
      name: name as string,
      data,
      timestamp: new Date().toISOString(),
      namespace: options?.namespace ?? "default",
      options,
    });
  };

const createHandlerContext = <Ctx, Events extends EventRegistry>(
  ctx: Ctx,
  queue: ReturnType<typeof createPendingEventQueue>,
  plugins: readonly Plugin<Ctx>[]
): HandlerContext<Ctx, Events> => {
  const send = createSendFn<Ctx, Events>(queue);
  const extendedCtx = applyPlugins(ctx, plugins);
  return {
    ...(extendedCtx as object),
    send,
  } as HandlerContext<Ctx, Events>;
};

// ============================================================
// L1: Error Creation
// ============================================================

const createInternalErrorResult = (message: string, route: string): Result<never> =>
  internalError(message).mapErr((e) =>
    e
      .addNotes(`Error in route: ${route}`)
      .from(errorFn({ name: "INTERNAL_ERROR", message: (_: unknown) => message })({ message }))
  );

const createServerErrorResult = (
  code: string,
  message: string,
  route: string
): Result<never> =>
  serverError(code, message).mapErr((e) =>
    e
      .addNotes(`Route: ${route}`)
      .from(errorFn({ name: code, message: (_: unknown) => message })({ message }))
  );

// ============================================================
// L2: Procedure Execution with Hooks
// ============================================================

const executeProcedureWithHooks = async <Ctx, Args, Output>(
  ctx: HandlerContext<Ctx, EventRegistry>,
  args: Args,
  hookedProc: ProcedureWithHooks<Ctx, Args, Output>,
  procedure: Procedure<Ctx, Args, Output>,
  route: string,
  queue: ReturnType<typeof createPendingEventQueue>,
  eventEmitter: EventEmitterAny | undefined
): Promise<Result<Output>> => {
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
    } else {
      // L1: Invoke onError hook
      if (hookedProc._hooks?.onError) {
        hookedProc._hooks.onError(ctx, args, result.error);
      }
    }

    return result;
  } catch (error) {
    // L1: Invoke onError hook on exception
    if (hookedProc._hooks?.onError) {
      hookedProc._hooks.onError(ctx, args, error);
    }
    return createInternalErrorResult(
      error instanceof Error ? error.message : String(error),
      route
    );
  }
};

// ============================================================
// L2: Middleware Chain Runner
// ============================================================

const runMiddlewareChain = <Ctx, Args, Output>(
  allMiddleware: readonly Middleware<Ctx>[],
  handlerCtx: HandlerContext<Ctx, EventRegistry>,
  args: Args,
  finalInvoke: () => Promise<Result<Output>>
): (() => Promise<Result<Output>>) => {
  let index = 0;

  const next = async (overrides?: { ctx?: Partial<Ctx> }): Promise<Result<Output>> => {
    const currentCtx = overrides?.ctx ? { ...handlerCtx, ...overrides.ctx } : handlerCtx;

    if (index >= allMiddleware.length) {
      return finalInvoke();
    }

    const mw = allMiddleware[index++];
    return mw.handler(currentCtx, {
      next: (innerOverrides?: { ctx?: Partial<Ctx> }) => next(innerOverrides),
      args,
      meta: {},
    }) as unknown as Promise<Result<Output>>;
  };

  return next;
};

// ============================================================
// L3: Execute Procedure (main orchestration)
// ============================================================

const executeProcedure = async <Ctx, Args, Output>(
  ctx: ExecuteProcedureContext<Ctx, Args, Output>
): Promise<Result<Output>> => {
  const { procedure, ctx: procedureCtx, args, middleware, eventEmitter, queue, route, plugins } = ctx;
  const handlerCtx = createHandlerContext(procedureCtx, queue, plugins);
  const hookedProc = procedure as unknown as ProcedureWithHooks<Ctx, Args, Output>;

  // L1: Validate args if schema exists
  if (hookedProc.argsSchema) {
    const parseResult = hookedProc.argsSchema.safeParse(args);
    if (!parseResult.success) {
      return validationFailed(route, parseResult.error.issues).mapErr((e) =>
        e.addNotes(`Validation failed for route: ${route}`)
      );
    }
  }

  const procedureMiddleware: readonly Middleware<Ctx>[] = hookedProc._middleware || [];
  const allMiddleware: readonly Middleware<Ctx>[] = [...middleware, ...procedureMiddleware];

  // L2: Final invoke function
  const finalInvoke = (): Promise<Result<Output>> =>
    executeProcedureWithHooks(
      handlerCtx,
      args,
      hookedProc,
      procedure,
      route,
      queue,
      eventEmitter
    );

  // L2: Run middleware chain
  const runChain = runMiddlewareChain(allMiddleware, handlerCtx, args, finalInvoke);

  try {
    return await runChain();
  } catch (error: unknown) {
    queue.clear();

    if (error instanceof ServerException) {
      return createServerErrorResult(error.code, error.message, route);
    }

    const errToReturn = error instanceof Error ? error : new Error(String(error));
    return createInternalErrorResult(errToReturn.message, route);
  }
};

// ============================================================
// Router Proxy Creation
// ============================================================

const createRouterProxy = <Ctx>(
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
          return () =>
            executeRoute(fullPath, undefined, routeCtx);
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

// ============================================================
// Route Execution
// ============================================================

const executeRoute = async <Ctx>(
  route: string,
  args: unknown,
  routeCtx: ExecuteRouteContext<Ctx>
): Promise<Result<unknown>> => {
  const { router, ctx, globalMiddleware, eventEmitter, queue, plugins } = routeCtx;
  const pathParts = splitRoutePath(route);
  const procedure = getProcedureFromPath(router, pathParts);

  if (!procedure) {
    return routeNotFound(route);
  }

  const procedureCtx: ExecuteProcedureContext<Ctx, unknown, unknown> = {
    procedure,
    ctx,
    args,
    middleware: globalMiddleware,
    eventEmitter,
    queue,
    route,
    plugins,
  };

  return executeProcedure(procedureCtx);
};

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

// ============================================================
// Public Router Filter
// ============================================================

const isQueryOrMutation = (procedure: unknown): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = (procedure as any).type;
  return type === "query" || type === "mutation";
};

const filterPublicRouter = <TRoutes extends Router<any, any>>(
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
