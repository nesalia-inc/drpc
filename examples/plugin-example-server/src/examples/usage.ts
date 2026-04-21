/**
 * Pure Server-Side Plugin Demo
 *
 * This script demonstrates calling @deessejs/server procedures directly,
 * without any HTTP server. All calls are plain TypeScript function invocations.
 *
 * Run with:
 *   pnpm dev
 *
 * What this shows:
 *   1. Public queries (list, get) work with no authentication.
 *   2. Auth-guarded mutations fail when userId is null (anonymous API).
 *   3. Auth-guarded mutations succeed when called via an authenticated API instance.
 *   4. The cache plugin keeps data in memory and is invalidated on writes.
 *   5. Role-based checks (admin-only delete) work correctly.
 */

import { api, createUserAPI } from "../api/index.js";

// Cast to any to satisfy TypeScript's static analysis.
// The Proxy-based API exposes procedures dynamically at runtime,
// which TypeScript's type system cannot track through nested property chains.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = api as any;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function log(label: string, value: unknown) {
  console.log(`  ${label}:`, JSON.stringify(value, null, 2));
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Pure Server-Side Plugin Demo ===");
  console.log("No HTTP. No requests. Just procedure calls.\n");

  // ── 1. Public query: list all users ────────────────────────────────────────
  section("1. List all users (public - no auth needed)");

  const listResult1 = await rpc.users.list();
  if (listResult1.ok) {
    console.log(`  Found ${listResult1.value.length} users:`);
    for (const u of listResult1.value) {
      console.log(`    - [${u.id}] ${u.name} <${u.email}> (${u.role})`);
    }
  }

  // ── 2. Second call hits the cache ──────────────────────────────────────────
  section("2. List users again (should be served from cache)");

  const listResult2 = await rpc.users.list();
  if (listResult2.ok) {
    console.log(`  Returned ${listResult2.value.length} users (from cache).`);
  }

  // ── 3. Public query: get user by ID ────────────────────────────────────────
  section("3. Get user by ID (public - no auth needed)");

  const getResult = await rpc.users.get({ id: 2 });
  if (getResult.ok) {
    log("User", getResult.value);
  }

  const getMissing = await rpc.users.get({ id: 999 });
  if (!getMissing.ok) {
    console.log(`  Get id=999 -> error: ${getMissing.error.message}`);
  }

  // ── 4. Auth-guarded mutation WITHOUT authentication ─────────────────────────
  section("4. Create user WITHOUT auth (should fail)");

  // api has userId: null - authPlugin.requireAuth() will throw.
  const anonCreate = await rpc.users.create({
    name: "Ghost",
    email: "ghost@example.com",
  });

  if (!anonCreate.ok) {
    console.log(`  Expected failure: ${anonCreate.error.message}`);
  } else {
    console.log("  Unexpected success:", anonCreate.value);
  }

  // ── 5. Auth-guarded mutation WITH authentication ────────────────────────────
  section("5. Create user WITH auth (userId=1, Alice - admin)");

  // createUserAPI(1) builds an API instance whose base context has userId=1.
  // The authPlugin derives isAuthenticated=true and a no-op requireAuth().
  const adminApi = createUserAPI(1);

  const authCreate = await (adminApi as any).users.create({
    name: "Dave Brown",
    email: "dave@example.com",
  });

  if (authCreate.ok) {
    console.log("  User created successfully:");
    log("New user", authCreate.value);
  } else {
    console.log("  Unexpected error:", authCreate.error.message);
  }

  // ── 6. Verify the new user appears in subsequent list ──────────────────────
  section("6. List users after create (cache was invalidated on write)");

  const listAfterCreate = await rpc.users.list();
  if (listAfterCreate.ok) {
    console.log(`  Found ${listAfterCreate.value.length} users (Dave should be in the list):`);
    for (const u of listAfterCreate.value) {
      console.log(`    - [${u.id}] ${u.name} <${u.email}> (${u.role})`);
    }
  }

  // ── 7. Regular user cannot delete (role check) ─────────────────────────────
  section("7. Delete user as regular user (userId=2, Bob) - should fail with FORBIDDEN");

  const bobApi = createUserAPI(2);

  const bobDelete = await (bobApi as any).users.delete({ id: 3 });
  if (!bobDelete.ok) {
    console.log(`  Expected failure: ${bobDelete.error.message}`);
  }

  // ── 8. Admin user can delete ───────────────────────────────────────────────
  section("8. Delete user as admin (userId=1, Alice) - should succeed");

  // Delete Dave (id=4, created in step 5).
  const adminDelete = await (adminApi as any).users.delete({ id: 4 });
  if (adminDelete.ok) {
    console.log("  Deleted successfully:", JSON.stringify(adminDelete.value));
  } else {
    console.log("  Unexpected error:", adminDelete.error.message);
  }

  // ── 9. Post queries ─────────────────────────────────────────────────────────
  section("9. List posts (public) - first call populates cache");

  const postsResult = await rpc.posts.list();
  if (postsResult.ok) {
    console.log(`  Found ${postsResult.value.length} posts:`);
    for (const p of postsResult.value) {
      console.log(`    - [${p.id}] "${p.title}" (authorId=${p.authorId})`);
    }
  }

  // ── 10. Create a post as an authenticated user ──────────────────────────────
  section("10. Create post (userId=2, Bob) - auth required");

  const bobPostApi = createUserAPI(2);
  const newPost = await (bobPostApi as any).posts.create({
    title: "Server-Side Procedures",
    content: "Calling procedures directly is straightforward with @deessejs/server.",
  });

  if (newPost.ok) {
    console.log("  Post created:");
    log("New post", newPost.value);
  }

  // ── 11. Verify list reflects the new post ──────────────────────────────────
  section("11. List posts again (cache invalidated by create)");

  const postsAfter = await rpc.posts.list();
  if (postsAfter.ok) {
    console.log(`  Total posts: ${postsAfter.value.length}`);
  }

  // ── 12. Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("  Demo complete.");
  console.log("  Key takeaways:");
  console.log("    - Public procedures work on any API instance.");
  console.log("    - createUserAPI(userId) gives an authenticated API scope.");
  console.log("    - Plugins (auth, cache) work without any HTTP layer.");
  console.log("    - Cache is invalidated on writes, re-populated on reads.");
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
