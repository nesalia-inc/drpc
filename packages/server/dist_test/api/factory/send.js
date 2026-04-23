import { applyPlugins } from "./plugins.js";
// ============================================================
// Constants
// ============================================================
const DEFAULT_NAMESPACE = "default";
// ============================================================
// L1: Handler Context Creation
// ============================================================
export const createSendFn = (queue) => (name, data, options) => {
    queue.enqueue({
        name: name,
        data,
        timestamp: new Date().toISOString(),
        namespace: options?.namespace ?? DEFAULT_NAMESPACE,
        options,
    });
};
export const createHandlerContext = (ctx, queue, plugins) => {
    const send = createSendFn(queue);
    const extendedCtx = applyPlugins(ctx, plugins);
    // Use Object.assign to help TypeScript infer the intersection type
    return Object.assign(extendedCtx, { send });
};
//# sourceMappingURL=send.js.map