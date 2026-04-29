import { type EventRegistry, type Middleware, type Router, type Plugin, type PluginEnrichment } from "../types.js";
import { QueryBuilder } from "../query/builder.js";
import { EventEmitter } from "../events/emitter.js";
import { createAPI } from "../api/factory/index.js";
import { type TypedAPIInstance } from "../api/types/proxy.js";
import { type DefineContextConfig } from "./types.js";

// ============================================
// ContextBuilder - builder for context with plugins
// ============================================

export class ContextBuilder<
  Ctx,
  Events extends EventRegistry = EventRegistry,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Plugins extends Plugin<any>[] = []
> {
  private context?: Ctx;
  private createContext?: (requestInfo?: { headers?: Record<string, string>; method?: string; url?: string }) => Ctx;
  private plugins: Plugins;
  private events?: Events;

  constructor(
    context?: Ctx,
    createContext?: (requestInfo?: { headers?: Record<string, string>; method?: string; url?: string }) => Ctx,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: Plugins = [] as any,
    events?: Events
  ) {
    this.context = context;
    this.createContext = createContext;
    this.plugins = plugins;
    this.events = events;
  }

  /**
   * Add a plugin to the context builder.
   * Returns a new ContextBuilder with the plugin added.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  use<NewPlugin extends Plugin<any>>(plugin: NewPlugin): ContextBuilder<Ctx, Events, [...Plugins, NewPlugin]> {
    return new ContextBuilder<Ctx, Events, [...Plugins, NewPlugin]>(
      this.context,
      this.createContext,
      [...this.plugins, plugin] as [...Plugins, NewPlugin],
      this.events
    );
  }

  /**
   * Set the events registry.
   */
  withEvents<NewEvents extends EventRegistry>(events: NewEvents): ContextBuilder<Ctx, NewEvents, Plugins> {
    return new ContextBuilder<Ctx, NewEvents, Plugins>(
      this.context,
      this.createContext,
      this.plugins,
      events
    );
  }

  /**
   * Build the context with all plugins and their enrichments.
   * Returns t (QueryBuilder + enrichments) and createAPI function.
   */
  build(): {
    t: QueryBuilder<Ctx, Events>;
    createAPI: (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => TypedAPIInstance<Ctx, Router<Ctx>>;
  } {
    const eventEmitter = this.events ? new EventEmitter<Events>(this.events) : undefined;
    const initialContext = this.createContext ? this.createContext() : this.context;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const t = new QueryBuilder<Ctx, Events>(initialContext as Ctx, eventEmitter as any) as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Apply plugin enrichments to t
    for (const plugin of this.plugins) {
      if (plugin.procedures) {
        const enrichment = plugin.procedures();
        for (const namespace of Object.keys(enrichment)) {
          if (!t[namespace]) {
            (t as any)[namespace] = {};
          }
          const ns = (t as any)[namespace];
          for (const methodName of Object.keys(enrichment[namespace])) {
            ns[methodName] = enrichment[namespace][methodName];
          }
        }
      }
    }

    const createAPIFn = (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => {
      return createAPI({
        router: apiConfig.router,
        context: this.context,
        createContext: this.createContext,
        plugins: this.plugins as Plugin<Ctx>[],
        middleware: apiConfig.middleware,
        eventEmitter,
      });
    };

    return { t, createAPI: createAPIFn };
  }
}

// ============================================
// createContextBuilder - factory function
// ============================================

export function createContextBuilder<Ctx>(): ContextBuilder<Ctx> {
  return new ContextBuilder<Ctx>();
}

// ============================================
// defineContext - backward compatible function API
// ============================================

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
