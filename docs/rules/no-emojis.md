# No Emojis

Emojis are forbidden in code, comments, documentation, and any text visible to users or developers.

## Why

- Emojis render differently across platforms and may appear as squares or question marks
- They break tooling: linters, search, grep, and diff tools struggle with unicode characters
- Code should be language-agnostic; emojis are culturally specific
- They reduce readability in terminal environments and code editors
- Professional documentation should not rely on emoji decoration

## Examples

### ❌ Forbidden

```typescript
// ❌ Don't use emojis in comments
// TODO: 🚀 implement this feature
// FIXME: 🔥 bug here

// ❌ Don't use emojis in documentation
Welcome to our API! 🎉
Check out these features ✨
```

### ✅ Allowed

```typescript
// ✅ Do use clear text markers
// TODO: implement this feature
// FIXME: bug here

// ✅ Do use text-only markers
"Welcome to our API!"
"Check out these features"
```

## Exceptions

- Emoji in string literals that are part of user-generated content or data (e.g., social media posts)
- Binary payloads where emoji encoding is intentional

## Enforcement

Configure your linter to warn on emoji unicode ranges:
- U+1F300 to U+1F9FF (Miscellaneous Symbols and Pictographs)
- U+2600 to U+26FF (Miscellaneous Symbols)
- U+2700 to U+27BF (Dingbats)
- U+1F600 to U+1F64F (Emoticons)