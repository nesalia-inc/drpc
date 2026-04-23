import type { Result } from "@deessejs/fp";
import type { Router, Procedure } from "../../types.js";
import type { APIInstance } from "./api.js";
export type ProcedureProxy<Ctx, Args, Output> = [Args] extends [never] ? () => Promise<Result<Output>> : (args: Args) => Promise<Result<Output>>;
export type RouterProxy<Ctx, Routes extends Router<Ctx, any>> = {
    readonly [K in keyof Routes]: Routes[K] extends Procedure<Ctx, infer Args, infer Output> ? ProcedureProxy<Ctx, Args, Output> : Routes[K] extends Router<Ctx, any> ? RouterProxy<Ctx, Routes[K]> : Routes[K];
};
export type TypedAPIInstance<Ctx, TRoutes extends Router<Ctx, any>> = APIInstance<Ctx, TRoutes> & RouterProxy<Ctx, TRoutes>;
export type PublicRouter<TRoutes extends Router<any, any>> = {
    readonly [K in keyof TRoutes as TRoutes[K] extends Procedure<any, any, any> ? TRoutes[K] extends {
        type: "query" | "mutation";
    } ? K : never : K]: TRoutes[K] extends Router<any, any> ? PublicRouter<TRoutes[K]> : TRoutes[K];
};
//# sourceMappingURL=proxy.d.ts.map