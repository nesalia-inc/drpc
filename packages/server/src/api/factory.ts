import type { Result } from "@deessejs/fp";
import { err, error as errorFn, none } from "@deessejs/fp";
import { type Plugin, type Middleware, type Router, type Procedure, type SendOptions, type EventRegistry, type HandlerContext } from "../types.js";
import { createPendingEventQueue } from "../events/queue.js";
import { ServerException } from "../errors/server-error.js";
import { isRouter, isProcedure } from "../router/index.js";
import { type APIInstance, type RequestInfo, type EventEmitterAny } from "./types/api.js";
import { type TypedAPIInstance } from "./types/proxy.js";
import { type ProcedureWithHooks, type APIInstanceState } from "./types/internal.js";
import { routeNotFound, validationFailed, serverError, internalError } from "./errors.js";
/* eslint-disable unicorn/throw-new-error */

function createRouterProxy<Ctx>(
  router: Router<Ctx>,
  ctx: Ctx,
  globalMiddleware: readonly Middleware<Ctx>[],
  rootRouter: Router<Ctx>,
  eventEmitter: EventEmitterAny | undefined,
  queue: ReturnType<typeof createPendingEventQueue>,
  plugins: readonly Plugin<Ctx>[],
  path: readonly string[] = []
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
): any {
  /* eslint-disable @typescript-eslint/consistent-return */
  return new Proxy({}, {
    get(target: unknown, prop: string | symbol): unknown {
      if (prop === "then" || prop === "toJSON" || prop === "valueOf" || prop === Symbol.toStringTag) {
        return undefined;
      }
      if (typeof prop !== "string") {
        return none();
      }
      const value = (router as Record<string, unknown>)[prop];
      if (value === undefined) {
        return none();
      }
      if (isProcedure(value)) {
        const fullPath = [...path, prop].join(".");
        // If procedure has no argsSchema, return a no-args callable
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        if (!(value as any).argsSchema) {
          return () => executeRoute(rootRouter, ctx, globalMiddleware, fullPath, undefined, eventEmitter, queue, plugins);
        }
        return (args: unknown) => executeRoute(rootRouter, ctx, globalMiddleware, fullPath, args, eventEmitter, queue, plugins);
      }
      if (typeof value === "object" && value !== null) {
        return createRouterProxy(value as Router<Ctx>, ctx, globalMiddleware, rootRouter, eventEmitter, queue, plugins, [...path, prop]);
      }
      return none();
    },
  /* eslint-enable @typescript-eslint/consistent-return */
  });
}

