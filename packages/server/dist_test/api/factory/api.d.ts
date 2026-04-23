import type { Middleware, Plugin, Router } from "../../types.js";
import type { APIInstance, RequestInfo, EventEmitterAny } from "../types/api.js";
import type { TypedAPIInstance, PublicRouter } from "../types/proxy.js";
/**
 * Filters a router to only include public queries and mutations.
 * Internal procedures and unknown types are explicitly excluded.
 */
export declare const filterPublicRouter: <TRoutes extends Router<any, any>>(router: TRoutes) => PublicRouter<TRoutes>;
export declare const createAPI: <Ctx, TRoutes extends Router<Ctx>>(config: {
    readonly router: TRoutes;
    readonly context?: Ctx;
    readonly createContext?: (requestInfo?: RequestInfo) => Ctx;
    readonly plugins?: readonly Plugin<Ctx>[];
    readonly middleware?: readonly Middleware<Ctx>[];
    readonly eventEmitter?: EventEmitterAny;
}) => TypedAPIInstance<Ctx, TRoutes>;
/**
 * Creates a public-only view of an API by filtering out internal procedures.
 * Shares the same queue and event emitter for efficiency.
 */
export declare const createPublicAPI: <Ctx, TRoutes extends Router<Ctx>>(api: APIInstance<Ctx, TRoutes>) => APIInstance<Ctx, PublicRouter<TRoutes>>;
//# sourceMappingURL=api.d.ts.map