import type { ZodType } from "zod";
import type { Result } from "@deessejs/fp";
import type {
  Middleware,
  Router,
  BeforeInvokeHook,
  AfterInvokeHook,
  OnSuccessHook,
  OnErrorHook,
  EventRegistry,
} from "../types.js";
import type { QueryConfig, QueryWithHooks } from "./types.js";
import type { MutationConfig } from "../mutation/types.js";
import type { MutationWithHooks } from "../mutation/builder.js";
import type { InternalQueryConfig } from "../internal-query/types.js";
import type { InternalQueryWithHooks } from "../internal-query/builder.js";
import type { InternalMutationConfig } from "../internal-mutation/types.js";
import type { InternalMutationWithHooks } from "../internal-mutation/builder.js";
import type { EventEmitter } from "../events/emitter.js";

export class QueryBuilder<Ctx> {
  constructor(
    private context: Ctx,
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private eventEmitter?: EventEmitter<any>
    /* eslint-enable @typescript-eslint/no-explicit-any */
  ) {}

  query<Args, Output>(config: QueryConfig<Ctx, Args, Output>): QueryWithHooks<Ctx, Args, Output> {
    return createHookedProcedure({
      type: "query",
      argsSchema: config.args,
      handler: config.handler,
    }) as QueryWithHooks<Ctx, Args, Output>;
  }

  mutation<Args, Output>(config: MutationConfig<Ctx, Args, Output>): MutationWithHooks<Ctx, Args, Output> {
    return createHookedProcedure({
      type: "mutation",
      argsSchema: config.args,
      handler: config.handler,
    }) as MutationWithHooks<Ctx, Args, Output>;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  internalQuery<Output>(config: InternalQueryConfig<Ctx, Output>): InternalQueryWithHooks<Ctx, Output> {
    return createHookedProcedure({
      type: "internalQuery",
      handler: config.handler as any,
    }) as InternalQueryWithHooks<Ctx, Output>;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  internalMutation<Args, Output>(
    config: InternalMutationConfig<Ctx, Args, Output>
  ): InternalMutationWithHooks<Ctx, Args, Output> {
    return createHookedProcedure({
      type: "internalMutation",
      argsSchema: config.args,
      handler: config.handler,
    }) as InternalMutationWithHooks<Ctx, Args, Output>;
  }

  router<Routes extends Router<Ctx>>(routes: Routes): Routes {
    return routes;
  }

  middleware<Args>(config: Middleware<Ctx, Args>): Middleware<Ctx, Args> {
    return config;
  }

  on<EventName extends keyof EventRegistry>(
    event: EventName,
    handler: (ctx: Ctx, payload: { name: string; data: EventRegistry[EventName]["data"] }) => void | Promise<void>
  ): () => void {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    if (!this.eventEmitter) {
      return () => {};
    }
    // Wrap the handler to pass context (this.context) as the first argument
    const wrappedHandler = (payload: any) => {
      return handler(this.context, payload);
    };
    return this.eventEmitter.on(event, wrappedHandler as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}

export type { QueryWithHooks } from "./types.js";
export type { MutationWithHooks } from "../mutation/builder.js";
export type { InternalQueryWithHooks } from "../internal-query/builder.js";
export type { InternalMutationWithHooks } from "../internal-mutation/builder.js";

export function createQueryBuilder<Ctx>(
  context: Ctx,
  /* eslint-disable @typescript-eslint/no-explicit-any */
  eventEmitter?: EventEmitter<any>
  /* eslint-enable @typescript-eslint/no-explicit-any */
): QueryBuilder<Ctx> {
  return new QueryBuilder(context, eventEmitter);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface HookedProcedureMixin<Ctx, Args> {
  beforeInvoke(hook: BeforeInvokeHook<Ctx, Args>): this;
  afterInvoke(hook: AfterInvokeHook<Ctx, Args, any>): this;
  onSuccess(hook: OnSuccessHook<Ctx, Args, any>): this;
  onError(hook: OnErrorHook<Ctx, Args, any>): this;
  _hooks: {
    beforeInvoke?: BeforeInvokeHook<Ctx, Args>;
    afterInvoke?: AfterInvokeHook<Ctx, Args, any>;
    onSuccess?: OnSuccessHook<Ctx, Args, any>;
    onError?: OnErrorHook<Ctx, Args, any>;
  };
}

interface BaseProc {
  type: "query" | "mutation" | "internalQuery" | "internalMutation";
  argsSchema?: ZodType<any>;
  handler: (ctx: any, args: any) => Promise<Result<any>>;
}

function createHookedProcedure<Proc extends BaseProc>(
  proc: Proc
): Proc & HookedProcedureMixin<any, any> {
  const hookedProc: any = {
    type: proc.type,
    argsSchema: proc.argsSchema,
    handler: proc.handler,
    _hooks: {},
  };

  hookedProc.beforeInvoke = function(hook: BeforeInvokeHook<any, any>) {
    hookedProc._hooks.beforeInvoke = hook;
    return hookedProc;
  };

  hookedProc.afterInvoke = function(hook: AfterInvokeHook<any, any, any>) {
    hookedProc._hooks.afterInvoke = hook;
    return hookedProc;
  };

  hookedProc.onSuccess = function(hook: OnSuccessHook<any, any, any>) {
    hookedProc._hooks.onSuccess = hook;
    return hookedProc;
  };

  hookedProc.onError = function(hook: OnErrorHook<any, any, any>) {
    hookedProc._hooks.onError = hook;
    return hookedProc;
  };

  return hookedProc;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
