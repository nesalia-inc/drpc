import { QueryBuilder } from "../query/builder.js";
import { EventEmitter } from "../events/emitter.js";
import { createAPI } from "../api/factory/index.js";
export function defineContext(config) {
    const { context, createContext, plugins = [], events } = config;
    const eventEmitter = events ? new EventEmitter(events) : undefined;
    const initialContext = createContext ? createContext() : context;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const t = new QueryBuilder(initialContext, eventEmitter);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const createAPIFn = (apiConfig) => {
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
//# sourceMappingURL=builder.js.map