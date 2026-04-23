import { type PendingEvent } from "../types.js";
import { type EventEmitter } from "./emitter.js";
import type { Result, Unit } from "@deessejs/fp";
export interface PendingEventQueue {
    enqueue(event: PendingEvent): Result<{
        eventName: string;
        data: unknown;
        processed: boolean;
        timestamp: string;
        namespace: string;
    }>;
    flush(emitter: EventEmitter | undefined): Promise<Result<Unit>>;
    clear(): void;
    isEmpty(): boolean;
    events(): PendingEvent[];
    size(): number;
}
export type EventQueue = PendingEventQueue;
export declare const createPendingEventQueue: () => PendingEventQueue;
//# sourceMappingURL=queue.d.ts.map