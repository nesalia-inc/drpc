# Client Transport

The `@deessejs/client` package provides a type-safe client for consuming deesse RPC APIs. It uses a transport-based architecture that allows flexible HTTP request handling.

## Overview of @deessejs/client

The client package enables you to create a typed client proxy that mirrors your server router structure. It works with any transport implementation that adheres to the `Transport` interface.

**Key exports:**

- `createClient` - Creates a type-safe client proxy
- `FetchTransport` - Built-in fetch-based transport
- `fetchTransport` - Factory function for FetchTransport
- `Transport` - Interface for custom transport implementations
- `ClientConfig` - Configuration options for the client
- `RequestOptions` - Request-level options (method, headers)

## FetchTransport Class

`FetchTransport` is the built-in transport implementation using the native `fetch` API. It handles HTTP requests with automatic method selection (POST for mutations, GET for queries) and JSON serialization.

### Constructor

```typescript
constructor(baseUrl: string = '')
```

**Parameters:**

- `baseUrl` - The base URL for all requests. Defaults to an empty string for relative URLs. Can be:
  - Relative path (e.g., `"/api"`)
  - Absolute URL (e.g., `"https://api.example.com"`)
  - Empty string for same-origin requests

### Request Method

```typescript
async request(
  path: string,
  args: unknown,
  options?: RequestOptions
): Promise<Response>
```

**Parameters:**

- `path` - The RPC procedure path (e.g., `"users.get"`)
- `args` - The procedure arguments
- `options` - Optional request configuration

**Returns:** A `Promise<Response>` from the fetch API

**Behavior:**

- Uses `POST` method by default with JSON body containing `{ args }`
- Uses `GET` method when query parameters are preferred, passing args as URL search params
- Sets `Content-Type: application/json` header automatically
- Merges custom headers with defaults

## fetchTransport Factory Function

```typescript
function fetchTransport(baseUrl?: string): Transport
```

A convenience factory function that creates a `FetchTransport` instance.

**Example:**

```typescript
import { fetchTransport } from '@deessejs/client';

const transport = fetchTransport('/api');
```

## Transport Interface

The `Transport` interface defines the contract for making HTTP requests:

```typescript
interface Transport {
  request(
    path: string,
    args: unknown,
    options?: RequestOptions
  ): Promise<Response>;
}
```

### RequestOptions

```typescript
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
}
```

## Custom Transport Implementation Example

You can implement your own transport for custom HTTP handling, WebSocket connections, or testing:

```typescript
import type { Transport, RequestOptions } from '@deessejs/client';

class CustomTransport implements Transport {
  constructor(private baseUrl: string) {}

  async request(
    path: string,
    args: unknown,
    options: RequestOptions = {}
  ): Promise<Response> {
    // Custom request logic
    const url = `${this.baseUrl}/${path}`;
    const method = options.method || 'POST';

    // Example: Add authentication header
    const headers = {
      ...options.headers,
      'Authorization': 'Bearer token123',
    };

    // Example: WebSocket fallback or custom protocol
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify({ args }),
    });

    return response;
  }
}

// Usage with createClient
import { createClient } from '@deessejs/client';

const transport = new CustomTransport('https://api.example.com');
const client = createClient<typeof appRouter>({ transport });
```

## Configuration Options

### baseUrl Examples

**Relative path (recommended for Next.js):**

```typescript
import { createClient, fetchTransport } from '@deessejs/client';

const transport = fetchTransport('/api');
const client = createClient<ApiRouter>({ transport });

// Requests go to /api/users.get, /api/users.list, etc.
```

**Absolute URL (for external APIs):**

```typescript
import { createClient, fetchTransport } from '@deessejs/client';

const transport = fetchTransport('https://api.example.com');
const client = createClient<ApiRouter>({ transport });

// Requests go to https://api.example.com/users.get, etc.
```

**Empty string (same-origin):**

```typescript
import { createClient, fetchTransport } from '@deessejs/client';

const transport = fetchTransport('');
const client = createClient<ApiRouter>({ transport });

// Requests go to /users.get, /users.list (relative to current origin)
```

### Complete Client Setup

```typescript
import { createClient, fetchTransport } from '@deessejs/client';
import type { AppRouter } from './server'; // Your server router type

// Create transport with base URL
const transport = fetchTransport('/api');

// Create type-safe client
const client = createClient<AppRouter>({ transport });

// Use the client - path mirrors server router
const user = await client.users.get({ id: 1 });
const users = await client.users.list({ page: 1 });

// Mutations use POST by default
const newUser = await client.users.create({
  name: 'John Doe',
  email: 'john@example.com'
});
```

## HTTP Method Behavior

| Scenario | Method | Body |
|----------|--------|------|
| Query procedure call | `GET` | N/A (args as query params) |
| Mutation procedure call | `POST` | `JSON.stringify({ args })` |
| Custom method specified | As specified | `JSON.stringify({ args })` unless GET |

## Response Format

The server response must be a JSON object with one of these shapes:

**Success response:**

```json
{
  "ok": true,
  "value": { /* result data */ }
}
```

**Error response:**

```json
{
  "ok": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

The client automatically parses this response format and returns the `value` on success, or throws an error on failure.
