# Plugin Typing Solutions: How to Get TypeScript to Know About Dynamic `t` Enrichments

## The Problem

```typescript
const t = createQueryBuilder({
  plugins: [qstashPlugin, redisPlugin]  // dynamic at runtime
});

// TypeScript cannot know t.task exists
t.task({ ... }) // Error: Property 'task' does not exist
```

When plugins are passed as a runtime array, TypeScript loses track of what methods they add to `t`.

---

## Solution 1: CLI Type Generation

Generate `.d.ts` files at build time from plugin declarations.

### How It Works

```bash
# plugins declare their enrichments
# packages/server/plugins/qstash/src/index.ts
export const qstashPlugin = {
  name: "qstash",
  enrichT: "qstash",  // points to type definition
};

// CLI generates types
deesse generate --plugins @deessejs/server/plugins/qstash,@deessejs/server/plugins/redis
```

### Generated Output

```typescript
// packages/server/src/generated/plugin-enrichments.d.ts
declare module "@deessejs/server" {
  interface QueryBuilderEnrichments {
    qstash: QStashEnrichment;
    redis: RedisEnrichment;
  }
}
```

### Pros
- Works today with TypeScript
- Precise types
- No runtime overhead

### Cons
- Build step required
- Must regenerate on plugin change
- Extra dependency in build pipeline

### Implementation Complexity
**Medium** - File generation is straightforward.

---

## Solution 2: HKT (Higher Kinded Types)

Use a pattern where types "carry" their enrichment information through type-level computation.

### How It Works

```typescript
// Higher-kinded type that "holds" enrichments
type QueryBuilderHKT<E extends Enrichment[]> = {
  _enrichments: E;
  query<Args, Output>(config: QueryConfig<Args, Output>): QueryWithHooks<Args, Output>;
};

// Type-level computation: AddEnrichment<HKT, NewEnrichment>
type AddEnrichment<HKT, New> = HKT extends QueryBuilderHKT<infer E>
  ? QueryBuilderHKT<[...E, New]>
  : never;

// Enriched query builder emerges from HKT
type EnrichedT<HKT> = {
  [K in keyof ExtractEnrichments<HKT>]: ExtractEnrichmentMethods<HKT, K>
} & {
  query<Args, Output>(config: QueryConfig<Args, Output>): QueryWithHooks<Args, Output>;
};
```

### Usage

```typescript
// Each plugin implements Enrichment<Ctx>
interface QStashEnrichment {
  task: (config: TaskConfig) => InternalMutation;
}

type QStashPlugin = Enrichment<{}, QStashEnrichment>;

// Type flows through computation
type WithQStash = AddEnrichment<BaseQueryBuilderHKT, QStashPlugin>;
type AppT = EnrichedT<WithQStash>;

// Now t.task() is known
const t: AppT;
t.task({ ... });  // ✓ TypeScript knows this
```

### Pros
- Type-safe at 100%
- No build step
- Computed at type level

### Cons
- Very complex TypeScript (poor IDE support)
- Requires deep HKT understanding
- Not native TypeScript - needs workarounds

### Implementation Complexity
**Extremely High** - HKT not natively supported in TypeScript.

---

## Solution 3: Builder Chain Pattern

Plugins are applied via chained method calls that TypeScript can infer progressively.

### How It Works

```typescript
// Start chain with empty plugins
const builder = defineContext();

// Chain plugins - TypeScript infers progressively
const withQStash = builder.use(qstashPlugin({ token: "...", baseURL: "..." }));
const withRedis = withQStash.use(redisPlugin({ url: "...", token: "..." }));

// Build returns final types
const { t, createAPI } = withRedis.build({ context: { db } });

// t.task() and t.cache() are now known
t.task({ ... });    // ✓
t.cache.get(...)     // ✓
```

### Type Inference Flow

```typescript
// TypeScript infers step by step
type _0 = DefineContextBuilder<{}, []>;           // no plugins

type _1 = AddPlugin<_0, QStashPlugin>;            // after .use(qstash)
type _2 = AddPlugin<_1, RedisPlugin>;             // after .use(redis)

type Final = Build<_2>;                            // after .build()
```

### Pros
- Native TypeScript inference
- No build step
- IDE autocomplete works
- Self-documenting API

### Cons
- Different API from current `defineContext({ plugins: [...] })`
- Breaking change if we change approach

### Implementation Complexity
**Medium** - Builder pattern is well-understood.

---

