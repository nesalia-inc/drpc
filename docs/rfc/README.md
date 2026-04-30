# DRPC RFCs

This directory contains Request for Comments (RFC) documents that describe the design and architecture of DRPC features in depth.

## RFCs

### Server (`server/`)

The core `@deessejs/server` package.

| RFC | Title | Status |
|-----|-------|--------|
| [01](server/01-core-api.md) | Core API — `initDRPC` Builder Pattern | Draft |
| [02](server/02-events.md) | Events System | Draft |
| [03](server/03-middleware.md) | Middleware | Draft |
| [04](server/04-plugins.md) | Plugins | Draft |
| [05](server/05-procedures.md) | Procedures — Query, Mutation | Draft |
| [07](server/07-routers.md) | Routers — Namespaced Procedure Composition | Implemented |
| [08](server/08-api-factory.md) | API Factory — `createAPI` and `createPublicAPI` | Implemented |

### Server Adapters (`server-adapters/`)

Adapter packages that expose DRPC via different transports.

| RFC | Title | Status |
|-----|-------|--------|
| [06](server-adapters/06-server-hono.md) | Hono HTTP Adapter | Implemented |

## Status Definitions

- **Draft** — Design is being discussed, not yet implemented
- **Proposed** — Design finalized, awaiting implementation
- **Implemented** — Code exists and matches this RFC
- **Superseded** — Replaced by a newer RFC

## How to Read

Each RFC follows this structure:

1. **Summary** — One-paragraph overview
2. **Overview** — What it is and why it exists
3. **How It Works** — Detailed explanation with examples
4. **API Reference** — TypeScript types and interfaces
5. **Implementation Notes** — Technical details for implementers
6. **Status** — Current state of the RFC

## Contributing

RFCs are living documents. To propose changes:

1. Create a new RFC file or modify an existing one
2. Discuss in issues before implementation
3. Update status when implementation is complete
