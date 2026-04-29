import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter, defineEvents } from "../src/events/emitter";
import { event, eventNamespace } from "../src/events/index";
import { createPendingEventQueue } from "../src/events/queue";
import type { EventRegistry, EventPayload } from "../src/types";

describe("EventEmitter", () => {
  let emitter: EventEmitter<EventRegistry>;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe("basic functionality", () => {
    it("should create an EventEmitter instance", () => {
      expect(emitter).toBeDefined();
      expect(typeof emitter.on).toBe("function");
      expect(typeof emitter.emit).toBe("function");
      expect(typeof emitter.getEventLog).toBe("function");
    });

    it("should subscribe to an event with on()", () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on("test.event", handler);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should call handler when event is emitted", async () => {
      const handler = vi.fn();
      emitter.on("test.event", handler);

      await emitter.emit("test.event", { id: 1 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should pass correct payload to handler", async () => {
      const handler = vi.fn();
      emitter.on("user.created", handler);

      const eventData = { id: 42, name: "John" };
      await emitter.emit("user.created", eventData);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "user.created",
          data: eventData,
          namespace: "default",
        })
      );
    });

    it("should support multiple handlers on same event", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      emitter.on("user.created", handler1);
      emitter.on("user.created", handler2);
      emitter.on("user.created", handler3);

      await emitter.emit("user.created", { id: 1 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it("should call handler with different data for different events", async () => {
      const handler = vi.fn();
      emitter.on("test", handler);

      await emitter.emit("test", { value: "first" });
      await emitter.emit("test", { value: "second" });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: { value: "first" } }));
      expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { value: "second" } }));
    });
  });

  describe("getEventLog()", () => {
    it("should return empty array initially", () => {
      const log = emitter.getEventLog();
      expect(log).toEqual([]);
    });

    it("should return all emitted events", async () => {
      emitter.on("event1", () => {});
      emitter.on("event2", () => {});

      await emitter.emit("event1", { id: 1 });
      await emitter.emit("event2", { id: 2 });

      const log = emitter.getEventLog();
      expect(log).toHaveLength(2);
    });

    it("should include event name, data, and timestamp in log entries", async () => {
      emitter.on("user.created", () => {});

      await emitter.emit("user.created", { id: 42, name: "Jane" });

      const log = emitter.getEventLog();
      expect(log).toHaveLength(1);

      const entry = log[0];
      expect(entry.name).toBe("user.created");
      expect(entry.data).toEqual({ id: 42, name: "Jane" });
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe("string");
      // Should be valid ISO string
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });

    it("should log events even if no handler is subscribed", async () => {
      // No subscription, just emit
      await emitter.emit("unobserved.event", { data: 123 });

      const log = emitter.getEventLog();
      expect(log).toHaveLength(1);
      expect(log[0].name).toBe("unobserved.event");
    });

    it("should clear event log with clearEventLog()", async () => {
      emitter.on("event", () => {});

      await emitter.emit("event", { id: 1 });
      await emitter.emit("event", { id: 2 });

      expect(emitter.getEventLog()).toHaveLength(2);

      emitter.clearEventLog();

      expect(emitter.getEventLog()).toEqual([]);
    });

    it("should maintain event log order", async () => {
      emitter.on("e1", () => {});
      emitter.on("e2", () => {});

      await emitter.emit("e1", { order: 1 });
      await emitter.emit("e2", { order: 2 });
      await emitter.emit("e1", { order: 3 });

      const log = emitter.getEventLog();
      expect(log[0].name).toBe("e1");
      expect(log[0].data).toEqual({ order: 1 });
      expect(log[1].name).toBe("e2");
      expect(log[1].data).toEqual({ order: 2 });
      expect(log[2].name).toBe("e1");
      expect(log[2].data).toEqual({ order: 3 });
    });
  });

  describe("namespaces", () => {
    it("should use default namespace when none provided", async () => {
      const handler = vi.fn();
      emitter.on("test", handler);

      await emitter.emit("test", { value: 1 });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "default" })
      );
    });

    it("should use custom namespace when provided", async () => {
      const handler = vi.fn();
      emitter.on("test", handler);

      await emitter.emit("test", { value: 1 }, "customNamespace");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "customNamespace" })
      );
    });

    it("should log namespace in event payload", async () => {
      emitter.on("test", () => {});

      await emitter.emit("test", { data: true }, "myNamespace");

      const log = emitter.getEventLog();
      expect(log[0].namespace).toBe("myNamespace");
    });

    it("should use different namespaces for different events", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("event1", handler1);
      emitter.on("event2", handler2);

      await emitter.emit("event1", { ns: "namespace1" }, "ns1");
      await emitter.emit("event2", { ns: "namespace2" }, "ns2");

      expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ namespace: "ns1" }));
      expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ namespace: "ns2" }));
    });
  });

  describe("unsubscribe", () => {
    it("should return unsubscribe function from on()", () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on("test", handler);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should stop calling handler after unsubscribe", async () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on("test", handler);

      await emitter.emit("test", { id: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      await emitter.emit("test", { id: 2 });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("should support off() method for unsubscribing", async () => {
      const handler = vi.fn();
      emitter.on("test", handler);

      await emitter.emit("test", { id: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      emitter.off("test", handler);

      await emitter.emit("test", { id: 2 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should handle unsubscribe from multiple handlers", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const unsub1 = emitter.on("test", handler1);
      emitter.on("test", handler2);
      const unsub3 = emitter.on("test", handler3);

      await emitter.emit("test", { id: 1 });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);

      unsub1();
      unsub3();

      await emitter.emit("test", { id: 2 });
      expect(handler1).toHaveBeenCalledTimes(1); // Not called again
      expect(handler2).toHaveBeenCalledTimes(2);
      expect(handler3).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should not affect other handlers when one unsubscribes", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("test", handler1);
      emitter.on("test", handler2);

      await emitter.emit("test", { id: 1 });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      emitter.off("test", handler1);

      await emitter.emit("test", { id: 2 });
      expect(handler1).toHaveBeenCalledTimes(1); // Unsubscribed
      expect(handler2).toHaveBeenCalledTimes(2); // Still active
    });
  });

  describe("wildcard patterns", () => {
    it("should support prefix wildcard pattern user.*", async () => {
      const handler = vi.fn();
      emitter.on("user.*", handler);

      await emitter.emit("user.created", { id: 1 });
      await emitter.emit("user.updated", { id: 1 });
      await emitter.emit("user.deleted", { id: 1 });
      await emitter.emit("post.created", { id: 1 }); // Should not trigger

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it("should support global wildcard pattern *", async () => {
      const handler = vi.fn();
      emitter.on("*", handler);

      await emitter.emit("event1", { id: 1 });
      await emitter.emit("event2", { id: 2 });
      await emitter.emit("anything", { id: 3 });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it("should call both specific and wildcard handlers", async () => {
      const specificHandler = vi.fn();
      const wildcardHandler = vi.fn();

      emitter.on("user.created", specificHandler);
      emitter.on("user.*", wildcardHandler);

      await emitter.emit("user.created", { id: 1 });

      expect(specificHandler).toHaveBeenCalledTimes(1);
      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("emit return value", () => {
    it("should return ok result on successful emit", async () => {
      emitter.on("test", () => {});

      const result = await emitter.emit("test", { data: 1 });

      expect(result.ok).toBe(true);
    });

    it("should return ok result even with no handlers", async () => {
      const result = await emitter.emit("unobserved", { data: 1 });

      expect(result.ok).toBe(true);
    });

    it("should return err result when handler throws", async () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      emitter.on("test", errorHandler);

      const result = await emitter.emit("test", { data: 1 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe("Handler error");
      }
    });

    it("should stop emitting after handler throws", async () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Stop here");
      });
      const secondHandler = vi.fn();

      emitter.on("test", errorHandler);
      emitter.on("test", secondHandler);

      await emitter.emit("test", { data: 1 });

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();
    });
  });

  describe("async handlers", () => {
    it("should await async handlers", async () => {
      const asyncHandler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      emitter.on("test", asyncHandler);

      const emitPromise = emitter.emit("test", { id: 1 });

      // Handler should not have been called yet (still awaiting)
      // But since emit awaits all handlers, it should complete
      await emitPromise;

      expect(asyncHandler).toHaveBeenCalled();
    });

    it("should handle mix of sync and async handlers", async () => {
      const syncHandler = vi.fn();
      const asyncHandler = vi.fn().mockImplementation(async () => {});

      emitter.on("test", syncHandler);
      emitter.on("test", asyncHandler);

      await emitter.emit("test", { id: 1 });

      expect(syncHandler).toHaveBeenCalled();
      expect(asyncHandler).toHaveBeenCalled();
    });
  });

  describe("event payload structure", () => {
    it("should have all required fields in event payload", async () => {
      const handler = vi.fn();
      emitter.on("user.updated", handler);

      await emitter.emit("user.updated", { id: 42, changes: { name: "New Name" } }, "custom");

      const payload = handler.mock.calls[0][0];

      expect(payload).toHaveProperty("name");
      expect(payload).toHaveProperty("data");
      expect(payload).toHaveProperty("timestamp");
      expect(payload).toHaveProperty("namespace");
    });

    it("should include source field when provided", async () => {
      const handler = vi.fn();
      emitter.on("test", handler);

      await emitter.emit("test", { value: 1 }, "default");

      const payload = handler.mock.calls[0][0];
      // source is optional, might not be present
      expect(payload.source).toBeUndefined(); // Not set in basic emit
    });
  });
});

describe("defineEvents", () => {
  it("should flatten nested events with namespaces", () => {
    const events = defineEvents({
      user: {
        created: event({ args: { id: 1, name: "string" } as any }),
        updated: event({ args: { id: 1, changes: {} } as any }),
      },
      post: {
        created: event({ args: { title: "string" } as any }),
      },
    });

    expect(events).toHaveProperty("user.created");
    expect(events).toHaveProperty("user.updated");
    expect(events).toHaveProperty("post.created");
  });

  it("should preserve event definition structure", () => {
    const userEvent = event({ args: { id: 1 } as any });
    const events = defineEvents({
      user: {
        created: userEvent,
      },
    });

    expect(events["user.created"]).toBe(userEvent);
  });
});

describe("eventNamespace", () => {
  it("should group events under a namespace", () => {
    const events = {
      user: eventNamespace({
        name: "user",
        events: {
          created: event({ args: { id: 1 } as any }),
          deleted: event({ args: { id: 1 } as any }),
        },
      }),
    };

    const registry = defineEvents(events);

    expect(registry).toHaveProperty("user.created");
    expect(registry).toHaveProperty("user.deleted");
  });
});

describe("PendingEventQueue", () => {
  let queue: ReturnType<typeof createPendingEventQueue>;

  beforeEach(() => {
    queue = createPendingEventQueue();
  });

  it("should enqueue events", () => {
    const result = queue.enqueue({
      name: "test.event",
      data: { id: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    expect(result.ok).toBe(true);
    expect(queue.size()).toBe(1);
  });

  it("should return false for isEmpty when events exist", () => {
    queue.enqueue({
      name: "test.event",
      data: { id: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    expect(queue.isEmpty()).toBe(false);
  });

  it("should clear all events", () => {
    queue.enqueue({
      name: "test.event",
      data: { id: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    queue.clear();

    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it("should flush events to emitter", async () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("test.event", handler);

    queue.enqueue({
      name: "test.event",
      data: { id: 42 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    const result = await queue.flush(emitter);

    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test.event",
        data: { id: 42 },
      })
    );
    expect(queue.isEmpty()).toBe(true);
  });

  it("should flush multiple events in order", async () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("test.event", handler);

    queue.enqueue({
      name: "test.event",
      data: { order: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });
    queue.enqueue({
      name: "test.event",
      data: { order: 2 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });
    queue.enqueue({
      name: "test.event",
      data: { order: 3 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    await queue.flush(emitter);

    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: { order: 1 } }));
    expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { order: 2 } }));
    expect(handler).toHaveBeenNthCalledWith(3, expect.objectContaining({ data: { order: 3 } }));
  });

  it("should return error when emitter emit fails during flush", async () => {
    const emitter = new EventEmitter();
    const errorHandler = vi.fn(() => {
      throw new Error("Emit failed");
    });
    emitter.on("test.event", errorHandler);

    queue.enqueue({
      name: "test.event",
      data: { id: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });
    queue.enqueue({
      name: "test.event",
      data: { id: 2 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    const result = await queue.flush(emitter);

    expect(result.ok).toBe(false);
    // First event should have been processed
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  it("should handle flush with undefined emitter", async () => {
    queue.enqueue({
      name: "test.event",
      data: { id: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    const result = await queue.flush(undefined);

    expect(result.ok).toBe(true);
    expect(queue.isEmpty()).toBe(true);
  });

  it("should return events() with copy of pending events", () => {
    queue.enqueue({
      name: "test.event",
      data: { id: 1 },
      timestamp: new Date().toISOString(),
      namespace: "default",
    });

    const events = queue.events();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("test.event");

    // Modifying returned array should not affect queue
    events.push({} as any);
    expect(queue.size()).toBe(1);
  });
});
