# TypeScript Release Notes: v5.1 to v6.0

Date: 2026-04-21
Tag: [typescript] [release-notes] [migration]

## Overview

This folder contains migration guides and breaking changes for TypeScript versions 5.1 through 6.0. This covers ~2 years of TypeScript releases.

## Files

| Version | File | Breaking Changes |
|---------|------|------------------|
| 6.0 | `06-ts-6.md` | High |
| 5.9 | `05-ts-5-9.md` | Medium |
| 5.8 | `04-ts-5-8.md` | Low |
| 5.7 | `03-ts-5-7.md` | Medium |
| 5.6 | `02-ts-5-6.md` | Low |
| 5.5 | `01-ts-5-5.md` | Medium |
| 5.4 | `00-ts-5-4.md` | Low |
| 5.3 | (integrated into 5.4) | Low |
| 5.2 | (integrated into 5.4) | Low |
| 5.1 | (integrated into 5.4) | Low |

## Key Breaking Changes Across All Versions

### High Impact (v6)

| Change | Description |
|--------|-------------|
| `strict: true` default | Now enabled by default |
| `module: esnext` default | Changed from `commonjs` |
| `types: []` default | No auto-inclusion of `@types/*` |
| `rootDir` defaults to project root | May expose unexpected files |
| Removed: `moduleResolution: node` | Use `bundler` or `node16/nodenext` |
| Removed: `baseUrl` | Use subpath imports instead |
| Removed: `esModuleInterop: false` | Always enabled |
| Removed: `target: es5` | Minimum is es2015 |

### Medium Impact (5.5-5.9)

| Change | Version |
|--------|---------|
| `TypedArray` now generic over `ArrayBufferLike` | 5.7+ |
| Import assertions `assert` deprecated → `with` | 5.3+ |
| Decorators stricter parsing | 5.5+ |
| `undefined` as type name now errors | 5.5+ |
| `typeRoots` upward walk disabled | 5.1+ |

## Migration Priority

1. **tsconfig.json updates** - Many defaults changed in 6.0
2. **Type updates** - `@types/node` update recommended
3. **Buffer/TypedArray types** - Explicit `Uint8Array<ArrayBuffer>` needed
4. **Import attributes** - Replace `assert` with `with`

## References

- [TypeScript 6.0 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [TypeScript 5.9 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
- [TypeScript 5.8 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [TypeScript 5.7 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/)
- [TypeScript 5.6 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/)
- [TypeScript 5.5 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/)
- [TypeScript 5.4 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/)
- [TypeScript 5.3 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-3/)
- [TypeScript 5.2 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/)
- [TypeScript 5.1 Announce](https://devblogs.microsoft.com/typescript/announcing-typescript-5-1/)