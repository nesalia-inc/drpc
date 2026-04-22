import type { Result } from "@deessejs/fp";
import type { Middleware, Plugin, Router, Procedure, EventRegistry, HandlerContext } from "../types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Procedure augmented with internal hooks and metadata (used internally in API execution)
export interface ProcedureWithHooks<Ctx, Args, Output> {
  readonly argsSchema?: Procedure<Ctx, Args, Output>["argsSchema"];
  readonly _middleware?: Middleware<Ctx>[];
  readonly _hooks?: {
    beforeInvoke?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args) => void | Promise<void>;
    afterInvoke?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args, result: Result<Output>) => void | Promise<void>;
    onSuccess?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args, data: Output) => void | Promise<void>;
    onError?: (ctx: HandlerContext<Ctx, EventRegistry>, args: Args, error: unknown) => void | Promise<void>;
  };
  readonly type: Procedure<Ctx, Args, Output>["type"];
  readonly handler: Procedure<Ctx, Args, Output>["handler"];
}

// Internal state for API instance
export interface APIInstanceState<Ctx, TRoutes extends Router<Ctx>> {
  router: TRoutes;
  ctx: Ctx;
  plugins: Plugin<Ctx>[];
  globalMiddleware: Middleware<Ctx>[];
  eventEmitter?: import("./types.js").EventEmitterAny;
}
