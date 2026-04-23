# Graph View

Display a graph visualization of all pages in documentation.

## Installation

```bash
npx @fumadocs/cli add graph-view
```

## Configuration

Enable in `source.config.ts`:

```ts
docs: {
  postprocess: {
    extractLinkReferences: true
  }
}
```

## Usage

```tsx
import { GraphView } from '@/components/graph-view';
import { buildGraph } from '@/lib/build-graph';

<GraphView graph={buildGraph()} />
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `graph` | `GraphData` | Yes | Output from `buildGraph()` |

Can be used in MDX files or layout components like `page.tsx`.

---

Sources: [Fumadocs Graph View](https://www.fumadocs.dev/docs/ui/components/graph-view)
