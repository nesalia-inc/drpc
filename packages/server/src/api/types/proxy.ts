import  { type Result } from "@deessejs/fp";
import  { type Router, type Procedure } from "../../types.js";
import  { type APIInstance } from "./api.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ProcedureProxy - a callable procedure with typed args and output
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ProcedureProxy<Ctx, Args, Output> = [Args] extends [never]
  ? () => Promise<Result<Output>>
  : (args: Args) => Promise<Result<Output>>;

// RouterProxy - recursively maps routes to typed proxies
export type RouterProxy<Ctx, Routes extends Router<Ctx, any>> = {
  readonly [K in keyof Routes]: Routes[K] extends Procedure<Ctx, infer Args, infer Output>
    ? ProcedureProxy<Ctx, Args, Output>
    : Routes[K] extends Router<Ctx, any>
      ? RouterProxy<Ctx, Routes[K]>
      : Routes[K];
};

// TypedAPIInstance - the full return type combining APIInstance properties with the router proxy
export type TypedAPIInstance<Ctx, TRoutes extends Router<Ctx, any>> = APIInstance<Ctx, TRoutes> & RouterProxy<Ctx, TRoutes>;

// PublicRouter - filters out internal queries and mutations from router type
export type PublicRouter<TRoutes extends Router<any, any>> = {
  readonly [K in keyof TRoutes as [TRoutes[K]] extends [Procedure<any, any, any>]
    ? [TRoutes[K]] extends [{ type: "query" | "mutation" }]
      ? K
      : never
    : K]: [TRoutes[K]] extends [Router<any, any>]
    ? PublicRouter<TRoutes[K]>
    : TRoutes[K];
};
