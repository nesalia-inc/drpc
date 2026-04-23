import { type Middleware } from "../types.js";
import { type QueryWithHooks } from "../query/types.js";
import { type MutationWithHooks } from "../mutation/builder.js";
/**
 * Apply middleware to a query
 */
export declare function withQuery<Ctx, Args, Output>(query: QueryWithHooks<Ctx, Args, Output>): QueryWithHooks<Ctx, Args, Output>;
/**
 * Apply middleware to a query
 */
export declare function withQuery<Ctx, Args, Output>(query: QueryWithHooks<Ctx, Args, Output>, middleware: Middleware<Ctx>): QueryWithHooks<Ctx, Args, Output>;
/**
 * Apply middleware to a query using a function transformer (curried form)
 */
export declare function withQuery<Ctx>(fn: (q: QueryWithHooks<Ctx, any, any>) => QueryWithHooks<Ctx, any, any>): (query: QueryWithHooks<Ctx, any, any>) => QueryWithHooks<Ctx, any, any>;
/**
 * Apply middleware to a mutation
 */
export declare function withMutation<Ctx, Args, Output>(mutation: MutationWithHooks<Ctx, Args, Output>): MutationWithHooks<Ctx, Args, Output>;
/**
 * Apply middleware to a mutation
 */
export declare function withMutation<Ctx, Args, Output>(mutation: MutationWithHooks<Ctx, Args, Output>, middleware: Middleware<Ctx>): MutationWithHooks<Ctx, Args, Output>;
/**
 * Apply middleware to a mutation using a function transformer (curried form)
 */
export declare function withMutation<Ctx>(fn: (m: MutationWithHooks<Ctx, any, any>) => MutationWithHooks<Ctx, any, any>): (mutation: MutationWithHooks<Ctx, any, any>) => MutationWithHooks<Ctx, any, any>;
//# sourceMappingURL=helpers.d.ts.map