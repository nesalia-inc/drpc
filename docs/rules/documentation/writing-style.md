# Writing Style

## Use Second Person ("you")

Write documentation as if you're talking directly to the reader. Use "you" and "your" instead of third-person constructions.

### Why?

- Creates a personal connection with the reader
- Makes instructions feel actionable, not abstract
- Avoids sounding like a robot or academic paper
- Matches how people naturally communicate in tutorials

### Second Person vs Third Person

| Third Person (Avoid) | Second Person (Preferred) |
|----------------------|---------------------------|
| "The user should define the context" | "You define the context" |
| "One can use `createContext` for..." | "You can use `createContext` for..." |
| "It is important to note..." | "It's important to note..." |
| "The reader must understand..." | "You must understand..." |
| "This demonstrates how the API works" | "This demonstrates how the API works for you" |

### Examples

#### ❌ Third Person (Robotic)

```mdx
When a user defines context, the factory function should return an object with the required dependencies. It is important to note that the context object is shared across all requests.
```

#### ✅ Second Person (Natural)

```mdx
When you define context, the factory function should return an object with your required dependencies. Note that the context object is shared across all requests.
```

#### ❌ Third Person

```mdx
"The context should be kept minimal to avoid unnecessary overhead."
```

#### ✅ Second Person

```mdx
"Keep your context minimal to avoid unnecessary overhead."
```

### Templates

**When explaining a feature:**
```mdx
Use [feature] when you want to [action]. Here's how:

// code example

Now you can [result].
```

**When giving warnings:**
```mdx
<Callout type="warn">
Don't forget to [action]. If you forget, you'll get [error].
</Callout>
```

**When explaining behavior:**
```mdx
The way it works is simple:
1. You [action 1]
2. Then you [action 2]
3. Finally, you get [result]
```

## Additional Guidelines

### Be Direct

Get to the point quickly. Don't add unnecessary filler.

### Use Active Voice

| Passive (Avoid) | Active (Preferred) |
|-----------------|---------------------|
| "The context is created" | "The API creates the context" |
| "The factory is called" | "The function gets called" |
| "Errors are handled by..." | "The error handler catches..." |

### Explain "Why" Not Just "What"

```mdx
// ❌ Just what
Use `context` for static dependencies.

// ✅ What and why
Use `context` for static dependencies. This is simpler and works great when your services are already initialized at module load time.
```
