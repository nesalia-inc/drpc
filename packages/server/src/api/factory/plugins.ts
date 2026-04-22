import type { Plugin } from "../../types.js";

// ============================================================
// L1: Plugin Application
// ============================================================

export const applyPlugins = <Ctx>(ctx: Ctx, plugins: readonly Plugin<Ctx>[]): Ctx => {
  let extendedCtx = ctx;
  for (const plugin of plugins) {
    extendedCtx = { ...extendedCtx, ...plugin.extend(extendedCtx) } as Ctx;
  }
  return extendedCtx;
};
