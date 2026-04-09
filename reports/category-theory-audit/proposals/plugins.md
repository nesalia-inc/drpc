# Plugin Architecture

## Principle

Plugins extend context in a composable way with predictable combination rules.

## Core Types

```typescript
type PluginK<From, To> = (ctx: From) => PluginResult<To>

const composePlugins = <A, B, C>(
  f: PluginK<A, B>,
  g: PluginK<B, C>
): PluginK<A, C> => (ctx) => {
  const resultA = f(ctx)
  return {
    ...resultA,
    plugins: [...resultA.plugins, ...resultA.ctx | g | resultA.ctx],
  }
}
```

## Implementation

```typescript
interface Plugin<Ctx, ExtendedCtx> {
  name: string
  extend: (ctx: Ctx) => HKT<PluginM, ExtendedCtx>
}

const combinePlugins = <Ctx>(
  ...plugins: Plugin<Ctx, any>[]
): Plugin<Ctx, CombinedExtended> =>
  ({
    name: 'combined',
    extend: (ctx) => pipe(
      plugins,
      traverse((p) => p.extend(ctx)),
      map((extended) => mergeAll(extended))
    )
  })

type PluginNT<From extends PluginAny, To extends PluginAny> =
  <A>(p: From<A>) => To<p['extend'] extends (ctx: any) => infer R ? R : never>

const pluginMapper = <From extends PluginAny, To extends PluginAny>(
  nt: PluginNT<From, To>
): ((plugin: From) => To) =>
  (plugin) => ({
    name: plugin.name,
    extend: (ctx) => nt(plugin.extend(ctx)),
  })
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Composable** | Combine plugins with known laws |
| **Type-safe** | Extended context type computed from plugins |
| **Transformable** | Transform plugins (e.g., add logging) |

## Plugin Combinators

```typescript
const Plugin: {
  empty: Plugin<{}, {}>

  product: <P1 extends PluginAny, P2 extends PluginAny>(
    p1: P1,
    p2: P2
  ) => Plugin<Ctx1 & Ctx2, Extended1 & Extended2>

  coproduct: <P1 extends PluginAny, P2 extends PluginAny>(
    p1: P1,
    p2: P2
  ) => Plugin<Ctx1 | Ctx2, Extended1 | Extended2>

  config: <P extends PluginAny, Config>(
    configSchema: Schema<Config>,
    makePlugin: (config: Config) => P
  ) => Plugin<Ctx, Extended>
} = { ... }

const authPlugin = Plugin.coproduct(
  { name: 'basic-auth', extend: (ctx) => ({ userId: null }) },
  { name: 'jwt-auth', extend: (ctx) => ({ token: null }) },
)

const fullPlugin = Plugin.product(
  authPlugin,
  Plugin.product(cachePlugin, loggerPlugin)
)
```
