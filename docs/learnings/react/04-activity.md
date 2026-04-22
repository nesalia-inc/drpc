# React Activity Component

Date: 2026-04-21
Tag: [react] [v19] [activity] [state-preservation]

## Overview

The `<Activity>` component lets you hide and restore the UI and internal state of its children without unmounting them. It preserves state, DOM, and allows pre-rendering of content.

```jsx
<Activity mode={visibility}>
  <Sidebar />
</Activity>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | React nodes | - | The UI you intend to show and hide |
| `mode` | `'visible'` \| `'hidden'` | `'visible'` | Controls visibility |

---

## Key Behaviors

### State Preservation

When hidden, React:
- Visually hides children using `display: "none"`
- Destroys Effects and cleans up subscriptions
- **Preserves internal state** (unlike conditional unmounting)
- **Preserves DOM structure**
- Children still re-render in response to new props (at lower priority)

### Visibility Restoration

When visible again:
- Children are revealed with previous state restored
- Effects are re-created

---

## Usage Examples

### Hide/Show with State Preservation

```jsx
// Before (state lost on unmount)
{isShowingSidebar && <Sidebar />}

// After (state preserved)
<Activity mode={isShowingSidebar ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>
```

### Pre-rendering Content

```jsx
<Activity mode="hidden">
  <SlowComponent />
</Activity>
```

Children render at lower priority without mounting Effects, allowing data fetching ahead of time.

### Selective Hydration

Activity boundaries divide the component tree for faster initial interactivity:

```jsx
<Activity mode={activeTab === "home" ? "visible" : "hidden"}>
  <Home />
</Activity>
<Activity mode={activeTab === "video" ? "visible" : "hidden"}>
  <Video />
</Activity>
```

---

## Integration with ViewTransition

Hidden Activity becoming visible during `startTransition` activates the `enter` animation:

```jsx
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <ViewTransition enter="auto" exit="auto">
    <Counter />
  </ViewTransition>
</Activity>
```

---

## Caveats

### 1. Text-only Components

Hidden Activity with text-only children renders nothing (no DOM element to hide).

### 2. DOM Side Effects

Elements like `<video>`, `<audio>`, `<iframe>` need manual cleanup:

```jsx
useLayoutEffect(() => {
  return () => {
    videoRef.current.pause();
  };
}, []);
```

### 3. Data Fetching

Only Suspense-enabled data sources are fetched during pre-rendering:
- Suspense-enabled frameworks (Relay, Next.js)
- `lazy` component loading
- Cached Promises via `use()`

Activity does **not** detect data fetched inside Effects.

---

## Comparison with Conditional Rendering

| Aspect | Conditional `{cond && <X>}` | Activity |
|--------|---------------------------|---------|
| State preservation | ❌ Lost on unmount | ✅ Preserved |
| DOM preservation | ❌ Removed from DOM | ✅ Preserved |
| Effect lifecycle | Unmount/remount | Suspended/resumed |
| Pre-rendering | ❌ Not supported | ✅ Supported |
| Performance | Remount every time | Hide/show only |

---

## References

- [React Activity Reference](https://react.dev/reference/react/Activity)