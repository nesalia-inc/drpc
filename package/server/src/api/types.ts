import type { Plugin, Middleware, Router, Procedure } from "../types.js";
import type { EventEmitter } from "../events/emitter.js";

export interface APIInstance<Ctx, TRoutes = Router<Ctx>> {
  readonly router: TRoutes;
  readonly ctx: Ctx;
  readonly plugins: Plugin<Ctx>[];
  readonly globalMiddleware: Middleware<Ctx>[];

  execute(route: string, args: unknown): Promise<import("@deessejs/fp").Result<unknown>>;
  executeRaw(route: string, args: unknown): Promise<import("@deessejs/fp").Result<unknown>>;
}

export interface LocalExecutor<Ctx> {
  execute(route: string, args: unknown): Promise<import("@deessejs/fp").Result<unknown>>;
  getEvents(): any[];
}

export interface APIConfig<Ctx, TRoutes extends Router<Ctx>> {
  router: TRoutes;
  context: Ctx;
  plugins: Plugin<Ctx>[];
  middleware: Middleware<Ctx>[];
  eventEmitter?: EventEmitter<any>;
}