import { type BeforeInvokeHook } from "../types.js";
export interface Hooks<Ctx, Args, Output> {
    beforeInvoke?: BeforeInvokeHook<Ctx, Args>;
    afterInvoke?: import("../types.js").AfterInvokeHook<Ctx, Args, Output>;
    onSuccess?: import("../types.js").OnSuccessHook<Ctx, Args, Output>;
    onError?: import("../types.js").OnErrorHook<Ctx, Args, any>;
}
//# sourceMappingURL=types.d.ts.map