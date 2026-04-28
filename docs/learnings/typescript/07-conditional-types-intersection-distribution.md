# TypeScript Conditional Types & Intersection Distribution

## Le problème

Quand on a un type intersection comme `QueryWithHooks = Query & HookedProcedureMixin` et qu'on veut vérifier si c'est une procédure via un conditional type:

```typescript
type Router<Ctx, Routes> = {
  [K in keyof Routes]: Routes[K] extends Procedure<Ctx, any, any>
    ? Routes[K]  // ← ici Routes[K] = QueryWithHooks = Query & HookedProcedureMixin
    : never;
};
```

TypeScript infère `never` pour `Routes[K]` dans certains cas.

## Pourquoi?

### Distribution conditionnelle

Les conditional types de la forme `T extends U ? A : B` **distribuent** sur les unions quand `T` est un paramètre générique nu.

Mais le problème ici est plus subtil avec les **intersections**.

Quand TypeScript évalue:
```
QueryWithHooks extends Procedure<Ctx, infer Args, infer Output>
```

Il voit que `QueryWithHooks = Query & HookedProcedureMixin`.

Pour une intersection `A & B`, quand on vérifie `A & B extends X`:
- TypeScript sépare les membres
- Chaque membre est vérifié séparément contre l'union `Procedure`
- Les branches qui échouent peuvent produire `never`

### Exemple minimal

```typescript
interface Query { type: 'query'; }
interface HookedMixin { beforeInvoke(): void; }

type QueryWithHooks = Query & HookedMixin;
type Procedure = { type: 'query' } | { type: 'mutation' };

// Ce qui se passe:
// QueryWithHooks extends Query          → true
// QueryWithHooks extends Mutation        → false → parfois infère never
```

## Solutions

### 1. Tuple brackets `[X] extends [Y]` (Recommandée par TypeScript)

Entoure les deux côtés de `extends` avec des tuples pour empêcher la distribution:

```typescript
// ❌ Problème - distribution
Routes[K] extends Procedure<Ctx, any, any>

// ✅ Solution - pas de distribution
[Routes[K]] extends [Procedure<Ctx, any, any>]
```

TypeScript considérère que `[X]` n'est pas un paramètre générique nu, donc pas de distributivité. Et `([X] extends [Y])` est équivalent à `(X extends Y)` en termes de logique.

### 2. Vérifier la forme de l'objet

Au lieu de vérifier `extends Procedure`, vérifier les propriétés directement:

```typescript
type IsProcedure<T> = T extends { type: 'query' | 'mutation' | 'internalQuery' | 'internalMutation'; handler: Function }
  ? T
  : never;

type Router<Ctx, Routes> = {
  [K in keyof Routes]: Routes[K] extends { type: string; handler: Function }
    ? Routes[K]
    : Routes[K] extends Record<string, unknown>
      ? Router<Ctx, Routes[K]>
      : never;
};
```

**Avantage**: Plus explicite, pas de dépendance sur `Procedure` type.
**Inconvénient**: Plus permissif (tout objet avec `type` et `handler` passe).

### 3. Pattern ORPC - procédure d'abord

ORPC utilise une approche différente: une procédure **est** un router:

```typescript
export type Router<T> =
  T extends { input: infer I; output: infer O }
    ? Procedure<T>  // C'est une procédure
    : { [K in keyof T]: Router<T[K]> };  // C'est un nested router
```

Ce pattern évite le problème car il vérifie la présence de propriétés spécifiques.

## Sources

- [TypeScript Handbook - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [How to avoid distributive conditional types](https://stackoverflow.com/questions/70789029/how-to-avoid-distributive-conditional-types/70792483)
- [ORPC Router Type](https://github.com/middleapi/orpc/blob/f4868a14/packages/server/src/router.ts)
- [tRPC Issue #4709 - simplify Router and Procedure types](https://github.com/trpc/trpc/issues/4709)

## Pattern à suivre pour @deessejs/server

Utiliser `[X] extends [Y]` pour le type `Router` et `PublicRouter`. Les `any` dans `Procedure<any, any, any>` et `Router<Ctx, any>` sont acceptables car:
- On vérifie juste la **forme**, pas la structure complète
- `any` signifie "n'importe quel type de routes" dans ce contexte

Si plus de sécurité est needed, on pourrait explorer le pattern ORPC ou une vérification par forme plutôt que par `extends`.