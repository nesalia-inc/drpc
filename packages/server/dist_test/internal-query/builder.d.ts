import { type InternalQuery, type Middleware } from "../types.js";
import { type InternalQueryConfig } from "./types.js";
import { type BeforeInvokeHook, type AfterInvokeHook, type OnSuccessHook, type OnErrorHook } from "../types.js";
export type InternalQueryWithHooks<Ctx, Output> = InternalQuery<Ctx, void, Output> & HookedProcedureMixin<Ctx, void, Output>;
export declare function createInternalQueryWithHooks<Ctx, Output>(config: InternalQueryConfig<Ctx, Output>): InternalQueryWithHooks<Ctx, Output>;
interface HookedProcedureMixin<Ctx, Args, Output> {
    type: "query" | "mutation" | "internalQuery" | "internalMutation";
    beforeInvoke(hook: BeforeInvokeHook<Ctx, Args>): this;
    afterInvoke(hook: AfterInvokeHook<Ctx, Args, Output>): this;
    onSuccess(hook: OnSuccessHook<Ctx, Args, Output>): this;
    onError(hook: OnErrorHook<Ctx, Args, any>): this;
    use(middleware: Middleware<Ctx>): this;
    _hooks: {
        beforeInvoke?: BeforeInvokeHook<Ctx, Args>;
        afterInvoke?: AfterInvokeHook<Ctx, Args, Output>;
        onSuccess?: OnSuccessHook<Ctx, Args, Output>;
        onError?: OnErrorHook<Ctx, Args, any>;
    };
    _middleware: Middleware<Ctx>[];
}
export {};
//# sourceMappingURL=builder.d.ts.map