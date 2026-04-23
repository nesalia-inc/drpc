# Banner

Display announcements at the top of your site.

## Usage

Place `<Banner>` at the top of your root layout.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `string` | Change visual style (e.g., `"rainbow"`) |
| `rainbowColors` | `array` | Customize rainbow colors with array of rgba values |
| `changeLayout` | `boolean` | Disable default layout adjustments (default: `true`) |
| `id` | `string` | Enable close button; state persists automatically |

## Features

Automatically modifies Fumadocs layouts (e.g., reduces sidebar height) unless disabled with `changeLayout={false}`.

## Installation

```bash
npx @fumadocs/cli add banner
```

---

Sources: [Fumadocs Banner](https://www.fumadocs.dev/docs/ui/components/banner)
