# Auto Type Table

Auto-generates documentation tables from TypeScript type definitions. Server Component using the TypeScript Compiler API.

## Features

- Generates tables from TypeScript interfaces and types
- Markdown descriptions supported in type entries
- Server-side only (not for client components)
- Shiki integration for syntax highlighting
- Requires build-time rendering (file system dependent)

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | No | Path to source TypeScript file |
| `name` | `string` | No | Exported type name to generate |
| `type` | `string` | No | Inline type definition |
| `generator` | `TypeScriptGenerator` | Yes | TypeScript generator instance |
| `shiki` | `object` | No | Shiki configuration options |
| `options` | `GenerateTypeTableOptions` | No | Generation options |
| `renderMarkdown` | `function` | No | Custom markdown renderer |
| `renderType` | `function` | No | Custom type renderer |

## Usage

```mdx
import { AutoTypeTable } from 'fumadocs-ui/components/auto-type-table';

// Reference external types
<AutoTypeTable path="./file.ts" name="MyType" />

// Inline types
<AutoTypeTable type="{ hello: string }" />
```

## Installation

```bash
npm i fumadocs-typescript
```

Initialize the generator and add it to MDX components.

## Limitations

Cannot be used in client components. For client-side needs, use build-time MDX integration instead.

---

Sources: [Fumadocs Auto Type Table](https://www.fumadocs.dev/docs/ui/components/auto-type-table)