async function executeRoute<Ctx>(
  router: Router<Ctx>,
  ctx: Ctx,
  globalMiddleware: readonly Middleware<Ctx>[],
  route: string,
  args: unknown,
  eventEmitter: EventEmitterAny | undefined,
  queue: ReturnType<typeof createPendingEventQueue>,
  plugins: readonly Plugin<Ctx>[]
): Promise<Result<unknown>> {
  const parts = route.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, unknown> = router as any;
  for (let i = 0; i < parts.length - 1; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current = current[parts[i]] as any;
    if (!current) {
      return routeNotFound(route);
    }
  }
  const procedure = current[parts.at(-1)!];
  if (!procedure || !isProcedure(procedure)) {
    return routeNotFound(route);
  }
  return executeProcedure(procedure, ctx, args, globalMiddleware, eventEmitter, queue, route, plugins);
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function applyPlugins<Ctx>(ctx: Ctx, plugins: readonly Plugin<Ctx>[]): Ctx {
  let extendedCtx = ctx;
  for (const plugin of plugins) {
    extendedCtx = { ...extendedCtx, ...plugin.extend(extendedCtx) } as Ctx;
  }
  return extendedCtx;
}

function createHandlerContext<Ctx, Events extends EventRegistry>(
  ctx: Ctx,
  queue: ReturnType<typeof createPendingEventQueue>,
  plugins: readonly Plugin<Ctx>[]
): HandlerContext<Ctx, Events> {
  const send = (name: keyof Events, data: Events[typeof name]["data"], options?: SendOptions): void => {
    queue.enqueue({
      name: name as string,
      data,
      timestamp: new Date().toISOString(),
      namespace: options?.namespace ?? "default",
      options,
    });
  };

  const extendedCtx = applyPlugins(ctx, plugins);

  return {
    ...(extendedCtx as object),
    send,
  } as HandlerContext<Ctx, Events>;
}

// Helper functions to reduce complexity in executeProcedure
async function invokeProcedureWithHooks<Ctx, Args, Output>(
  currentCtx: HandlerContext<Ctx, EventRegistry>,
  args: Args,
  hookedProc: ProcedureWithHooks<Ctx, Args, Output>,
  procedure: Procedure<Ctx, Args, Output>,
  route: string,
  queue: ReturnType<typeof createPendingEventQueue>,
  eventEmitter: EventEmitterAny | undefined
): Promise<Result<Output>> {
  if (hookedProc._hooks?.beforeInvoke) {
    await hookedProc._hooks.beforeInvoke(currentCtx, args);
  }
  try {
    const result = await procedure.handler(currentCtx, args);
    await invokeAfterInvokeHook(hookedProc, currentCtx, args, result);
    if (result.ok && hookedProc._hooks?.onSuccess) {
      await hookedProc._hooks.onSuccess(currentCtx, args, result.value);
    } else if (!result.ok && hookedProc._hooks?.onError) {
      await hookedProc._hooks.onError(currentCtx, args, result.error);
    }
    if (result.ok) {
      await queue.flush(eventEmitter);
    }
    return result;
  } catch (error) {
    return handleProcedureError(error, hookedProc, currentCtx, args, route);
  }
}

async function invokeAfterInvokeHook<Ctx, Args, Output>(
  hookedProc: ProcedureWithHooks<Ctx, Args, Output>,
  currentCtx: HandlerContext<Ctx, EventRegistry>,
  args: Args,
  result: Result<Output>
): Promise<void> {
  if (hookedProc._hooks?.afterInvoke) {
    await hookedProc._hooks.afterInvoke(currentCtx, args, result);
  }
}

async function handleProcedureError<Ctx, Args, Output>(
  error: unknown,
  hookedProc: ProcedureWithHooks<Ctx, Args, Output>,
  currentCtx: HandlerContext<Ctx, EventRegistry>,
  args: Args,
  route: string
): Promise<Result<Output>> {
  if (hookedProc._hooks?.onError) {
    await hookedProc._hooks.onError(currentCtx, args, error);
  }
  const errToReturn = error instanceof Error ? error : new Error(String(error));
  return internalError(errToReturn.message)
    .mapErr((e) =>
      e.addNotes(`Error in route: ${route}`).from(
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        errorFn({ name: "INTERNAL_ERROR", message: (_: unknown) => errToReturn.message })({
          message: errToReturn.message,
        })
      )
    );
}

async function executeProcedure<Ctx, Args, Output>(
  procedure: Procedure<Ctx, Args, Output>,
  ctx: Ctx,
  args: Args,
  middleware: readonly Middleware<Ctx>[],
  eventEmitter: EventEmitterAny | undefined,
  queue: ReturnType<typeof createPendingEventQueue>,
  route: string,
  plugins: readonly Plugin<Ctx>[]
): Promise<Result<Output>> {
  const handlerCtx = createHandlerContext(ctx, queue, plugins);
  const hookedProc = procedure as unknown as ProcedureWithHooks<Ctx, Args, Output>;

  // Validate args if schema exists
  if (hookedProc.argsSchema) {
    const parseResult = hookedProc.argsSchema.safeParse(args);
    if (!parseResult.success) {
      return validationFailed(route, parseResult.error.issues).mapErr((e) =>
        e.addNotes(`Validation failed for route: ${route}`)
      );
    }
  }

  const procedureMiddleware: readonly Middleware<Ctx>[] = hookedProc._middleware || [];
  const allMiddleware: Middleware<Ctx>[] = [...middleware, ...procedureMiddleware];

  try {
    let index = 0;
    const next = async (overrides?: { ctx?: Partial<Ctx> }): Promise<Result<Output>> => {
      const currentCtx = overrides?.ctx ? { ...handlerCtx, ...overrides.ctx } : handlerCtx;

      if (index >= allMiddleware.length) {
        return invokeProcedureWithHooks(currentCtx, args, hookedProc, procedure, route, queue, eventEmitter);
      }
      const mw = allMiddleware[index++];
      return mw.handler(currentCtx, {
        next: (innerOverrides?: { ctx?: Partial<Ctx> }) => next(innerOverrides),
        args,
        meta: {},
      }) as unknown as Result<Output>;
    };
    return await next();
  } catch (error: unknown) {
    queue.clear();
    if (error instanceof ServerException) {
      return serverError(error.code, error.message).mapErr((e) =>
        e.addNotes(`Route: ${route}`).from(
          errorFn({ name: error.code, message: (_: unknown) => error.message })({
            message: error.message,
          })
        )
      );
    }
    const errToReturn = error instanceof Error ? error : new Error(String(error));
    return internalError(errToReturn.message).mapErr((e) =>
      e.addNotes(`Unexpected error in route: ${route}`).from(
        errorFn({ name: "INTERNAL_ERROR", message: (_: unknown) => errToReturn.message })({
          message: errToReturn.message,
        })
      )
    );
  }
}

export function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: {
    router: TRoutes;
    context?: Ctx;
    createContext?: (requestInfo?: RequestInfo) => Ctx;
    plugins?: readonly Plugin<Ctx>[];
    middleware?: readonly Middleware<Ctx>[];
    eventEmitter?: EventEmitterAny;
  }
): TypedAPIInstance<Ctx, TRoutes> {
  const { router, context, createContext, plugins = [], middleware = [], eventEmitter } = config;
  const queue = createPendingEventQueue();

  const contextFactory = createContext ?? ((_requestInfo?: RequestInfo) => context as Ctx);

  const initialCtx = contextFactory();
  const state: APIInstanceState<Ctx, TRoutes> = {
    router,
    ctx: initialCtx,
    plugins,
    globalMiddleware: middleware,
    eventEmitter,
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const routerProxy = createRouterProxy(state.router, state.ctx, state.globalMiddleware, state.router, eventEmitter, queue, state.plugins) as any;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return new Proxy(state as any, {
    get(target, prop: string | symbol): unknown {
      if (prop === "router") return target.router;
      if (prop === "ctx") return target.ctx;
      if (prop === "plugins") return target.plugins;
      if (prop === "globalMiddleware") return target.globalMiddleware;
      if (prop === "eventEmitter") return target.eventEmitter;
      if (prop === "getEvents") return () => target.eventEmitter?.getEventLog() ?? [];
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return (routerProxy as any)[prop];
    },
  });
}

export function createPublicAPI<Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, PublicRouter<TRoutes>> {
  const publicRouter = filterPublicRouter(api.router);
  // Use original createContext if it exists, otherwise use a default that returns the context
  // Must use explicit check because createContext could be null (not just undefined)
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
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type PublicRouter<TRoutes extends Router<any, any>> = {
  [K in keyof TRoutes as TRoutes[K] extends Procedure<any, any, any>
    ? TRoutes[K] extends { type: "query" | "mutation" }
      ? K
      : never
    : K]: TRoutes[K] extends Router<any, any>
    ? PublicRouter<TRoutes[K]>
    : TRoutes[K];
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
function filterPublicRouter<TRoutes extends Router<any, any>>(router: TRoutes): PublicRouter<TRoutes> {
  const result: any = {};
  for (const key in router) {
    const value = (router as any)[key];
    if (isRouter(value)) {
      result[key] = filterPublicRouter(value);
    } else if (isProcedure(value)) {
      if ((value as any).type === "query" || (value as any).type === "mutation") {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
