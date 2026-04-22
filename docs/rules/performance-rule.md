# Performance Rule - "Performance par Design"

## Rule

**Avoid spread in loops - use Object.assign.**
**Route memoization with Map.**
**Lazy Proxy creation.**

## Why

Performance problems are often architectural:
- Spread in loops creates O(n) object allocations
- Repeated route lookups waste CPU cycles
- Eager Proxy creation wastes memory
- These patterns compound in hot paths

## Anti-Patterns (Forbidden)

```typescript
// WRONG - spread in loop
const mergeConfigs = (configs: Config[]): Config => {
  let result = {};
  for (const config of configs) {
    result = { ...result, ...config }; // New object each iteration!
  }
  return result;
};

// WRONG - repeated route lookups
const router = createRouter();
const handleRequest = (req: Request) => {
  const route1 = router.match("/users");     // Lookup
  const route2 = router.match("/users/:id"); // Lookup again
  const route3 = router.match("/users/list"); // Lookup AGAIN
  // Every request does 3 lookups!
};

// WRONG - eager Proxy creation
const createProxies = (targets: Target[]) =>
  targets.map(target => new Proxy(target, handler)); // All created upfront!

// WRONG - object spread for merging
const combine = (a: Obj, b: Obj, c: Obj) => ({ ...a, ...b, ...c });
// Each spread = new object allocation
```

## Correct Patterns

### 1. Object.assign for Merging (Avoid Spread in Loops)

```typescript
// GOOD - Object.assign is optimized
const mergeConfigs = (configs: Config[]): Config =>
  Object.assign({}, ...configs); // Single allocation

// GOOD - Object.assign in loop
const mergeInLoop = (configs: Config[]): Config => {
  const result: Record<string, unknown> = {};
  for (const config of configs) {
    Object.assign(result, config); // Mutates result, no new allocation
  }
  return result as Config;
};

// GOOD - Pre-allocate and mutate
const buildResponse = (base: Response, additions: Partial<Response>): Response => {
  const response = Object.assign({}, base); // Single copy
  Object.assign(response, additions);
  return response;
};
```

### 2. Route Memoization with Map

```typescript
// GOOD - memoized route matching
const createMemoizedRouter = <T>(routes: Route[]) => {
  const routeMap = new Map<string, T>();

  const match = (path: string): T | undefined => {
    if (routeMap.has(path)) {
      return routeMap.get(path); // O(1) lookup
    }
    const matched = findRoute(routes, path);
    routeMap.set(path, matched);
    return matched;
  };

  return { match };
};

// GOOD - lazy initialization
const cache = new Map<string, Handler>();

const getHandler = (path: string): Handler => {
  if (cache.has(path)) {
    return cache.get(path)!;
  }

  const handler = createHandler(path);
  cache.set(path, handler); // Created on first use
  return handler;
};

// GOOD - LRU cache for bounded memoization
const createLRUCache = <K, V>(maxSize: number) => {
  const cache = new Map<K, V>();

  return {
    get: (key: K): V | undefined => {
      const value = cache.get(key);
      if (value !== undefined) {
        cache.delete(key);
        cache.set(key, value); // Move to end (most recently used)
      }
      return value;
    },
    set: (key: K, value: V) => {
      if (cache.has(key)) cache.delete(key);
      else if (cache.size >= maxSize) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
      cache.set(key, value);
    },
  };
};
```

### 3. Lazy Proxy Creation

```typescript
// WRONG - eager Proxy
const createEagerProxy = <T extends object>(target: T): T =>
  new Proxy(target, handler); // Created immediately

// GOOD - lazy Proxy via factory
const createLazyProxy = <T extends object>(
  factory: () => T,
  handler: ProxyHandler<T>
): T => {
  let proxy: T | undefined;

  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!proxy) {
        proxy = new Proxy(factory(), handler); // Created on first access
      }
      return Reflect.get(proxy, prop, receiver);
    },
  });
};

// GOOD - Proxy only when needed
const withLazyProxy = <T extends object>(
  target: T,
  conditions: { shouldProxy: boolean }
): T => {
  if (!conditions.shouldProxy) {
    return target; // No Proxy created!
  }
  return new Proxy(target, handler); // Created only if needed
};

// GOOD - WeakMap for conditional Proxy storage
const proxyCache = new WeakMap<object, object>();

const getOrCreateProxy = <T extends object>(target: T): T => {
  if (proxyCache.has(target)) {
    return proxyCache.get(target) as T;
  }
  const proxy = new Proxy(target, handler);
  proxyCache.set(target, proxy);
  return proxy;
};
```

### 4. Performance in Hot Paths

```typescript
// GOOD - batch operations
const batchProcess = (items: Item[]): Result[] => {
  const results: Result[] = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    results[i] = processItem(items[i]); // Pre-allocate array
  }
  return results;
};

// GOOD - reuse objects in loops
const transformItems = (items: Item[], template: Obj): Obj[] =>
  items.map(item => Object.assign({}, template, item));

// GOOD - String interning for repeated strings
const intern = (() => {
  const cache = new Map<string, string>();
  return (s: string): string => {
    if (cache.has(s)) return cache.get(s)!;
    cache.set(s, s);
    return s;
  };
})();
```

## Quick Reference

| Anti-Pattern | Performance Fix |
|-------------|-----------------|
| `{ ...obj }` in loop | `Object.assign(target, obj)` |
| `map.get(k)` repeated | `Map` with memoization |
| `new Proxy()` eagerly | Lazy Proxy via getter |
| `[...arr].map(f)` | `arr.map(f)` directly |

## Enforcement

- Profile before optimizing
- Use `Object.assign` over spread for merging
- Cache route lookups with Map
- Create Proxies lazily (on first access)
- Pre-allocate arrays in loops

## When to Optimize

| Scenario | Action |
|----------|--------|
| Hot path (called >1000x/sec) | Apply these rules |
| Cold path (<100x/sec) | Prefer readability |
| Not measured | Don't optimize |

Measure first, then optimize based on profiling data.
