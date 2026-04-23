# Type Table

A table for documenting types.

## Props

### TypeTableProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `Record<string, TypeNode>` | Yes | Type definitions |

### ObjectTypeProps

| Prop | Type | Description |
|------|------|-------------|
| `description` | `string` | Additional description of the field |
| `type` | `string` | Type signature (short) |
| `typeDescription` | `string` | Type signature (full) |
| `typeDescriptionLink` | `string` | Optional href for the type |
| `default` | `any` | Default value |
| `required` | `boolean` | Is field required |
| `deprecated` | `boolean` | Is field deprecated |
| `parameters` | `Parameter[]` | Parameters if type is a function |
| `returns` | `ReturnValue` | Return value info |

## Usage

```mdx
import { TypeTable } from 'fumadocs-ui/components/type-table';

<TypeTable
  type={{
    percentage: {
      description: 'The percentage of scroll position',
      type: 'number',
      default: 0.2,
    },
  }}
/>
```

---

Sources: [Fumadocs Type Table](https://www.fumadocs.dev/docs/ui/components/type-table)
