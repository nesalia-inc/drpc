import { type ZodType } from "zod";
import { type Result } from "@deessejs/fp";
import { type AnyProcedure, type ProcedureType, type BeforeInvokeHook, type AfterInvokeHook, type OnSuccessHook, type OnErrorHook, type Middleware, type ProcedureDef } from "../types.js";

export interface QueryConfig<Ctx, Args, Output> {
  args?: ZodType<Args>;
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
}

export interface MutationConfig<Ctx, Args, Output> {
  args?: ZodType<Args>;
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
}

export interface InternalQueryConfig<Ctx, Output> {
  handler: (ctx: Ctx) => Promise<Result<Output>>;
}

export interface InternalMutationConfig<Ctx, Args, Output> {
  args?: ZodType<Args>;
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
}

// Factory functions
export function createQuery<Ctx, Args, Output>(
  config: QueryConfig<Ctx, Args, Output>
): AnyProcedure<Ctx, Args, Output> {
  return createAnyProcedure("query", config.args, config.handler);
}

export function createMutation<Ctx, Args, Output>(
  config: MutationConfig<Ctx, Args, Output>
): AnyProcedure<Ctx, Args, Output> {
  return createAnyProcedure("mutation", config.args, config.handler);
}

export function createInternalQuery<Ctx, Output>(
  config: InternalQueryConfig<Ctx, Output>
): AnyProcedure<Ctx, undefined, Output> {
  return createAnyProcedure("internalQuery", undefined, config.handler as any);
}

export function createInternalMutation<Ctx, Args, Output>(
  config: InternalMutationConfig<Ctx, Args, Output>
): AnyProcedure<Ctx, Args, Output> {
  return createAnyProcedure("internalMutation", config.args, config.handler);
}

// Internal helper
function createAnyProcedure<Ctx, Args, Output>(
  type: ProcedureType,
  argsSchema: ZodType<Args> | undefined,
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>
): AnyProcedure<Ctx, Args, Output> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    _def: {
      type,
      $types: {
        input: argsSchema as unknown as Args,
        output: undefined as unknown as Output,
      },
      argsSchema,
      handler: handler as any,
    },
    type,
    argsSchema,
    handler: handler as any,
    beforeInvoke: function(hook: BeforeInvokeHook<Ctx, Args>) { return this; },
    afterInvoke: function(hook: AfterInvokeHook<Ctx, Args, Output>) { return this; },
    onSuccess: function(hook: OnSuccessHook<Ctx, Args, Output>) { return this; },
    onError: function(hook: OnErrorHook<Ctx, Args, any>) { return this; },
    use: function(middleware: Middleware<Ctx>) { return this; },
    _hooks: {},
    _middleware: [],
  } as unknown as AnyProcedure<Ctx, Args, Output>;
}

// Backward compatibility - keep QueryWithHooks as alias
export type QueryWithHooks<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;
export type MutationWithHooks<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;
export type InternalQueryWithHooks<Ctx, Output> = AnyProcedure<Ctx, undefined, Output>;
export type InternalMutationWithHooks<Ctx, Args, Output> = AnyProcedure<Ctx, Args, Output>;

// ============================================
// createProcedure - DSL for plugins
// ============================================

export interface CreateProcedureConfig<Ctx, Args, Output> {
  name?: string;
  args?: ZodType<Args>;
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
  metadata?: Record<string | symbol, unknown>;
}

/**
 * Factory function for creating procedures from plugins.
 * Takes a procedure type and configuration, returns an AnyProcedure.
 */
export function createProcedure<Ctx, Args, Output>(
  type: ProcedureType,
  config: CreateProcedureConfig<Ctx, Args, Output>
): AnyProcedure<Ctx, Args, Output> {
  const def: ProcedureDef<Ctx, Args, Output> = {
    type,
    $types: {
      input: config.args as unknown as Args,
      output: undefined as unknown as Output,
    },
    argsSchema: config.args,
    handler: config.handler as (ctx: Ctx, args: Args) => Promise<Result<Output>>,
    name: config.name,
    metadata: config.metadata,
  };

  return {
    _def: def,
    type,
    argsSchema: config.args,
    handler: config.handler as (ctx: Ctx, args: Args) => Promise<Result<Output>>,
    beforeInvoke: function(hook: BeforeInvokeHook<Ctx, Args>) { return this; },
    afterInvoke: function(hook: AfterInvokeHook<Ctx, Args, Output>) { return this; },
    onSuccess: function(hook: OnSuccessHook<Ctx, Args, Output>) { return this; },
    onError: function(hook: OnErrorHook<Ctx, Args, any>) { return this; },
    use: function(middleware: Middleware<Ctx>) { return this; },
    _hooks: {},
    _middleware: [],
  } as unknown as AnyProcedure<Ctx, Args, Output>;
}
