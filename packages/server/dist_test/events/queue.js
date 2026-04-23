import { ok, err, unit, error } from "@deessejs/fp";
export const createPendingEventQueue = () => {
    let _events = [];
    return {
        enqueue: (event) => {
            _events.push(event);
            return ok({
                eventName: event.name,
                data: event.data,
                processed: true,
                timestamp: event.timestamp,
                namespace: event.namespace,
            });
        },
        flush: async (emitter) => {
            if (!emitter || _events.length === 0) {
                _events = [];
                return ok(unit);
            }
            let processedCount = 0;
            try {
                for (const event of _events) {
                    const result = await emitter.emit(event.name, event.data, event.namespace);
                    if (!result.ok) {
                        _events = _events.slice(processedCount);
                        return result;
                    }
                    processedCount++;
                }
                _events = [];
                return ok(unit);
            }
            catch (error_) {
                _events = _events.slice(processedCount);
                const errMsg = error_ instanceof Error ? error_.message : String(error_);
                const fpErr = error({ name: "INTERNAL_ERROR", message: (_) => errMsg })({ message: errMsg });
                return err(fpErr);
            }
        },
        clear: () => {
            _events = [];
        },
        isEmpty: () => {
            return _events.length === 0;
        },
        events: () => {
            return [..._events];
        },
        size: () => {
            return _events.length;
        },
    };
};
//# sourceMappingURL=queue.js.map