import { type EventRegistry, type Middleware, type Router } from "../types.js";
import { QueryBuilder } from "../query/builder.js";
import { EventEmitter } from "../events/emitter.js";
import { createAPI } from "../api/factory/index.js";
import { type TypedAPIInstance } from "../api/types/proxy.js";
import { type DefineContextConfig } from "./types.js";

export function defineContext<
  Ctx,
  Events extends EventRegistry = EventRegistry
>(
  config: DefineContextConfig<Ctx, Events>
): {
  t: QueryBuilder<Ctx, Events>;
  createAPI: (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => TypedAPIInstance<Ctx, Router<Ctx>>;
} {
  const { context, createContext, plugins = [], events } = config;

  const eventEmitter = events ? new EventEmitter<Events>(events) : undefined;

  const initialContext = createContext ? createContext() : context;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const t = new QueryBuilder<Ctx, Events>(initialContext as Ctx, eventEmitter as any);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const createAPIFn = (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => {
    return createAPI({
      router: apiConfig.router,
      context,
      createContext,
      plugins,
      middleware: apiConfig.middleware,
      eventEmitter,
    });
  };

  return { t, createAPI: createAPIFn };
}
