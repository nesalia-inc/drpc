import type { Result } from "@deessejs/fp";
import type { Plugin, Middleware, Router, Procedure, SendOptions, EventRegistry, HandlerContext } from "../types.js";
import { EventEmitter } from "../events/emitter.js";
import { createPendingEventQueue } from "../events/queue.js";
import { createErrorResult, ServerException } from "../errors/server-error.js";
import { isRouter, isProcedure } from "../router/index.js";
import type { APIInstance, TypedAPIInstance, RequestInfo } from "./types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface APIInstanceState<Ctx, TRoutes extends Router<Ctx>> {
  router: TRoutes;
  ctx: Ctx;
  plugins: Plugin<Ctx>[];
  globalMiddleware: Middleware<Ctx>[];
  eventEmitter?: EventEmitter<any>;
  executeRaw(route: string, args: unknown): Promise<Result<unknown>>;
  execute(route: string, args: unknown): Promise<Result<unknown>>;
}

function createRouterProxy<Ctx>(
  router: Router<Ctx>,
  ctx: Ctx,
  globalMiddleware: Middleware<Ctx>[],
  rootRouter: Router<Ctx>,
  eventEmitter: EventEmitter<any> | undefined,
  queue: ReturnType<typeof createPendingEventQueue>,
  path: string[] = []
): any {
  return new Proxy({}, {
    get(target: unknown, prop: string | symbol): unknown {
      if (prop === "then" || prop === "toJSON" || prop === "valueOf" || prop === Symbol.toStringTag) {
        return undefined;
      }
      if (typeof prop !== "string") {
        return undefined;
      }
      const value = (router as any)[prop];
      if (value === undefined) {
        return undefined;
      }
      if (isProcedure(value)) {
        const fullPath = [...path, prop].join(".");
        return (args: unknown) => executeRoute(rootRouter, ctx, globalMiddleware, fullPath, args, eventEmitter, queue);
      }
      if (typeof value === "object" && value !== null) {
        return createRouterProxy(value as Router<Ctx>, ctx, globalMiddleware, rootRouter, eventEmitter, queue, [...path, prop]);
      }
      return undefined;
    },
  });
}

async function executeRoute<Ctx>(
  router: Router<Ctx>,
  ctx: Ctx,
  globalMiddleware: Middleware<Ctx>[],
  route: string,
  args: unknown,
  eventEmitter: EventEmitter<any> | undefined,
  queue: ReturnType<typeof createPendingEventQueue>
): Promise<Result<unknown>> {
  const parts = route.split(".");
  let current: any = router;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
    if (!current) {
      return createErrorResult("ROUTE_NOT_FOUND", `Route not found: ${route}`);
    }
  }
  const procedure = current[parts[parts.length - 1]];
  if (!procedure || !isProcedure(procedure)) {
    return createErrorResult("ROUTE_NOT_FOUND", `Route not found: ${route}`);
  }
  return executeProcedure(procedure, ctx, args, globalMiddleware, eventEmitter, queue);
}

interface SendFunction<Events extends EventRegistry> {
  <Name extends keyof Events>(name: Name, data: Events[Name]["data"], options?: SendOptions): { eventName: Name; data: Events[Name]["data"]; processed: boolean; timestamp: string; namespace: string };
}

function createHandlerContext<Ctx, Events extends EventRegistry>(
  ctx: Ctx,
  queue: ReturnType<typeof createPendingEventQueue>
): HandlerContext<Ctx, Events> {
  const send: SendFunction<Events> = (name, data, options?: SendOptions) => {
    return queue.enqueue({
      name: name as string,
      data,
      timestamp: new Date().toISOString(),
      namespace: options?.namespace ?? "default",
      options,
    }) as { eventName: typeof name; data: typeof data; processed: boolean; timestamp: string; namespace: string };
  };

  return {
    ...(ctx as object),
    send,
  } as HandlerContext<Ctx, Events>;
}

