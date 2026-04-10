# @deessejs/server Examples

## Basic Example

[`basic/`](./basic/) - Minimal example showing core features (local execution):

- `defineContext()` - Create context with database
- `t.query()` / `t.mutation()` - Define procedures
- `t.internalQuery()` - Server-only operations
- `t.router()` - Hierarchical routing
- `createAPI()` - Create executable API
- `api.users.get({})` - Direct method call syntax

```bash
cd basic
npm install
npm start
```

## Basic Next.js Example

[`basic-next/`](./basic-next/) - Next.js App Router integration:

- Same as basic but exposed via HTTP using `@deessejs/server-next`
- `createNextHandler()` - Exposes procedures via Next.js route handler
- `POST /api/users.get` - Call procedures via HTTP
- Internal operations protected (not exposed via HTTP)

```bash
cd basic-next
npm install
npm run dev
```
