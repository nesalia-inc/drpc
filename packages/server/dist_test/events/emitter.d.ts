import { type EventRegistry, type EventPayload } from "../types.js";
import { type Result, type Unit } from "@deessejs/fp";
export declare class EventEmitter<Events extends EventRegistry = EventRegistry> {
    private listeners;
    private eventLog;
    private prefixIndex;
    constructor(_events?: Events);
    on<EventName extends keyof Events>(event: EventName, handler: (payload: EventPayload<Events[EventName]["data"]>) => void | Promise<void>): () => void;
    off<EventName extends keyof Events>(event: EventName, handler: (payload: EventPayload<Events[EventName]["data"]>) => void | Promise<void>): void;
    private removePatternFromIndex;
    emit<EventName extends keyof Events>(event: EventName, data: Events[EventName]["data"]): Promise<Result<Unit>>;
    emit(event: string, data: unknown, namespace?: string): Promise<Result<Unit>>;
    getEventLog(): EventPayload[];
    clearEventLog(): void;
    private getWildcardHandlers;
    private addGlobalWildcardHandlers;
    private addMatchingWildcardHandlers;
    private isWildcardMatch;
    private matchPrefix;
    private matchSuffix;
}
export declare function defineEvents(events: Record<string, unknown>): EventRegistry;
/**
 * Flattens a nested event object into a flat EventRegistry.
 * { user: { created: { data: T } } } => { "user.created": { data: T } }
 *
 * This is used internally to support the namespace DSL while
 * maintaining backward compatibility with nested object access.
 */
export declare function flattenEvents<Events extends EventRegistry>(events: Events, prefix?: string): EventRegistry;
export type EventHandler<Events extends EventRegistry, EventName extends keyof Events> = (event: {
    name: EventName;
    data: Events[EventName]["data"];
}) => void | Promise<void>;
//# sourceMappingURL=emitter.d.ts.map