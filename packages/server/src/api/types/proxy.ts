import { type Result } from "@deessejs/fp";
import { type AnyProcedure, type Router, type Procedure, type Plugin } from "../../types.js";
import { type EventEmitterAny } from "./api.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// Symbol for internal API access
// ============================================

export const apiInternalSymbol = Symbol.for("deesse.api.internal");

// ============================================
// Helper types for extracting procedure types
// ============================================

// Extract input type from procedure using _def.$types
export type InferArgs<T> = T extends { _def: { $types: { input: infer I } } } ? I : never;

// Extract output type from procedure using _def.$types
export type InferOutput<T> = T extends { _def: { $types: { output: infer O } } } ? O : never;

// ============================================
// DecoratedProcedure - callable procedure proxy with proper input/output types
// Uses structural constraint instead of requiring exact AnyProcedure type
// ============================================

export type DecoratedProcedure<TProc> =
  [InferArgs<TProc>] extends [never]
    ? () => Promise<Result<InferOutput<TProc>>>
    : (args: InferArgs<TProc>) => Promise<Result<InferOutput<TProc>>>;

// ============================================
// DecoratedRouter - recursive router decoration (THE KEY TYPE)
// Uses direct recursion without 'any' - no intersection, no APIInstance
// ============================================

export type DecoratedRouter<TRoutes extends Record<string, any>, Ctx = any> = {
  [K in keyof TRoutes]: [TRoutes[K]] extends [AnyProcedure<Ctx>]
    ? DecoratedProcedure<TRoutes[K]>  // Procedure -> callable proxy
    : [TRoutes[K]] extends [Record<string, any>]
      ? DecoratedRouter<TRoutes[K], Ctx>  // Nested router -> recurse DIRECTLY!
      : never;
};

// ============================================
// TypedAPIInstance - final type using symbol for internal access
// Uses DecoratedRouter directly as mapped type (preserves exact keys via [K in keyof TRoutes])
// Symbol key for internals - no index signature that creates union
// ============================================

export type TypedAPIInstance<Ctx, TRoutes extends Record<string, any>> =
  DecoratedRouter<TRoutes, Ctx> & {
    readonly [apiInternalSymbol]: {
      router: TRoutes;
      ctx: Ctx;
      plugins: readonly Plugin<Ctx>[];
      eventEmitter?: EventEmitterAny;
    };
  };

// ============================================
// PublicRouter - filters out internal queries and mutations from router type
// ============================================

export type PublicRouter<TRoutes extends Router<any, any>> = {
  readonly [K in keyof TRoutes as [TRoutes[K]] extends [Procedure<any, any, any>]
    ? [TRoutes[K]] extends [{ type: "query" | "mutation" }]
      ? K
      : never
    : K]: [TRoutes[K]] extends [Router<any, any>]
    ? PublicRouter<TRoutes[K]>
    : TRoutes[K];
};