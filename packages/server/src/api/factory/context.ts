import type { Middleware, Plugin, Router, Procedure } from "../../types.js";
import type { EventEmitterAny } from "../types/api.js";
import { createPendingEventQueue } from "../../events/queue.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Context objects to reduce parameters to max 3

export type RouterProxyContext<Ctx> = {
  readonly router: Router<Ctx>;
  readonly ctx: Ctx;
  readonly globalMiddleware: readonly Middleware<Ctx>[];
  readonly rootRouter: Router<Ctx>;
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: ReturnType<typeof createPendingEventQueue>;
  readonly plugins: readonly Plugin<Ctx>[];
};

export type ExecuteRouteContext<Ctx> = {
  readonly router: Router<Ctx>;
  readonly ctx: Ctx;
  readonly globalMiddleware: readonly Middleware<Ctx>[];
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: ReturnType<typeof createPendingEventQueue>;
  readonly plugins: readonly Plugin<Ctx>[];
};

export type ExecuteProcedureContext<Ctx, Args, Output> = {
  readonly procedure: Procedure<Ctx, Args, Output>;
  readonly ctx: Ctx;
  readonly args: Args;
  readonly middleware: readonly Middleware<Ctx>[];
  readonly eventEmitter: EventEmitterAny | undefined;
  readonly queue: ReturnType<typeof createPendingEventQueue>;
  readonly route: string;
  readonly plugins: readonly Plugin<Ctx>[];
};
