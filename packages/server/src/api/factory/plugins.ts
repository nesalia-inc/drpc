import  { type Plugin } from "../../types.js";

// ============================================================
// L1: Plugin Application (Performance Rule)
// ============================================================

export const applyPlugins = <Ctx>(ctx: Ctx, plugins: readonly Plugin<Ctx>[]): Ctx => {
  if (plugins.length === 0) return ctx;

  // L1: Clone once at start to guarantee immutability of original ctx
  const extendedCtx = Object.assign({}, ctx as Record<string, unknown>) as Ctx;

  // L2: Apply plugins using Object.assign (performance rule - no intermediate allocations)
  for (let i = 0; i < plugins.length; i++) {
    const extension = plugins[i].extend(extendedCtx);
    Object.assign(extendedCtx as Record<string, unknown>, extension);
  }

  return extendedCtx;
};
