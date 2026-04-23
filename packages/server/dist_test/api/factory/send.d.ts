import type { Plugin, EventRegistry, SendOptions, HandlerContext } from "../../types.js";
import type { EventQueue } from "../../events/queue.js";
export declare const createSendFn: <Events extends EventRegistry>(queue: EventQueue) => <K extends keyof Events>(name: K, data: Events[K]["data"], options?: SendOptions) => void;
export declare const createHandlerContext: <Ctx, Events extends EventRegistry>(ctx: Ctx, queue: EventQueue, plugins: readonly Plugin<Ctx>[]) => HandlerContext<Ctx, Events>;
//# sourceMappingURL=send.d.ts.map