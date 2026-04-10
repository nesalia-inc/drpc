import type { EventRegistry } from "../types.js";

export interface DefineContextConfig<Ctx, Events extends EventRegistry = EventRegistry> {
  context: Ctx;
  plugins?: import("../types.js").Plugin<Ctx>[];
  events?: Events;
}
