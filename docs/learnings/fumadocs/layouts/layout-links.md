# Layout Links

Add navigation links to layouts via a `links` prop. Links appear in the navbar.

## Link Item

Create navigation links with icon, text, url, and optional secondary display.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `ReactNode` | Link icon |
| `text` | `string` | Link text |
| `url` | `string` | Link URL |
| `secondary` | `boolean` | Secondary display |

**Active Modes:**

| Mode | Behavior |
|------|----------|
| `"url"` | Active when browsing the specified path |
| `"nested-url"` | Active for the path and its children |
| `"none"` | Never active |

## Icon Item

Button-style links displayed as icons. Secondary by default.

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `ReactNode` | Icon component |
| `url` | `string` | Link URL |
| `aria-label` | `string` | Accessibility label |

## Custom Item

Render any React component in the navigation (e.g., login button).

## GitHub URL

Quick shortcut to add a GitHub link:

```tsx
githubUrl: 'https://github.com/...'
```

## Normal Menu

Creates dropdown menus with multiple link items.

| Prop | Type | Description |
|------|------|-------------|
| `text` | `string` | Menu text |
| `description` | `string` | Item description |
| `url` | `string` | Item URL |

## Navigation Menu (Home Layout)

Animated navbar menus using:

- `NavbarMenu`
- `NavbarMenuTrigger`
- `NavbarMenuContent`
- `NavbarMenuLink`

Only displays on navbar, not mobile menus. Set `on: 'nav'` for custom items.

---

Sources: [Fumadocs Layout Links](https://www.fumadocs.dev/docs/ui/layouts/links)
