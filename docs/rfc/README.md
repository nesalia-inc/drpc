# DRPC RFCs

This directory contains Request for Comments (RFC) documents that describe the design and architecture of DRPC features in depth.

## RFCs

| RFC | Title | Status |
|-----|-------|--------|
| [01](01-core-api.md) | Core API — `initDRPC` Builder Pattern | Draft |
| [02](02-events.md) | Events System | Draft |
| [03](03-middleware.md) | Middleware | Draft |
| [04](04-plugins.md) | Plugins | Draft |
| [05](05-procedures.md) | Procedures — Query, Mutation | Draft |
| [06](06-server-hono.md) | Hono HTTP Adapter | Implemented |
| [07](07-routers.md) | Routers — Namespaced Procedure Composition | Implemented |

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
