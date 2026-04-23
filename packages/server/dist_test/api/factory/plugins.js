// ============================================================
// L1: Plugin Application (Performance Rule)
// ============================================================
export const applyPlugins = (ctx, plugins) => {
    if (plugins.length === 0)
        return ctx;
    // L1: Clone once at start to guarantee immutability of original ctx
    const extendedCtx = Object.assign({}, ctx);
    // L2: Apply plugins using Object.assign (performance rule - no intermediate allocations)
    for (let i = 0; i < plugins.length; i++) {
        const extension = plugins[i].extend(extendedCtx);
        Object.assign(extendedCtx, extension);
    }
    return extendedCtx;
};
//# sourceMappingURL=plugins.js.map