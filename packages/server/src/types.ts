import { type ZodType } from "zod";
import { type Result } from "@deessejs/fp";

export type { Result } from "@deessejs/fp";

export type ProcedureType = "query" | "mutation" | "internalQuery" | "internalMutation";

// ============================================
// Procedure definition with _def (like tRPC)
// ============================================

export interface ProcedureDef<Ctx, Args, Output> {
  readonly type: ProcedureType;
  readonly $types: {
    readonly input: Args;
    readonly output: Output;
  };
  readonly argsSchema?: ZodType<Args>;
  readonly handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
  readonly name?: string;
  readonly metadata?: Record<string | symbol, unknown>;
}

// All procedure types are now a single interface with _def
export interface AnyProcedure<Ctx = unknown, Args = unknown, Output = unknown> {
  readonly _def: ProcedureDef<Ctx, Args, Output>;
  readonly type: ProcedureType;
  readonly argsSchema?: ZodType<Args>;
  readonly handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
  // Hook methods
  readonly beforeInvoke: (hook: BeforeInvokeHook<Ctx, Args>) => AnyProcedure<Ctx, Args, Output>;
  readonly afterInvoke: (hook: AfterInvokeHook<Ctx, Args, Output>) => AnyProcedure<Ctx, Args, Output>;
  readonly onSuccess: (hook: OnSuccessHook<Ctx, Args, Output>) => AnyProcedure<Ctx, Args, Output>;
  readonly onError: (hook: OnErrorHook<Ctx, Args, Error>) => AnyProcedure<Ctx, Args, Output>;
  readonly use: (middleware: Middleware<Ctx>) => AnyProcedure<Ctx, Args, Output>;
  // Internal state
  readonly _hooks: {
    beforeInvoke?: BeforeInvokeHook<Ctx, Args>;
    afterInvoke?: AfterInvokeHook<Ctx, Args, Output>;
    onSuccess?: OnSuccessHook<Ctx, Args, Output>;
    onError?: OnErrorHook<Ctx, Args, Error>;
  };
  readonly _middleware: Middleware<Ctx>[];
}

// Type aliases for backward compatibility
export type Query<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;
export type Mutation<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;
export type InternalQuery<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;
export type InternalMutation<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;

// Convenience type for procedures without args
export type NoArgsProcedure<Ctx, Output> = AnyProcedure<Ctx, undefined, Output>;

// Backward compatible Procedure type alias
export type Procedure<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;

// ============================================
// Other types (unchanged)
// ============================================

export type BeforeInvokeHook<Ctx, Args> = (ctx: Ctx, args: Args) => void | Promise<void>;

export type AfterInvokeHook<Ctx, Args, Output> = (
  ctx: Ctx,
  args: Args,
  result: Result<Output>
) => void | Promise<void>;

export type OnSuccessHook<Ctx, Args, Output> = (ctx: Ctx, args: Args, data: Output) => void | Promise<void>;

export type OnErrorHook<Ctx, Args, Error> = (ctx: Ctx, args: Args, error: Error) => void | Promise<void>;

export interface Middleware<Ctx, Args = unknown> {
  readonly name: string;
  readonly args?: Args;
  readonly handler: (
    ctx: Ctx,
    opts: {
      next: (overrides?: { ctx?: Partial<Ctx> }) => Promise<Result<unknown>>;
      args: Args;
      meta: Record<string, unknown>;
    }
  ) => Promise<Result<unknown>>;
}

export interface Plugin<Ctx> {
  readonly name: string;
  readonly extend: (ctx: Ctx) => Partial<Ctx>;
  readonly procedures?: () => PluginEnrichment<Ctx>;
}

/**
 * PluginEnrichment describes how a plugin adds new methods to the t object.
 * Each namespace contains methods that create procedures.
 */
export type PluginEnrichment<Ctx> = {
  [namespace: string]: {
    [methodName: string]: (config: {
      name?: string;
      args?: ZodType<unknown>;
      handler: (ctx: Ctx, args: unknown) => Promise<Result<unknown>>;
      metadata?: Record<string | symbol, unknown>;
    }) => AnyProcedure<Ctx, unknown, unknown>;
  };
};

// Router type - recursively maps routes using non-distributive conditionals
// Uses [T] instead of T to prevent distribution over union types
export type Router<Ctx = unknown, Routes extends Record<string, any> = Record<string, any>> = {
  [K in keyof Routes & string]: [Routes[K]] extends [{ type: string }]
    ? Routes[K]
    : [Routes[K]] extends [Record<string, any>]
      ? Router<Ctx, Routes[K]>
      : never;
} & Record<string, any>;

export interface EventRegistry {
  [eventName: string]: {
    data?: unknown;
    response?: unknown;
  };
}

export interface EventPayload<T = unknown> {
  name: string;
  data: T;
  timestamp: string;
  namespace: string;
  source?: string;
}

export interface SendOptions {
  namespace?: string;
  broadcast?: boolean;
  delay?: number;
}

export interface PendingEvent {
  name: string;
  data: unknown;
  timestamp: string;
  namespace: string;
  options?: SendOptions;
}

export interface ContextWithSend<Ctx, Events extends EventRegistry> {
  ctx: Ctx;
  send: <EventName extends keyof Events>(
    event: EventName,
    data: Events[EventName]["data"]
  ) => void;
}

export type HandlerContext<Ctx, Events extends EventRegistry> = Ctx & {
  send: <EventName extends keyof Events>(
    event: EventName,
    data: Events[EventName]["data"]
  ) => void;
};