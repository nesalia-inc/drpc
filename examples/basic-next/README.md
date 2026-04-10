# @deessejs/server Basic Next.js Example

Minimal example showing `@deessejs/server` integrated with Next.js App Router.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
basic-next/
├── app/
│   ├── api/
│   │   └── [...slug]/
│   │       └── route.ts    # HTTP handler - exposes procedures
│   ├── components/
│   │   ├── UserList.tsx    # Client: list users with refresh
│   │   ├── UserDetail.tsx  # Client: show selected user
│   │   ├── CreateUserForm.tsx  # Client: form to create user
│   │   ├── ErrorBanner.tsx # Client: error display
│   │   └── UserPageClient.tsx  # Client: orchestrates all
│   ├── lib/
│   │   └── client.ts       # Client: type-safe API wrapper
│   ├── layout.tsx
│   └── page.tsx            # Server: fetches initial data
├── server/
│   └── api.ts              # Define procedures
├── package.json
└── tsconfig.json
```

## Architecture

```
page.tsx (Server Component)
    │
    └── UserPageClient (Client Component)
            │
            ├── UserList → usersApi.list()
            ├── UserDetail → usersApi.get()
            └── CreateUserForm → usersApi.create()
                    │
                    └──────────────────→ HTTP POST /api/users.*
                                                    │
                                                    └── Next.js Route Handler
                                                            │
                                                            └── @deessejs/server
```

## Key Features

1. **Server Component** - `page.tsx` fetches initial data
2. **Client Components** - Separate components for each interaction
3. **Type-safe API** - `lib/client.ts` mirrors server API structure
4. **Automatic TypeScript** - Full type inference from client wrapper

## API Endpoints

| Method | Path | Procedure |
|--------|------|-----------|
| POST | `/api/users.list` | List users |
| POST | `/api/users.get` | Get user by ID |
| POST | `/api/users.create` | Create user |

## Security

`users.count` is defined as `t.internalQuery()` - it is **NOT** exposed via HTTP.

## Example Request

```bash
curl -X POST http://localhost:3000/api/users.get \
  -H "Content-Type: application/json" \
  -d '{"args": {"id": 1}}'
```

Response:
```json
{
  "ok": true,
  "value": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```
