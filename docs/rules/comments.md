# Comments Rule

## Rule

**No inline comments unless the code is not yet understood or is intentionally temporary.**

Comments must add value, explain specific design decisions, and be treated as important internal documentation—not noise.

## Why Comments Matter

Comments are internal documentation. They explain **why** something was done a certain way, not **what** the code does (the code already shows what). They preserve context, intent, and reasoning that would otherwise be lost.

## Anti-Patterns (Forbidden)

### Useless Inline Comments
```typescript
// Create event emitter if events are defined
const eventEmitter = events ? new EventEmitter<Events>(events) : undefined;

// Check if user exists
if (user !== null) { ... }

// Loop through items
for (const item of items) { ... }

// Return the user
return user;
```

### Noise Comments
```typescript
// This function does X
function doX(): void { ... }

// IMPORTANT: Fix this later
function hack(): void { ... }

// TODO: Implement
function unimplemented(): void { ... }
```

### Documentation in Comments
```typescript
/**
 * @param userId - The user's ID
 * @returns The user object
 */
function getUser(userId: string): User { ... }
```

## When Comments ARE Allowed

### 1. Code Not Yet Understood (Temporary)
```typescript
// TODO: Investigate why this works - seems counterintuitive
const result = data.reduce((acc, item) => /* complex logic */, []);
```

### 2. Specific Design Decisions (Long, Valuable)
```typescript
/**
 * WHY: We use a flat event emitter instead of hierarchical
 * because listeners need to subscribe to wildcard patterns like 'user:*'.
 * A hierarchical approach would require tree traversal for each event,
 * adding O(n) overhead per emission. Flat storage with pattern matching
 * gives us O(1) registration and O(k) emission where k = matched listeners.
 *
 * TRADE-OFF: Memory usage is higher since each listener stores its pattern
 * as a string instead of a tree node reference. We chose this trade-off
 * because typical usage involves 10-100 listeners, not thousands.
 *
 * ALTERNATIVE CONSIDERED: Dominated by 'event-strict' library which
 * required pre-registration of all event names, making it unsuitable
 * for plugin systems that dynamically define events.
 */
```

### 3. Non-Obvious Behavior with External Context
```typescript
/**
 * This implementation uses bitwise AND instead of modulo because:
 * - Modern JS engines optimize bitwise AND to a single CPU instruction
 * - Modulo involves division which is 3-5x slower on V8
 * - For power-of-2 divisors (like buffer sizes), this is a valid micro-optimization
 *
 * BENCHMARK: Tested on Node.js 20+ with 1M iterations:
 * - i % 1024: ~45ms
 * - i & 1023: ~12ms
 * Difference is negligible for most use cases, but matters in hot paths
 * like parsing binary protocols or buffer management.
 */
const index = (offset: number) => cursor.get() & (BUFFER_SIZE - 1);
```

### 4. Complex Business Logic Explanation
```typescript
/**
 * CALCULATION CONTEXT: This formula determines cache invalidation priority.
 *
 * We originally tried simple TTL-based eviction, but discovered through
 * profiling that 60% of cache misses came from just 10% of keys that
 * were accessed infrequently but held large payloads.
 *
 * Formula: priority = (accessCount ^ 0.5) / (ageInHours + 1)
 *
 * The square root on accessCount diminishes returns from frequently
 * accessed keys, preventing them from dominating eviction entirely.
 * Adding 1 to denominator prevents division by zero and reduces
 * weight of very young entries.
 *
 * REFERENCE: This is a variation of "frequency-based caching" described
 * in the Adaptive Replacement Cache (ARC) algorithm by Megiddo et al.
 * We simplified it because full ARC state management added more
 * overhead than it saved for our use case.
 */
```

## Comment Structure

### When You Must Comment, Make It Count

A valuable comment answers:
1. **WHY** - Why was this approach taken instead of alternatives?
2. **WHAT TRADE-OFF** - What is being traded away?
3. **ALTERNATIVES CONSIDERED** - What else was evaluated and why rejected?
4. **CONTEXT** - What external knowledge or data informed this decision?

### Separation from Documentation

- **Comments**: Explain internal decisions, edge cases, non-obvious behavior
- **Documentation**: Explain APIs, usage patterns, external contracts

Never mix comments into documentation files. Keep them in the source code to preserve context.

## Enforcement

- Inline comments that state the obvious will be flagged in code review
- Comments without explanation of "why" will be rejected
- Every non-trivial decision should have a comment explaining the alternatives and trade-offs

## Quick Checklist

Before writing a comment, ask:
- Does this explain a **specific decision** or **trade-off**?
- Would a future maintainer thank me for this context?
- Is this something that cannot be inferred from reading the code?

If not, don't write it. The code is already there.
