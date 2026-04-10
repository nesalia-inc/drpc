# Design Decisions

This folder contains key design decisions for the `@deessejs/server-next` package.

## Contents

| File | Description |
|------|-------------|
| [hono.md](./hono.md) | Should use Hono internally |
| [context.md](./context.md) | Context per-request (headers, cookies) |
| [async-params.md](./async-params.md) | Next.js 15 async params |
| [isr-ssr.md](./isr-ssr.md) | ISR/SSR support |

## Overview

These decisions address:
1. Whether to use Hono internally for routing
2. How to handle per-request context (headers, cookies)
3. How to handle Next.js 15's async params
4. How to support ISR/SSR configurations

## Summary

- **Hono**: NO for Next.js (use thin adapter), YES for multi-runtime server
- **Context**: Pass via args or middleware
- **Async Params**: Support async params handling
- **ISR/SSR**: Determined at route handler level, not procedure level