## Solution 4: Declaration Merging + Manual Declaration

User explicitly declares plugin enrichments via TypeScript module augmentation.

### How It Works

```typescript
// packages/server/plugins/qstash/src/index.ts
export interface QStashEnrichment {
  task: (config: TaskConfig) => InternalMutation;
}

// packages/server/src/index.ts
declare module "@deessejs/server" {
  interface QueryBuilderEnrichments {
    qstash: QStashEnrichment;
  }
}
```

### Usage

```typescript
// User imports plugin
import { qstashPlugin } from "@deessejs/server/plugins/qstash";

// No type code needed - augmentation happens automatically
defineContext({ plugins: [qstashPlugin(...)] });

// But to get t.task(), must use "as" cast or similar
const t = getT() as EnrichedQueryBuilder;  // ← Ugly
```

### Pros
- Simple to implement
- Works today

### Cons
- User must manually merge types
- Not automatic
- `as` casts pollute codebase
- Easily forgotten

### Implementation Complexity
**Low** - Just declaration files.

---

## Solution 5: Template Literal Types + Plugin Registry

All possible enrichments are pre-declared in a registry, and the type is computed from the plugins array.

### How It Works

```typescript
// Central registry of all known plugin enrichments
const PLUGIN_ENRICHMENTS = {
  qstash: qstashEnrichment,
  redis: redisEnrichment,
  // ... more plugins
} as const;

type PluginRegistry = typeof PLUGIN_ENRICHMENTS;

// Type extracts keys from plugins array
type ExtractEnrichments<P extends Plugin<any>[]> = {
  [K in keyof P]: K extends keyof PluginRegistry
    ? PluginRegistry[K]
    : never
}[number];

// Enrichment union is computed
type AppEnrichments = ExtractEnrichments<typeof plugins>;
```

### Pros
- Central place for plugin types
- Type-safe
- Discoverable

### Cons
- Registry must be manually updated
- Only works for known plugins
- Runtime overhead to check registry

### Implementation Complexity
**Medium** - Registry pattern is simple.

---

## Solution 6: Type-Class Pattern (TypeScript 5.5+)

Use infer + conditional types to extract plugin types dynamically.

### How It Works

```typescript
// Each plugin has a static type property
interface PluginWithType<Ctx, E extends Record<string, unknown>> {
  name: string;
  enrichT?: () => E;
  __type?: E;  // Type marker for inference
}

// TypeScript 5.5+ can infer from __type
type InferEnrichment<P> = P extends { __type: infer E } ? E : {};

// Union of all enrichments from plugins array
type AllEnrichments<P extends Plugin<any>[]> = UnionToIntersection<
  { [K in keyof P]: InferEnrichment<P[K]> }[number]
>;

// Augmented t
type EnrichedT<C, P extends Plugin<any>[]> = T & AllEnrichments<P>;
```

### Pros
- Fully automatic inference
- No manual declaration
- Works with existing plugin shape

### Cons
- Requires TypeScript 5.5+ features
- Complex conditional types
- UnionToIntersection is non-trivial

### Implementation Complexity
**High** - Advanced type techniques.

---

## Solution 7: Macros / Compile-time Evaluation

Use a macro system (like ts-macros or custom babel plugin) to transform code at compile time.

### How It Works

```typescript
// Macro transforms this at compile time
const { t } = defineContext({
  plugins: [qstashPlugin(), redisPlugin()]
});

// Into something like:
const { t } = defineContext({
  plugins: [qstashPlugin()]
});
// Plus auto-generated augmentation

// Macro sees plugins and generates:
declare module "@deessejs/server" {
  interface QueryBuilderEnrichments {
    qstash: QStashEnrichment;
    redis: RedisEnrichment;
  }
}
```

### Pros
- Fully automatic
- No runtime overhead
- Can generate anything

### Cons
- Requires build tool integration
- Macro system adds complexity
- Debugging can be hard

### Implementation Complexity
**High** - Need macro system integration.

---

## Solution 8: Deno-style Import Assertions

Use import assertions to get static type information from plugins at import time.

### How It Works

```typescript
// Plugin declares its type at export
export type QStashEnrichment = { ... };
export const qstashPlugin = { ... };

// Import includes type information
import type { QStashEnrichment } from "@deessejs/server/plugins/qstash";

type AppPlugins = [QStashEnrichment, RedisEnrichment];
type EnrichedT = AddEnrichments<BaseT, AppPlugins>;
```

### Pros
- Explicit typing
- Works today
- Type information flows naturally

