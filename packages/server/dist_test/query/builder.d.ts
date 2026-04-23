import { type EventRegistry, type Middleware, type Router } from "../types.js";
import { type EventEmitter } from "../events/emitter.js";
import { type QueryConfig, type QueryWithHooks } from "./types.js";
import { type MutationConfig, type MutationWithHooks } from "../mutation/index.js";
import { type InternalQueryConfig, type InternalQueryWithHooks } from "../internal-query/index.js";
import { type InternalMutationConfig, type InternalMutationWithHooks } from "../internal-mutation/index.js";
export declare class QueryBuilder<Ctx, Events extends EventRegistry = EventRegistry> {
    private context;
    private eventEmitter?;
    constructor(context: Ctx, eventEmitter?: EventEmitter<any> | undefined);
    query<Args, Output>(config: QueryConfig<Ctx, Args, Output, Events>): QueryWithHooks<Ctx, Args, Output>;
    mutation<Args, Output>(config: MutationConfig<Ctx, Args, Output, Events>): MutationWithHooks<Ctx, Args, Output>;
    internalQuery<Output>(config: InternalQueryConfig<Ctx, Output, Events>): InternalQueryWithHooks<Ctx, Output>;
    internalMutation<Args, Output>(config: InternalMutationConfig<Ctx, Args, Output, Events>): InternalMutationWithHooks<Ctx, Args, Output>;
    router<Routes extends Router<Ctx>>(routes: Routes): Routes;
    middleware<Args>(config: Middleware<Ctx, Args>): Middleware<Ctx, Args>;
    on<EventName extends keyof Events>(event: EventName, handler: (ctx: Ctx, payload: {
        name: string;
        data: Events[EventName]["data"];
    }) => void | Promise<void>): () => void;
}
export type { QueryWithHooks } from "./types.js";
export type { MutationWithHooks } from "../mutation/builder.js";
export type { InternalQueryWithHooks } from "../internal-query/builder.js";
export type { InternalMutationWithHooks } from "../internal-mutation/builder.js";
export declare function createQueryBuilder<Ctx, Events extends EventRegistry = EventRegistry>(context: Ctx, eventEmitter?: EventEmitter<any>): QueryBuilder<Ctx, Events>;
//# sourceMappingURL=builder.d.ts.map