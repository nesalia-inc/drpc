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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouterProxy<Ctx, Routes extends Record<string, any>> = {
  readonly [K in keyof Routes]: Routes[K] extends Procedure<Ctx, infer Args, infer Output>
    ? ProcedureProxy<Ctx, Args, Output>
    : Routes[K] extends Record<string, any>
      // For nested routers, we use 'any' to bypass TypeScript's complex inference
      // The runtime Proxy handles this correctly anyway
      ? any
      : Routes[K];
};

// TypedAPIInstance - the full return type combining APIInstance properties with the router proxy
// Using any for intermediate properties to avoid TypeScript inference issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedAPIInstance<Ctx, TRoutes extends Record<string, any>> =
  APIInstance<Ctx, TRoutes> &
  RouterProxy<Ctx, TRoutes> & {
    [key: string]: any;
  };

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