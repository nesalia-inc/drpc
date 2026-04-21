/**
 * Post Routes
 *
 * Demonstrates:
 * - Using ctx.cache for caching query results
 * - Using ctx.requireAuth() and ctx.userId for protected mutations
 * - Cache invalidation on write operations
 *
 * FACTORY FUNCTION PATTERN:
 * We use a factory function to accept the QueryBuilder, avoiding circular
 * imports. The factory is called in api/index.ts after defineContext creates t.
 */

// import type { QueryBuilder, AppContext } from "@/api";
// import { ok, err, NotFoundError, ForbiddenError } from "@deessejs/server";
// import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// export function createPostRoutes(t: QueryBuilder<AppContext>) {
  // // Query: List all posts (public)
  // const listPosts = t.query({
  //   name: "posts.list",
  //   handler: async (ctx) => {
  //     const cacheKey = "posts:list";
  //     const cached = ctx.cache.get<Post[]>(cacheKey);
  //     if (cached) {
  //       console.log("[posts.list] Cache hit");
  //       return ok(cached);
  //     }
  //
  //     console.log("[posts.list] Cache miss, querying DB");
  //     const posts = [...ctx.db.posts];
  //     ctx.cache.set(cacheKey, posts, 10 * 1000); // 10 second TTL
  //
  //     return ok(posts);
  //   },
  // });
  //
  // // Query: Get post by ID (public)
  // const getPost = t.query({
  //   name: "posts.get",
  //   args: z.object({ id: z.number() }),
  //   handler: async (ctx, args) => {
  //     const post = ctx.db.posts.find((p) => p.id === args.id);
  //     if (!post) {
  //       return err(NotFoundError({ resource: "Post", id: args.id }));
  //     }
  //     return ok(post);
  //   },
  // });
  //
  // // Mutation: Create post (requires auth)
  // const createPost = t.mutation({
  //   name: "posts.create",
  //   args: z.object({
  //     title: z.string().min(1),
  //     content: z.string().min(1),
  //   }),
  //   handler: async (ctx, args) => {
  //     ctx.requireAuth(); // Auth guard
  //
  //     const post = {
  //       id: ctx.db.nextPostId++,
  //       title: args.title,
  //       content: args.content,
  //       authorId: ctx.userId!, // ctx.userId is guaranteed non-null after requireAuth()
  //     };
  //     ctx.db.posts.push(post);
  //
  //     // Invalidate list cache
  //     ctx.cache.del("posts:list");
  //
  //     return ok(post);
  //   },
  // });
  //
  // // Mutation: Delete post (requires admin)
  // const deletePost = t.mutation({
  //   name: "posts.delete",
  //   args: z.object({ id: z.number() }),
  //   handler: async (ctx, args) => {
  //     ctx.requireAuth();
  //
  //     const currentUser = ctx.db.users.find((u) => u.id === ctx.userId);
  //     if (currentUser?.role !== "admin") {
  //       return err(ForbiddenError({}));
  //     }
  //
  //     const index = ctx.db.posts.findIndex((p) => p.id === args.id);
  //     if (index === -1) {
  //       return err(NotFoundError({ resource: "Post", id: args.id }));
  //     }
  //
  //     ctx.db.posts.splice(index, 1);
  //     ctx.cache.del("posts:list");
  //
  //     return ok({ deleted: true });
  //   },
  // });
  //
  // return { list: listPosts, get: getPost, create: createPost, delete: deletePost };
// }