### Cons
- Manual type import required
- Multiple imports (value + type)
- Not automatic

### Implementation Complexity
**Low** - Just convention.

---

## Solution 9: Shared Context Generics

Pass types explicitly via generic parameter that flows through the chain.

### How It Works

```typescript
// Plugins are typed generics
function defineContext<Plugins extends Plugin<any>[] = []>(config: {
  plugins?: Plugins;
}): {
  t: QueryBuilder & InferPlugins<Plugins>;
  createAPI: (config: { router: Router }) => TypedAPI;
};

// Infer plugins adds their methods
type InferPlugins<P extends Plugin<any>[]> = {
  [K in keyof P]: P[K] extends Plugin<infer Ctx>
    ? P[K] extends { enrichT: () => infer E }
      ? E
      : {}
    : {}
};
```

### Usage

```typescript
// Type flows through generics
const { t, createAPI } = defineContext({
  plugins: [qstashPlugin({...}), redisPlugin({...})]
});

// TypeScript knows via generic inference
t.task({ ... });    // ✓
t.cache.get(...)     // ✓
```

### Pros
- Works with existing patterns
- No build step
- Automatic

### Cons
- Generic inference limits (max 10-20 plugins?)
- Complex type errors if wrong
- Still has TypeScript limitations

### Implementation Complexity
**Medium** - Standard TypeScript generics.

---

## Solution 10: Phantom Types + Phantom Pattern

Use phantom type parameters that "carry" plugin information without runtime cost.

### How It Works

```typescript
// Phantom type parameter
type QueryBuilder<Ctx, E = {}> = {
  query<Args, Output>(config: QueryConfig<Args, Output>): QueryWithHooks<Args, Output>;
  // ...other methods
};

// Phantom parameter E carries enrichment info
const qstash = <Ctx, E extends Record<string, unknown> = {}>(
  config: QStashConfig
): QueryBuilder<Ctx, E & QStashEnrichment> => {
  return new QueryBuilder<Ctx, E & QStashEnrichment>(...);
};

// Chain uses phantom types
const t = new QueryBuilder<MyCtx, {}>();
const t2 = qstash<MyCtx, {}>(config);  // E = QStashEnrichment
t2.task({ ... });  // ✓ TypeScript knows
```

### Pros
- No runtime cost
- Type-safe
- Works with method chaining

### Cons
- Phantom types can be confusing
- Requires explicit generic parameters
- Not fully automatic

### Implementation Complexity
**Medium** - Phantom types are well-documented.

---

## Comparison Matrix

| Solution | TypeScript Native | Build Step | Auto-Infer | Complexity |
|----------|-------------------|------------|------------|------------|
| CLI Generation | Yes | Yes | No | Medium |
| HKT | No | No | Yes | Extreme |
| Builder Chain | Yes | No | Yes | Medium |
| Declaration Merging | Yes | No | No | Low |
| Plugin Registry | Yes | No | Partial | Medium |
| Type-Class | Yes | No | Yes | High |
| Macros | Yes | Yes | Yes | High |
| Import Assertions | Yes | No | No | Low |
| Shared Generics | Yes | No | Yes | Medium |
| Phantom Types | Yes | No | Yes | Medium |

---

## Recommendation

### For Initial Implementation: **Builder Chain (Solution 3)**

- Most natural TypeScript inference
- No build step
- Self-documenting API
- Reasonable complexity

### For Maximum Type Safety: **CLI Generation (Solution 1)**

- Guaranteed correct types
- No TypeScript workarounds
- Works with any approach
- Requires build step

### For Future (TypeScript Evolution): **HKT (Solution 2)**

- Most powerful
- When TypeScript supports HKT natively
- Currently too complex

---

## Hybrid Approach

Could combine solutions:

1. **Builder Chain** for main API (works today)
2. **CLI Generation** for generating the base type declarations
3. **Plugin Registry** as fallback for unknown plugins

This gives:
- Great DX (Builder Chain)
- Type safety (CLI + Registry)
- No major compromises

---

## See Also

- [Plugin Enrich `t`](./README.md) - The behavior enrichment approach
- [Plugin Procedure System](./plugin-procedure-system.md) - Alternative approach (router-based)
- [Higher Kinded Types in TypeScript](https://code.lol/post/programming/higher-kinded-types/) - HKT patterns
- [TypeScript 5.5 Inference Improvements](https://www.typescriptlang.org/docs/) - Latest inference features
