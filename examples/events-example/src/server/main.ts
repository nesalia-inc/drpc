/**
 * Events Example - Main Entry Point
 *
 * This example demonstrates the event system features of @deessejs/server:
 * - defineEvents() - Defining typed event registries
 * - ctx.send() - Emitting events from mutation handlers
 * - t.on() - Registering global event listeners
 * - Transaction integrity - Events only emitted on success
 * - Wildcard patterns - Using "user.*" to listen to multiple events
 * - Unsubscribe - Cleaning up event listeners
 */

import { executor, api } from "./index";
import { createClient } from "../client";

// ============================================================================
// Demo: Event System Features
// ============================================================================

async function main() {
  console.log("=".repeat(70));
  console.log("@deessejs/server - Event System Example");
  console.log("=".repeat(70));
  console.log();

  // -------------------------------------------------------------------------
  // 1. Create a user (triggers user.created and email.sent events)
  // -------------------------------------------------------------------------
  console.log("--- 1. Create User (triggers multiple events) ---");
  const createResult = await api.users.create({
    name: "Charlie Davis",
    email: "charlie@example.com",
  });

  if (createResult.ok) {
    console.log("User created:", createResult.value);
  } else {
    console.log("Error:", createResult.error);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 2. List all users
  // -------------------------------------------------------------------------
  console.log("--- 2. List All Users ---");
  const listResult = await api.users.list({});
  if (listResult.ok) {
    console.log("Users:", listResult.value);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 3. Update a user (triggers user.updated event)
  // -------------------------------------------------------------------------
  console.log("--- 3. Update User ---");
  const updateResult = await api.users.update({
    id: 3,
    name: "Charles Davis",
  });

  if (updateResult.ok) {
    console.log("User updated:", updateResult.value);
  } else {
    console.log("Error:", updateResult.error);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 4. Try to update non-existent user (should fail, no events emitted)
  // -------------------------------------------------------------------------
  console.log("--- 4. Update Non-existent User (no events) ---");
  const badUpdateResult = await api.users.update({
    id: 999,
    name: "Nobody",
  });

  if (badUpdateResult.ok) {
    console.log("Updated:", badUpdateResult.value);
  } else {
    console.log("Expected error:", badUpdateResult.error);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 5. Delete a user (triggers user.deleted event)
  // -------------------------------------------------------------------------
  console.log("--- 5. Delete User ---");
  const deleteResult = await api.users.delete({ id: 3 });

  if (deleteResult.ok) {
    console.log("Delete result:", deleteResult.value);
  } else {
    console.log("Error:", deleteResult.error);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 6. Demonstrate client API usage
  // -------------------------------------------------------------------------
  console.log("--- 6. Using Client API ---");
  const client = createClient();

  try {
    const users = await client.users.list();
    console.log("Client listed users:", users.length);

    const newUser = await client.users.create({
      name: "Diana Prince",
      email: "diana@example.com",
    });
    console.log("Client created user:", newUser);
  } catch (error) {
    console.log("Client error:", error);
  }
  console.log();

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("=".repeat(70));
  console.log("Summary: The event system");
  console.log("- Registered t.on() listeners captured user.* and email.* events");
  console.log("- These events are processed asynchronously via global listeners");
  console.log("- The audit log and email records in context.db were updated");
  console.log("- Transaction integrity: failed mutations did NOT emit events");
  console.log("=".repeat(70));
}

// Run the example
main().catch(console.error);
