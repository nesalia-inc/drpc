# Accordion

Based on Radix UI Accordion, useful for FAQ sections.

## Features

- Two modes: single-selection or multiple-selection
- Disabled state support at container and item levels
- Horizontal or vertical orientation
- Hash-based navigation to open specific accordion items
- ID auto-generation from title when not specified

## Components

### Accordions (container)

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `type` | `"single" \| "multiple"` | Yes | — |
| `disabled` | `boolean` | No | `false` |
| `orientation` | `"horizontal" \| "vertical"` | No | `"vertical"` |
| `asChild` | `boolean` | No | — |

### Accordion (item)

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `value` | `string` | No | — |
| `disabled` | `boolean` | No | `false` |
| `asChild` | `boolean` | No | — |

## Usage

**MDX:**
```mdx
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

<Accordions type="single">
  <Accordion title="My Title">My Content</Accordion>
</Accordions>
```

**React:**
```tsx
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

export default function Page() {
  return (
    <Accordions type="single">
      <Accordion title="My Title">My Content</Accordion>
    </Accordions>
  );
}
```

## Linking

When adding an `id` prop to an Accordion, navigating to `#your-id` in the URL will automatically open that accordion item.

---

Sources: [Fumadocs Accordion](https://www.fumadocs.dev/docs/ui/components/accordion)
