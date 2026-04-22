import type { Result } from "@deessejs/fp";
import type { Middleware, Plugin, Router, Procedure, EventRegistry, HandlerContext } from "../../types.js";
import type { EventEmitterAny } from "./api.js";
import type { EventQueue } from "../../events/queue.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Procedure augmented with internal hooks and metadata (used internally in API execution)
export type ProcedureWithHooks<Ctx, Args, Output> = Readonly<{
  argsSchema?: Procedure<Ctx, Args, Output>["argsSchema"];
  _middleware?: readonly Middleware<Ctx>[];
  _hooks?: Readonly<{
    beforeInvoke?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args) => void | Promise<void>;
    afterInvoke?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args, result: Result<Output>) => void | Promise<void>;
    onSuccess?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args, data: Output) => void | Promise<void>;
    onError?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args, error: unknown) => void | Promise<void>;
  }>;
  readonly type: Procedure<Ctx, Args, Output>["type"];
  readonly handler: Procedure<Ctx, Args, Output>["handler"];
}>;

// Internal state for API instance
export type APIInstanceState<Ctx, TRoutes extends Router<Ctx>> = Readonly<{
  router: TRoutes;
  ctx: Ctx;
  plugins: readonly Plugin<Ctx>[];
  globalMiddleware: readonly Middleware<Ctx>[];
  eventEmitter?: EventEmitterAny;
}>;

// Context objects to reduce parameters to max 3
export type RouterProxyContext<Ctx> = Readonly<{
  readonly router: Router<Ctx>;
  readonly ctx: Ctx;
  readonly globalMiddleware: readonly Middleware<Ctx>[];
  readonly rootRouter: Router<Ctx>;
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: EventQueue;
  readonly plugins: readonly Plugin<Ctx>[];
}>;

export type ExecuteRouteContext<Ctx> = Readonly<{
  readonly router: Router<Ctx>;
  readonly ctx: Ctx;
  readonly globalMiddleware: readonly Middleware<Ctx>[];
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: EventQueue;
  readonly plugins: readonly Plugin<Ctx>[];
}>;

export type ExecuteProcedureContext<Ctx, Args, Output> = Readonly<{
  readonly procedure: Procedure<Ctx, Args, Output>;
  readonly ctx: Ctx;
  readonly args: Args;
  readonly middleware: readonly Middleware<Ctx>[];
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: EventQueue;
  readonly route: string;
  readonly plugins: readonly Plugin<Ctx>[];
}>;
