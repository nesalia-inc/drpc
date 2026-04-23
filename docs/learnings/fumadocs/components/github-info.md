# GitHub Info

Display GitHub repository information.

## Package

`fumadocs-ui/components/github-info`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `owner` | `string` | Yes | Repository owner |
| `repo` | `string` | Yes | Repository name |
| `token` | `string` | No | GitHub access token |

## Usage

Recommended: Add to docs layout via the `links` option.

```tsx
import { GitHubInfo } from 'fumadocs-ui/components/github-info';

// Place in custom link entry to display repo info alongside navigation
```

---

Sources: [Fumadocs GitHub Info](https://www.fumadocs.dev/docs/ui/components/github-info)
