# Files

Display file structure in your documentation.

## Components

- **`<Files>`** - Container wrapper
- **`<File>`** - Represents individual files
- **`<Folder>`** - Represents folders

## Props

### File

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | File name |
| `icon` | `ReactNode` | No | Custom icon |

### Folder

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Folder name |
| `disabled` | `boolean` | No | Disable folder |
| `defaultOpen` | `boolean` | No | Start expanded |

## Usage

```mdx
<Files>
  <Folder name="app" defaultOpen>
    <File name="layout.tsx" />
    <File name="page.tsx" />
  </Folder>
  <File name="package.json" />
</Files>
```

## Special Features

### Remark Plugin

`remark-mdx-files` converts code blocks into `<Files />` components.

### Auto-generate

`<auto-files>` auto-generates file structures from glob patterns with options like `defaultOpenAll`.

## Installation

```bash
npx @fumadocs/cli add files
```

---

Sources: [Fumadocs Files](https://www.fumadocs.dev/docs/ui/components/files)
