# Next.js Integration Report

**Date**: 2026-04-09
**Status**: Analyzed - Package does not exist yet

---

## Overview

This folder contains a structured analysis for integrating `@deessejs/server` with Next.js App Router, using a pattern similar to Payload CMS. The `@deessejs/server-next` package will expose procedures via REST API.

## Table of Contents

| File | Description |
|------|-------------|
| [README.md](./README.md) | This file - overview and table of contents |
| [architecture.md](./architecture.md) | Request flow and route mapping |
| [api.md](./api.md) | Proposed API usage pattern and signature |
| [design-decisions/README.md](./design-decisions/README.md) | Overview of design decisions |
| [design-decisions/hono.md](./design-decisions/hono.md) | Should use Hono internally |
| [design-decisions/context.md](./design-decisions/context.md) | Context per-request (headers, cookies) |
| [design-decisions/async-params.md](./design-decisions/async-params.md) | Next.js 15 async params |
| [design-decisions/isr-ssr.md](./design-decisions/isr-ssr.md) | ISR/SSR support |
| [error-mapping.md](./error-mapping.md) | Error to HTTP status mapping |
| [dependencies.md](./dependencies.md) | Package dependencies |
| [file-structure.md](./file-structure.md) | Project file structure |
| [implementation-phases.md](./implementation-phases.md) | Implementation phases |
| [next-steps.md](./next-steps.md) | Next steps |
| [references.md](./references.md) | References |

## Summary

The integration aims to provide a thin adapter that:
- Exposes `@deessejs/server` procedures as Next.js Route Handlers
- Maps HTTP methods and paths to procedure names
- Handles argument parsing (URL params for GET, JSON body for others)
- Returns proper JSON responses with appropriate HTTP status codes