async function executeProcedure<Ctx, Args, Output>(
  procedure: Procedure<Ctx, Args, Output>,
  ctx: Ctx,
  args: Args,
  middleware: Middleware<Ctx>[],
  eventEmitter: EventEmitter<any> | undefined,
  queue: ReturnType<typeof createPendingEventQueue>
): Promise<Result<Output>> {
  // Create handler context with send function
  const handlerCtx = createHandlerContext(ctx, queue);

  // Validate args if schema is defined
  const hookedProc = procedure as any;
  if (hookedProc.argsSchema) {
    const parseResult = hookedProc.argsSchema.safeParse(args);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e: any) => `${e.path.join(".")}: ${e.message}`);
      return createErrorResult("VALIDATION_ERROR", errors.join(", "));
    }
    args = parseResult.data;
  }

  // Extract per-procedure middleware and combine with global middleware
  // Per-procedure middleware runs AFTER global middleware (as per design doc)
  const procedureMiddleware: Middleware<Ctx>[] = hookedProc._middleware || [];
  const allMiddleware: Middleware<Ctx>[] = [...middleware, ...procedureMiddleware];

  try {
    let index = 0;
    const next = async (overrides?: { ctx?: Partial<Ctx> }): Promise<Result<Output>> => {
      // Merge context if overrides provided
      const currentCtx = overrides?.ctx ? { ...handlerCtx, ...overrides.ctx } : handlerCtx;

      if (index >= allMiddleware.length) {
        // No more middleware, execute procedure handler
        if (hookedProc._hooks?.beforeInvoke) {
          await hookedProc._hooks.beforeInvoke(currentCtx, args);
        }
        try {
          const result = await procedure.handler(currentCtx, args);
          if (hookedProc._hooks?.afterInvoke) {
            await hookedProc._hooks.afterInvoke(currentCtx, args, result);
          }
          if (result.ok && hookedProc._hooks?.onSuccess) {
            await hookedProc._hooks.onSuccess(currentCtx, args, result.value);
          } else if (!result.ok && hookedProc._hooks?.onError) {
            await hookedProc._hooks.onError(currentCtx, args, result.error);
          }
          // Only emit events if handler succeeded
          if (result.ok) {
            await queue.flush(eventEmitter);
          }
          return result;
        } catch (error) {
          if (hookedProc._hooks?.onError) {
            await hookedProc._hooks.onError(currentCtx, args, error);
          }
          throw error;
        }
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
    // On error, discard pending events (don't emit them)
    queue.clear();
    if (error instanceof ServerException) {
      return createErrorResult(error.code, error.message, error.args?.data);
    }
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return createErrorResult("INTERNAL_ERROR", errorMessage);
  }
}

export function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: {
    router: TRoutes;
    context?: Ctx;
    createContext?: (requestInfo?: RequestInfo) => Ctx;
    plugins?: Plugin<Ctx>[];
    middleware?: Middleware<Ctx>[];
    eventEmitter?: EventEmitter<any>;
  }
): TypedAPIInstance<Ctx, TRoutes> {
  const { router, context, createContext, plugins = [], middleware = [], eventEmitter } = config;
  const queue = createPendingEventQueue();

  // Resolve context factory - createContext takes precedence over static context
  // Both factories accept optional RequestInfo for per-request context enrichment
  const contextFactory = createContext ?? ((_requestInfo?: RequestInfo) => context as Ctx);

  const executeRawInternal = (route: string, args: unknown, ctx: Ctx): Promise<Result<unknown>> => {
    return executeRoute(router, ctx, middleware, route, args, eventEmitter, queue);
  };

  const execute = async (route: string, args: unknown, requestInfo?: RequestInfo): Promise<Result<unknown>> => {
    const ctx = contextFactory(requestInfo); // Fresh context per request, with optional request info
    return executeRawInternal(route, args, ctx);
  };

  const executeRaw = async (route: string, args: unknown, requestInfo?: RequestInfo): Promise<Result<unknown>> => {
    const ctx = contextFactory(requestInfo); // Fresh context per request, with optional request info
    return executeRawInternal(route, args, ctx);
  };

  const initialCtx = contextFactory();
  const state: APIInstanceState<Ctx, TRoutes> = {
    router,
    ctx: initialCtx,
    plugins,
    globalMiddleware: middleware,
    eventEmitter,
    executeRaw,
    execute,
  };

  const routerProxy = createRouterProxy(state.router, state.ctx, state.globalMiddleware, state.router, eventEmitter, queue) as any;
  return new Proxy(state as any, {
    get(target, prop: string | symbol): unknown {
      if (prop === "router") return target.router;
      if (prop === "ctx") return target.ctx;
      if (prop === "plugins") return target.plugins;
      if (prop === "globalMiddleware") return target.globalMiddleware;
      if (prop === "eventEmitter") return target.eventEmitter;
      if (prop === "execute") return target.execute.bind(target);
      if (prop === "executeRaw") return target.executeRaw.bind(target);
      if (prop === "getEvents") return () => target.eventEmitter?.getEventLog() ?? [];
      return (routerProxy as any)[prop];
    },
  });
}

export function createPublicAPI<Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, PublicRouter<TRoutes>> {
  const publicRouter = filterPublicRouter(api.router);
  // Try to get createContext from the API instance if available
  const createContext = (api as any).createContext;
  return createAPI({
    router: publicRouter as any,
    context: api.ctx,
    createContext: createContext,
    plugins: api.plugins,
    middleware: api.globalMiddleware,
  }) as any;
}

type PublicRouter<TRoutes extends Router<any, any>> = {
  [K in keyof TRoutes as TRoutes[K] extends Procedure<any, any, any>
    ? TRoutes[K] extends { type: "query" | "mutation" }
      ? K
      : never
    : K]: TRoutes[K] extends Router<any, any>
    ? PublicRouter<TRoutes[K]>
    : TRoutes[K];
};

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