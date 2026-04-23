# Tabs

Built with Radix UI, with additional features like persistent and shared value.

## Features

- Persistent value storage (sessionStorage/localStorage)
- Shared value across multiple tab instances via `groupId`
- URL hash linking to specific tabs
- Automatic URL hash updating when tabs change
- Default value selection support

## Components

- **`<Tabs>`** - Container component
- **`<Tab>`** - Individual tab content
- **`<TabsList>`** - Primitive tab list (advanced)
- **`<TabsTrigger>`** - Primitive trigger (advanced)
- **`<TabsContent>`** - Primitive content area (advanced)

## Props

### Tabs

| Prop | Type | Description |
|------|------|-------------|
| `items` | `string[]` | Array of tab labels |
| `value` | `string` | Tab identifier |
| `groupId` | `string` | Groups tabs to share state |
| `persist` | `boolean` | Store value in localStorage |
| `defaultIndex` | `number` | Set initial tab by index |
| `id` | `string` | HTML id for direct URL linking |
| `updateAnchor` | `boolean` | Auto-update URL hash on tab change |

## Usage

**Basic:**
```mdx
<Tabs items={['Javascript', 'Rust']}>
  <Tab value="Javascript">Javascript is weird</Tab>
  <Tab value="Rust">Rust is fast</Tab>
</Tabs>
```

**Shared across pages:**
```mdx
<Tabs groupId="language" items={['Javascript', 'Rust']}>
  <Tab value="Javascript">...</Tab>
  <Tab value="Rust">...</Tab>
</Tabs>
```

**Persistent selection:**
```mdx
<Tabs groupId="language" items={['Javascript', 'Rust']} persist>
  <Tab value="Javascript">...</Tab>
  <Tab value="Rust">...</Tab>
</Tabs>
```

**Link directly to a tab:**
```mdx
<Tab id="tab-cpp" value="C++">C++ content</Tab>
<!-- Access via URL: page-url#tab-cpp -->
```

**Auto-update URL hash:**
```mdx
<Tabs items={['A', 'B']} updateAnchor>
  <Tab id="tab-a" value="A">...</Tab>
  <Tab id="tab-b" value="B">...</Tab>
</Tabs>
```

**Default starting tab:**
```mdx
<Tabs items={['A', 'B']} defaultIndex={1}>
  <Tab value="A">...</Tab>
  <Tab value="B">...</Tab>
</Tabs>
```

---

Sources: [Fumadocs Tabs](https://www.fumadocs.dev/docs/ui/components/tabs)
