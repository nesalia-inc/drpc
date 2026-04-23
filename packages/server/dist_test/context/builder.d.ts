import { type EventRegistry, type Middleware, type Router } from "../types.js";
import { QueryBuilder } from "../query/builder.js";
import { type TypedAPIInstance } from "../api/types/proxy.js";
import { type DefineContextConfig } from "./types.js";
export declare function defineContext<Ctx, Events extends EventRegistry = EventRegistry>(config: DefineContextConfig<Ctx, Events>): {
    t: QueryBuilder<Ctx, Events>;
    createAPI: (apiConfig: {
        router: Router<Ctx>;
        middleware?: Middleware<Ctx>[];
    }) => TypedAPIInstance<Ctx, Router<Ctx>>;
};
//# sourceMappingURL=builder.d.ts.map