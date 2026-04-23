// Factory module - decomposed API factory into focused files
// Follows abstraction levels: L1 (atomic) -> L2 (composed) -> L3 (orchestration)
export { createAPI, createPublicAPI, filterPublicRouter } from "./api.js";
export { createRouterProxy } from "./proxy.js";
export { executeRoute } from "./route.js";
export { executeProcedure } from "./procedure.js";
//# sourceMappingURL=index.js.map