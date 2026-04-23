import  { type EventEmitter } from "../../events/emitter.js";
import  { type Router } from "../../types.js";
import  { type Plugin, type Middleware } from "../../types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type EventEmitterAny = EventEmitter<any>;

export type RequestInfo = Readonly<{
  headers?: Record<string, string>;
  method?: string;
  url?: string;
  [key: string]: unknown;
}>;

export type APIInstance<Ctx, TRoutes = Router<Ctx, any>> = Readonly<{
  router: TRoutes;
  ctx: Ctx;
  plugins: readonly Plugin<Ctx>[];
  globalMiddleware: readonly Middleware<Ctx>[];
  eventEmitter?: EventEmitterAny;
}>;

export type APIConfig<TRoutes extends Router<unknown, any>> = Readonly<{
  router: TRoutes;
  context?: unknown;
  /**
   * Factory function to create context per request.
   * Receives optional RequestInfo (headers, method, url) for per-request context enrichment.
   */
  createContext?: (requestInfo?: RequestInfo) => unknown;
  plugins: readonly Plugin<unknown>[];
  middleware: readonly Middleware<unknown>[];
  eventEmitter?: EventEmitterAny;
}>;
