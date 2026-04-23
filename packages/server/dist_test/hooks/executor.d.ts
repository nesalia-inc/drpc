import { type Result } from "@deessejs/fp";
import { type BeforeInvokeHook } from "../types.js";
import { type Hooks } from "./types.js";
export declare function executeHooks<Ctx, Args, Output>(hooks: Hooks<Ctx, Args, Output>, ctx: Ctx, args: Args, result: Result<Output>): Promise<void>;
export declare function executeBeforeInvoke<Ctx, Args>(hook: BeforeInvokeHook<Ctx, Args> | undefined, ctx: Ctx, args: Args): Promise<void>;
//# sourceMappingURL=executor.d.ts.map