import  { type Plugin, type EventRegistry, type SendOptions, type HandlerContext } from "../../types.js";
import  { type EventQueue } from "../../events/queue.js";
import { applyPlugins } from "./plugins.js";

// ============================================================
// Constants
// ============================================================

const DEFAULT_NAMESPACE = "default" as const;

// ============================================================
// L1: Handler Context Creation
// ============================================================

export const createSendFn = <Events extends EventRegistry>(
  queue: EventQueue
) =>
  <K extends keyof Events>(
    name: K,
    data: Events[K]["data"],
    options?: SendOptions
  ): void => {
    queue.enqueue({
      name: name as string,
      data,
      timestamp: new Date().toISOString(),
      namespace: options?.namespace ?? DEFAULT_NAMESPACE,
      options,
    });
  };

export const createHandlerContext = <Ctx, Events extends EventRegistry>(
  ctx: Ctx,
  queue: EventQueue,
  plugins: readonly Plugin<Ctx>[]
): HandlerContext<Ctx, Events> => {
  const send = createSendFn<Events>(queue);
  const extendedCtx = applyPlugins(ctx, plugins);

  // Use Object.assign to help TypeScript infer the intersection type
  return Object.assign(extendedCtx as object, { send }) as HandlerContext<Ctx, Events>;
};
