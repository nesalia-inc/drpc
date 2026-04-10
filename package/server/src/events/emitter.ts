import type { EventRegistry, EventPayload } from "../types.js";

export class EventEmitter<Events extends EventRegistry = EventRegistry> {
  private listeners: Map<string, Set<(payload: EventPayload) => void | Promise<void>>> = new Map();
  private eventLog: EventPayload[] = [];

  constructor(_events?: Events) {
  }

  on<EventName extends keyof Events>(
    event: EventName,
    handler: (payload: EventPayload) => void | Promise<void>
  ): () => void {
    const eventStr = event as string;
    if (!this.listeners.has(eventStr)) {
      this.listeners.set(eventStr, new Set());
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    this.listeners.get(eventStr)!.add(handler as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  off<EventName extends keyof Events>(
    event: EventName,
    handler: (payload: EventPayload) => void | Promise<void>
  ): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      handlers.delete(handler as any);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
  }

  async emit<EventName extends keyof Events>(
    event: EventName,
    data: Events[EventName]["data"]
  ): Promise<void>;
  async emit(event: string, data: unknown, namespace?: string): Promise<void>;
  async emit(
    event: keyof Events | string,
    data: unknown,
    namespace?: string
  ): Promise<void> {
    const eventName = event as string;
    const handlers = this.listeners.get(eventName);
    const wildcardHandlers = this.getWildcardHandlers(eventName);

    // Merge regular and wildcard handlers
    const allHandlers = new Set<((payload: EventPayload) => void | Promise<void>)>();
    if (handlers) {
      for (const handler of handlers) {
        allHandlers.add(handler);
      }
    }
    for (const handler of wildcardHandlers) {
      allHandlers.add(handler);
    }

    // Always log the event, even if there are no handlers
    const payload: EventPayload = {
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      namespace: namespace ?? "default",
    };

    this.eventLog.push(payload);

    // If no handlers, we're done
    if (allHandlers.size === 0) return;

    const promises: Promise<void>[] = [];

    for (const handler of allHandlers) {
      const result = handler(payload);
      if (result instanceof Promise) {
        promises.push(result);
      }
    }

    await Promise.all(promises);
  }

  getEventLog(): EventPayload[] {
    return [...this.eventLog];
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  private getWildcardHandlers(eventName: string): Set<(payload: EventPayload) => void | Promise<void>> {
    const handlers = new Set<(payload: EventPayload) => void | Promise<void>>();

    // Check all possible wildcard patterns (e.g., "user.*", "*")
    for (const pattern of this.listeners.keys()) {
      if (this.isWildcardMatch(eventName, pattern)) {
        const wildcardHandlers = this.listeners.get(pattern);
        if (wildcardHandlers) {
          for (const handler of wildcardHandlers) {
            handlers.add(handler);
          }
        }
      }
    }

    return handlers;
  }

  private isWildcardMatch(eventName: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern === eventName) return true;

    const eventParts = eventName.split(".");

    // Check if pattern ends with ".*" (suffix wildcard)
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      const prefixParts = prefix.split(".");
      // Match if event parts start with pattern prefix
      if (eventParts.length >= prefixParts.length) {
        for (let i = 0; i < prefixParts.length; i++) {
          if (prefixParts[i] !== eventParts[i]) return false;
        }
        return true;
      }
    }

    return false;
  }
}

export function defineEvents(events: Record<string, unknown>): EventRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return flattenEvents(events as any);
}

/**
 * Flattens a nested event object into a flat EventRegistry.
 * { user: { created: { data: T } } } => { "user.created": { data: T } }
 *
 * This is used internally to support the namespace DSL while
 * maintaining backward compatibility with nested object access.
 */
export function flattenEvents<Events extends EventRegistry>(
  events: Events,
  prefix: string = ""
): EventRegistry {
  const result: EventRegistry = {};
  for (const key of Object.keys(events)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = (events as any)[key];
    // Check if value is an event definition (has 'data' property) or a namespace
    if (value && typeof value === "object" && "data" in value && Object.keys(value).length <= 2) {
      // This is an event definition (has data and optionally response)
      result[fullKey] = value;
    } else if (value && typeof value === "object") {
      // This is a namespace (nested object), recurse into it
      Object.assign(result, flattenEvents(value as EventRegistry, fullKey));
    }
  }
  return result;
}

export type EventHandler<Events extends EventRegistry, EventName extends keyof Events> = (
  event: { name: EventName; data: Events[EventName]["data"] }
) => void | Promise<void>;
