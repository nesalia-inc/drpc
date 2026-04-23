export async function executeHooks(hooks, ctx, args, result) {
    // Call afterInvoke first (always runs)
    if (hooks.afterInvoke) {
        await hooks.afterInvoke(ctx, args, result);
    }
    // Then call onSuccess or onError based on result
    if (result.ok) {
        if (hooks.onSuccess) {
            await hooks.onSuccess(ctx, args, result.value);
        }
    }
    else {
        if (hooks.onError) {
            await hooks.onError(ctx, args, result.error);
        }
    }
}
export async function executeBeforeInvoke(hook, ctx, args) {
    if (hook) {
        await hook(ctx, args);
    }
}
//# sourceMappingURL=executor.js.map