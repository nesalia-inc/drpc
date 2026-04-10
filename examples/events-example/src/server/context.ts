/**
 * Context Definition with Events
 *
 * This file demonstrates how to set up the application context
 * with the events system. Global event listeners (t.on) are
 * registered here for cross-cutting concerns like audit logging.
 */

import { defineContext } from "@deessejs/server";
import { events } from "./events";

// ============================================================================
// Type Definitions
// ============================================================================

// User entity
interface User {
  id: number;
  name: string;
  email: string;
}

// Audit log entry
interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: string;
  entity: string;
  entityId: number;
  details?: Record<string, unknown>;
}

// Email record
interface EmailRecord {
  id: number;
  to: string;
  template: string;
  subject: string;
  sentAt: string;
}

// Application context type
interface Context {
  db: {
    users: User[];
    nextUserId: number;
    auditLogs: AuditLogEntry[];
    nextAuditId: number;
    emails: EmailRecord[];
    nextEmailId: number;
  };
  logger: Console;
}

// ============================================================================
// Create Context with Events
// ============================================================================

const { t, createAPI } = defineContext({
  context: {
    db: {
      users: [
        { id: 1, name: "Alice Johnson", email: "alice@example.com" },
        { id: 2, name: "Bob Smith", email: "bob@example.com" },
      ],
      nextUserId: 3,
      auditLogs: [],
      nextAuditId: 1,
      emails: [],
      nextEmailId: 1,
    },
    logger: console,
  } as Context,
  // Pass the events registry for type-safe events
  events,
});

// ============================================================================
// Global Event Listeners (Cross-cutting Concerns)
// ============================================================================

// Audit logging - log all user events
t.on("user.created", async (ctx, payload) => {
  ctx.db.auditLogs.push({
    id: ctx.db.nextAuditId++,
    timestamp: new Date().toISOString(),
    action: "USER_CREATED",
    entity: "User",
    entityId: payload.data.id,
    details: { email: payload.data.email },
  });
  ctx.logger.log(`[AUDIT] User created: ${payload.data.email}`);
});

t.on("user.updated", async (ctx, payload) => {
  ctx.db.auditLogs.push({
    id: ctx.db.nextAuditId++,
    timestamp: new Date().toISOString(),
    action: "USER_UPDATED",
    entity: "User",
    entityId: payload.data.id,
    details: payload.data.changes,
  });
  ctx.logger.log(`[AUDIT] User ${payload.data.id} updated`);
});

t.on("user.deleted", async (ctx, payload) => {
  ctx.db.auditLogs.push({
    id: ctx.db.nextAuditId++,
    timestamp: new Date().toISOString(),
    action: "USER_DELETED",
    entity: "User",
    entityId: payload.data.id,
  });
  ctx.logger.log(`[AUDIT] User ${payload.data.id} deleted`);
});

// Email logging - track all sent emails
t.on("email.sent", async (ctx, payload) => {
  ctx.db.emails.push({
    id: ctx.db.nextEmailId++,
    to: payload.data.to,
    template: payload.data.template,
    subject: payload.data.subject,
    sentAt: new Date().toISOString(),
  });
  ctx.logger.log(`[EMAIL] Sent ${payload.data.template} to ${payload.data.to}`);
});

// Wildcard listener for all user events (demonstrates pattern matching)
// This fires for user.created, user.updated, user.deleted
t.on("user.*", (ctx, payload) => {
  ctx.logger.log(`[USER-EVENT] ${payload.name} occurred for user ${(payload.data as any).id}`);
});

export { t, createAPI };
