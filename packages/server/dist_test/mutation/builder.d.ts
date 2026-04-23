import { type Mutation } from "../types.js";
import { type MutationConfig } from "./types.js";
import { type BeforeInvokeHook, type AfterInvokeHook, type OnSuccessHook, type OnErrorHook, type ProcedureType, type Middleware } from "../types.js";
export type MutationWithHooks<Ctx, Args, Output> = Mutation<Ctx, Args, Output> & HookedProcedureMixin<Ctx, Args, Output>;
export declare function createMutationWithHooks<Ctx, Args, Output>(config: MutationConfig<Ctx, Args, Output>): MutationWithHooks<Ctx, Args, Output>;
interface HookedProcedureMixin<Ctx, Args, Output> {
    type: ProcedureType;
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