# React ViewTransition API

Date: 2026-04-21
Tag: [react] [v19] [view-transition] [animation]

## Overview

`<ViewTransition>` is a React component that enables animations for component tree transitions, working with Transitions and Suspense. It leverages the browser's native View Transition API.

```jsx
import {ViewTransition} from 'react';

<ViewTransition>
  <div>...</div>
</ViewTransition>
```

**Note:** Available in Canary and Experimental channels.

---

## How It Works

React under the hood:
1. Applies `view-transition-name` to inline styles of the nearest DOM node nested inside `<ViewTransition>`
2. Automatically calls `startViewTransition`
3. Waits for fonts to load (up to 500ms)
4. Calls lifecycle methods (`componentDidMount`, `componentDidUpdate`, `useLayoutEffect`)
5. Measures layout changes to determine which boundaries animate
6. Reverts `view-transition-name` after the ready Promise resolves
7. Invokes `onEnter`, `onExit`, `onUpdate`, `onShare` callbacks for programmatic control

---

## Core Props

| Prop | Type | Description |
|------|------|-------------|
| `name` | string | For shared element transitions |
| `default` | string | Default animation class |
| `enter` | string | When component mounts in transition |
| `exit` | string | When component unmounts in transition |
| `update` | string | When DOM mutations occur |
| `share` | string | For shared element transitions |
| `onEnter` | function | Event callback |
| `onExit` | function | Event callback |
| `onUpdate` | function | Event callback |
| `onShare` | function | Event callback |

### Animation Values

Each animation prop accepts:
- `"auto"` - Browser default cross-fade
- `"none"` - Disable animation
- `"classname"` - Custom CSS class name
- Object for conditional animation:
```jsx
<ViewTransition
  enter={{
    "forward": 'slide-in',
    "default": 'auto'
  }}
/>
```

---

## Event Callbacks

Callbacks receive `(instance, types)`:

### Instance Object

```js
{
  old: DOMElement,      // ::view-transition-old pseudo-element
  new: DOMElement,      // ::view-transition-new pseudo-element
  name: string,         // view-transition-name
  group: DOMElement,    // ::view-transition-group
  imagePair: DOMElement // ::view-transition-image-pair
}
```

### Example Callback

```jsx
<ViewTransition
  onEnter={(instance, types) => {
    const anim = instance.new.animate(
      [{opacity: 0}, {opacity: 1}],
      {duration: 500}
    );
    return () => anim.cancel(); // Cleanup function required
  }}
>
  <div>...</div>
</ViewTransition>
```

---

## CSS Styling

```css
::view-transition-old(.slide-in) {
  animation-duration: 500ms;
}

::view-transition-new(.slide-in) {
  animation-duration: 500ms;
}
```

---

## Usage Examples

### Basic Enter/Exit Animation

```jsx
function Child() {
  return (
    <ViewTransition enter="auto" exit="auto" default="none">
      <div>Hi</div>
    </ViewTransition>
  );
}

function Parent() {
  const [show, setShow] = useState(false);
  return (
    <button onClick={() => startTransition(() => setShow(!show))}>
      {show ? '➖' : '➕'}
    </button>
  );
}
```

### ⚠️ Important: Must Be First DOM Node

```jsx
// ❌ Won't work - ViewTransition is not first DOM node
<div>
  <ViewTransition>...</ViewTransition>
</div>

// ✅ Correct
<ViewTransition>
  <div>...</div>
</ViewTransition>
```

### Shared Element Transition

```jsx
const THUMBNAIL_NAME = 'video-thumbnail';

function Thumbnail({video}) {
  return (
    <ViewTransition name={THUMBNAIL_NAME}>
      <div className={`thumbnail ${video.image}`} />
    </ViewTransition>
  );
}

function FullscreenVideo({video}) {
  return (
    <ViewTransition name={THUMBNAIL_NAME}>
      <div className="fullscreen thumbnail" />
    </ViewTransition>
  );
}
```

### Animating List Reorder

```jsx
function Component() {
  return (
    <ViewTransition>
      {items.map((item) => (
        <ViewTransition key={item.id}>
          <Video video={item} />
        </ViewTransition>
      ))}
    </ViewTransition>
  );
}
```

### With Suspense

```jsx
<ViewTransition>
  <Suspense fallback={<VideoPlaceholder />}>
    <LazyVideo />
  </Suspense>
</ViewTransition>
```

### With Activity Component

```jsx
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <ViewTransition enter="auto" exit="auto">
    <Counter />
  </ViewTransition>
</Activity>
```

### Transition Types (with Router)

```jsx
<ViewTransition
  enter={{
    'navigation-forward': 'slide-left',
    'navigation-back': 'slide-right',
  }}
>
  <div>...</div>
</ViewTransition>

// In router:
startTransition(() => {
  addTransitionType('navigation-forward');
  setRoute('/new-page');
});
```

---

## Troubleshooting

### ViewTransition Not Activating

**Cause:** `<ViewTransition>` is not the first DOM node.

### Duplicate Name Error

**Cause:** Two `<ViewTransition>` components with the same `name` mounted simultaneously.
**Fix:** Use unique names like `name={`item-${id}`}`.

---

## Caveats

1. **Only for DOM** - Currently only works in the browser DOM (React Native support planned)
2. **Triggers require Transition** - Updates must be wrapped in `startTransition`, `<Suspense>`, or `useDeferredValue`
3. **Viewport visibility** - Shared elements outside viewport won't animate together
4. **Keys for reordering** - Proper keys are essential for list reordering animations
5. **Accessibility** - Always check `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-*(.class) {
    animation: none;
  }
}
```

---

## References

- [React ViewTransition Reference](https://react.dev/reference/react/ViewTransition)