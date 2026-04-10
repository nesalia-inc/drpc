/**
 * User Router
 *
 * This module defines the user-related procedures (queries and mutations).
 * It demonstrates how to use ctx.send() to emit events from mutations.
 */

import { t, createAPI } from "./context";
import { events } from "./events";
import { ok, err, error } from "@deessejs/fp";
import { z } from "zod";

// ============================================================================
// Error Definitions
// ============================================================================

const NotFoundError = error({
  name: "NotFoundError",
  message: (args: { id: number }) => `User with ID ${args.id} not found`,
});

const ValidationError = error({
  name: "ValidationError",
  message: (args: { field: string; message: string }) =>
    `Validation error on ${args.field}: ${args.message}`,
});

// ============================================================================
// User CRUD Procedures
// ============================================================================

// Query: List all users
const listUsers = t.query({
  handler: async (ctx) => {
    return ok([...ctx.db.users]);
  },
});

// Query: Get user by ID
const getUser = t.query({
  args: z.object({
    id: z.number().int().positive("ID must be a positive integer"),
  }),
  handler: async (ctx, args) => {
    const user = ctx.db.users.find((u) => u.id === args.id);
    if (!user) {
      return err(NotFoundError({ id: args.id }));
    }
    return ok(user);
  },
});

// Mutation: Create a new user
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
  }),
  handler: async (ctx, args) => {
    // Check for duplicate email
    const existing = ctx.db.users.find((u) => u.email === args.email);
    if (existing) {
      return err(
        ValidationError({
          field: "email",
          message: "Email already in use",
        })
      );
    }

    // Create the user
    const user = {
      id: ctx.db.nextUserId++,
      name: args.name,
      email: args.email,
    };

    ctx.db.users.push(user);

    // Emit event on success - events are only emitted if the mutation succeeds
    ctx.send(events["user.created"], {
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Also emit an email event for welcome email
    ctx.send(events["email.sent"], {
      to: user.email,
      template: "welcome",
      subject: "Welcome to our platform!",
    });

    return ok(user);
  },
});

// Mutation: Update an existing user
const updateUser = t.mutation({
  args: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  }),
  handler: async (ctx, args) => {
    const userIndex = ctx.db.users.findIndex((u) => u.id === args.id);
    if (userIndex === -1) {
      return err(NotFoundError({ id: args.id }));
    }

    const user = ctx.db.users[userIndex];
    const changes: Record<string, unknown> = {};

    // Apply updates and track changes
    if (args.name !== undefined && args.name !== user.name) {
      changes.name = { from: user.name, to: args.name };
      user.name = args.name;
    }

    if (args.email !== undefined && args.email !== user.email) {
      // Check for duplicate email
      const emailExists = ctx.db.users.find(
        (u) => u.email === args.email && u.id !== args.id
      );
      if (emailExists) {
        return err(
          ValidationError({
            field: "email",
            message: "Email already in use",
          })
        );
      }
      changes.email = { from: user.email, to: args.email };
      user.email = args.email;
    }

    // Only emit if there were actual changes
    if (Object.keys(changes).length > 0) {
      ctx.send(events["user.updated"], {
        id: user.id,
        changes,
      });
    }

    return ok(user);
  },
});

// Mutation: Delete a user
const deleteUser = t.mutation({
  args: z.object({
    id: z.number().int().positive(),
  }),
  handler: async (ctx, args) => {
    const userIndex = ctx.db.users.findIndex((u) => u.id === args.id);
    if (userIndex === -1) {
      return err(NotFoundError({ id: args.id }));
    }

    const user = ctx.db.users[userIndex];
    ctx.db.users.splice(userIndex, 1);

    // Emit deletion event
    ctx.send(events["user.deleted"], { id: user.id });

    return ok({ deleted: true, id: args.id });
  },
});

// ============================================================================
// Export Router
// ============================================================================

export const usersRouter = t.router({
  list: listUsers,
  get: getUser,
  create: createUser,
  update: updateUser,
  delete: deleteUser,
});
