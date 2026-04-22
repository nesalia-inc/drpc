import type { Plugin, EventRegistry, SendOptions, HandlerContext } from "../../types.js";
import { createPendingEventQueue } from "../../events/queue.js";
import { applyPlugins } from "./plugins.js";

// ============================================================
// L1: Handler Context Creation
// ============================================================

export const createSendFn =
  <Ctx, Events extends EventRegistry>(
    queue: ReturnType<typeof createPendingEventQueue>
  ) =>
  (name: keyof Events, data: Events[typeof name]["data"], options?: SendOptions): void => {
    queue.enqueue({
      name: name as string,
      data,
      timestamp: new Date().toISOString(),
      namespace: options?.namespace ?? "default",
      options,
    });
  };

export const createHandlerContext = <Ctx, Events extends EventRegistry>(
  ctx: Ctx,
  queue: ReturnType<typeof createPendingEventQueue>,
  plugins: readonly Plugin<Ctx>[]
): HandlerContext<Ctx, Events> => {
  const send = createSendFn<Ctx, Events>(queue);
  const extendedCtx = applyPlugins(ctx, plugins);
  return {
    ...(extendedCtx as object),
    send,
  } as HandlerContext<Ctx, Events>;
};
