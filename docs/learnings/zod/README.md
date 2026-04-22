# Zod Release Notes

Date: 2026-04-21
Tag: [zod] [release-notes]

## Overview

This folder contains migration guides for Zod versions.

## Files

| Version | File | Breaking Changes |
|---------|------|------------------|
| 4.0 | `01-zod-v4-migration.md` | High |

## Key Breaking Changes

| Change | Impact |
|--------|--------|
| Error handling (`message` → `error`) | High |
| String formats moved to top-level | Medium |
| `.strict()` → `z.strictObject()` | Medium |
| `.deepPartial()` removed | Medium |
| `.safe()` now rejects floats | High |
| `._def` → `._zod.def` | High |

## References

- [Zod v4 Home](https://zod.dev/v4)
- [Zod v4 Changelog](https://zod.dev/v4/changelog)
- [Library Authors Guide](https://zod.dev/library-authors)