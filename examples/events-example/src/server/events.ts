/**
 * Event Registry Definition
 *
 * This file defines the typed events for the application.
 * Events are used to signal important state changes that can be
 * observed by global listeners for cross-cutting concerns like
 * audit logging, analytics, and notifications.
 */

import { defineEvents, event, eventNamespace } from "@deessejs/server";
import { z } from "zod";

// Define all events in the application with their data types
// This provides full type safety when emitting or listening to events

export const events = defineEvents({
  // User lifecycle events - using namespace syntax for grouped events
  user: eventNamespace({ name: "user", events: {
    created: event({ args: z.object({ id: z.number(), email: z.string(), name: z.string() }) }),
    updated: event({ args: z.object({ id: z.number(), changes: z.record(z.string(), z.unknown()) }) }),
    deleted: event({ args: z.object({ id: z.number() }) }),
  }}),

  // Email notification events
  email: eventNamespace({ name: "email", events: {
    sent: event({ args: z.object({ to: z.string(), template: z.string(), subject: z.string() }) }),
  }}),

  // Order events
  order: eventNamespace({ name: "order", events: {
    created: event({ args: z.object({ id: z.number(), userId: z.number(), total: z.number() }) }),
    shipped: event({ args: z.object({ id: z.number(), trackingNumber: z.string() }) }),
  }}),
});

// Type for the events registry - useful for external type checking
export type AppEvents = typeof events;
