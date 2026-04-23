import { ok, err, unit, error } from "@deessejs/fp";
const MAX_EVENT_LOG_SIZE = 1000;
export class EventEmitter {
    listeners = new Map();
    eventLog = [];
    // Prefix-based index for wildcard patterns: first segment -> set of patterns
    // E.g., "user" -> Set of patterns like "user.*"
    prefixIndex = new Map();
    constructor(_events) {
    }
    on(event, handler) {
        const eventStr = event;
        if (!this.listeners.has(eventStr)) {
            this.listeners.set(eventStr, new Set());
            // Index wildcard patterns by their first segment
            if (eventStr.endsWith(".*")) {
                const firstSegment = eventStr.split(".")[0];
                if (firstSegment && firstSegment !== "*") {
                    if (!this.prefixIndex.has(firstSegment)) {
                        this.prefixIndex.set(firstSegment, new Set());
                    }
                    this.prefixIndex.get(firstSegment).add(eventStr);
                }
            }
        }
        /* eslint-disable @typescript-eslint/no-explicit-any */
        this.listeners.get(eventStr).add(handler);
        /* eslint-enable @typescript-eslint/no-explicit-any */
        // Return unsubscribe function
        return () => {
            this.off(event, handler);
        };
    }
    off(event, handler) {
        const eventStr = event;
        const handlers = this.listeners.get(eventStr);
        if (handlers) {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            handlers.delete(handler);
            /* eslint-enable @typescript-eslint/no-explicit-any */
            // If no more handlers for this pattern, remove from index
            if (handlers.size === 0) {
                this.listeners.delete(eventStr);
                this.removePatternFromIndex(eventStr);
            }
        }
    }
    removePatternFromIndex(eventStr) {
        if (!eventStr.endsWith(".*"))
            return;
        const firstSegment = eventStr.split(".")[0];
        if (!firstSegment || firstSegment === "*")
            return;
        const prefixSet = this.prefixIndex.get(firstSegment);
        if (!prefixSet)
            return;
        prefixSet.delete(eventStr);
        if (prefixSet.size === 0) {
            this.prefixIndex.delete(firstSegment);
        }
    }
    async emit(event, data, namespace) {
        const eventName = event;
        const handlers = this.listeners.get(eventName);
        const wildcardHandlers = this.getWildcardHandlers(eventName);
        // Merge regular and wildcard handlers
        const allHandlers = new Set();
        if (handlers) {
            for (const handler of handlers) {
                allHandlers.add(handler);
            }
        }
        for (const handler of wildcardHandlers) {
            allHandlers.add(handler);
        }
        // Always log the event, even if there are no handlers
        const payload = {
            name: eventName,
            data,
            timestamp: new Date().toISOString(),
            namespace: namespace ?? "default",
        };
        this.eventLog.push(payload);
        if (this.eventLog.length > MAX_EVENT_LOG_SIZE) {
            this.eventLog.shift();
        }
        // If no handlers, we're done
        if (allHandlers.size === 0)
            return ok(unit);
        for (const handler of allHandlers) {
            try {
                const result = handler(payload);
                if (result instanceof Promise) {
                    await result;
                }
            }
            catch (error_) {
                const errMsg = error_ instanceof Error ? error_.message : String(error_);
                const fpErr = error({ name: "INTERNAL_ERROR", message: (_) => errMsg })({ message: errMsg });
                return err(fpErr);
            }
        }
        return ok(unit);
    }
    getEventLog() {
        return [...this.eventLog];
    }
    clearEventLog() {
        this.eventLog = [];
    }
    getWildcardHandlers(eventName) {
        const handlers = new Set();
        this.addGlobalWildcardHandlers(handlers);
        this.addMatchingWildcardHandlers(handlers, eventName);
        return handlers;
    }
    addGlobalWildcardHandlers(handlers) {
        const globalHandlers = this.listeners.get("*");
        if (globalHandlers) {
            for (const handler of globalHandlers) {
                handlers.add(handler);
            }
        }
    }
    addMatchingWildcardHandlers(handlers, eventName) {
        const eventParts = eventName.split(".");
        if (eventParts.length === 0) {
            return;
        }
        const firstSegment = eventParts[0];
        const candidatePatterns = this.prefixIndex.get(firstSegment);
        if (!candidatePatterns) {
            return;
        }
        for (const pattern of candidatePatterns) {
            if (this.isWildcardMatch(eventName, pattern)) {
                const wildcardHandlers = this.listeners.get(pattern);
                if (wildcardHandlers) {
                    for (const handler of wildcardHandlers) {
                        handlers.add(handler);
                    }
                }
            }
        }
    }
    isWildcardMatch(eventName, pattern) {
        if (pattern === "*")
            return true;
        if (pattern === eventName)
            return true;
        const eventParts = eventName.split(".");
        // Check if pattern ends with ".*" (suffix wildcard)
        if (pattern.endsWith(".*")) {
            return this.matchPrefix(eventParts, pattern.slice(0, -2));
        }
        // Check if pattern starts with "*." (leading wildcard)
        if (pattern.startsWith("*.")) {
            return this.matchSuffix(eventParts, pattern.slice(2));
        }
        return false;
    }
    matchPrefix(eventParts, prefix) {
        const prefixParts = prefix.split(".");
        if (eventParts.length < prefixParts.length)
            return false;
        for (let i = 0; i < prefixParts.length; i++) {
            if (prefixParts[i] !== eventParts[i])
                return false;
        }
        return true;
    }
    matchSuffix(eventParts, suffix) {
        const suffixParts = suffix.split(".");
        if (eventParts.length < suffixParts.length)
            return false;
        const offset = eventParts.length - suffixParts.length;
        for (let i = 0; i < suffixParts.length; i++) {
            if (suffixParts[i] !== eventParts[offset + i])
                return false;
        }
        return true;
    }
}
export function defineEvents(events) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return flattenEvents(events);
}
/**
 * Flattens a nested event object into a flat EventRegistry.
 * { user: { created: { data: T } } } => { "user.created": { data: T } }
 *
 * This is used internally to support the namespace DSL while
 * maintaining backward compatibility with nested object access.
 */
export function flattenEvents(events, prefix = "") {
    const result = {};
    for (const key of Object.keys(events)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = events[key];
        // Check if value is an event definition (has 'data' property) or a namespace
        if (value && typeof value === "object" && "data" in value && Object.keys(value).length <= 2) {
            // This is an event definition (has data and optionally response)
            result[fullKey] = value;
        }
        else if (value && typeof value === "object") {
            // This is a namespace (nested object), recurse into it
            Object.assign(result, flattenEvents(value, fullKey));
        }
    }
    return result;
}
//# sourceMappingURL=emitter.js.map