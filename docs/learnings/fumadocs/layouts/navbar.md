# Navbar

Navbar/header configurations for Fumadocs layouts.

## Overview

Navigation header component that appears at the top of documentation pages.

## Features

- Mobile-only header/navbar in Docs Layout
- Configurable via `nav` prop in layout components
- Supports links, menus, and theme switcher

## Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Navbar title |
| `mode` | `'top' \| 'bottom'` | Navbar position mode |
| `links` | `LinkItem[]` | Navigation links |

## Navigation Menu Components

For animated navbar menus (Home Layout only):

- `NavbarMenu` - Container for menu
- `NavbarMenuTrigger` - Menu trigger button
- `NavbarMenuContent` - Menu dropdown content
- `NavbarMenuLink` - Menu link item

Set `on: 'nav'` for custom items.

---

Sources: [Fumadocs Navbar](https://www.fumadocs.dev/docs/ui/layouts/navbar)
