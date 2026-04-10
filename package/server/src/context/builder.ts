import type { EventRegistry, Middleware, Router } from "../types.js";
import { QueryBuilder } from "../query/builder.js";
import { EventEmitter } from "../events/emitter.js";
import { createAPI } from "../api/factory.js";
import type { DefineContextConfig } from "./types.js";

export function defineContext<
  Ctx,
  Events extends EventRegistry = EventRegistry
>(
  config: DefineContextConfig<Ctx, Events>
): {
  t: QueryBuilder<Ctx>;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  createAPI: (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
} {
  const { context, plugins = [], events } = config;

  // Create event emitter if events are defined
  const eventEmitter = events ? new EventEmitter<Events>(events) : undefined;

  // Create query builder (t)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const t = new QueryBuilder<Ctx>(context, eventEmitter as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Create createAPI function - use any to avoid complex type issues
  const createAPIFn = (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return createAPI({
      router: apiConfig.router,
      context,
      plugins,
      middleware: apiConfig.middleware,
      eventEmitter,
    }) as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };

  return { t, createAPI: createAPIFn };
}
