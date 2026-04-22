# Deprecated React APIs

Date: 2026-04-21
Tag: [react] [v19] [deprecated] [migration]

## Overview

React 19 has removed several legacy APIs that were previously deprecated. This guide covers both the newly removed APIs and the still-available-but-not-recommended legacy APIs.

---

## Removed in React 19

These APIs no longer exist in React 19 and must be migrated:

| Removed API | Replacement |
|-------------|-------------|
| `createFactory` | Use JSX |
| `static contextTypes` | Use `static contextType` |
| `static childContextTypes` | Use `static contextType` |
| `static getChildContext` | Use `Context` provider |
| `static propTypes` | Use TypeScript |
| `this.refs` | Use `createRef` or `useRef` |

### Migration Examples

#### `createFactory` → JSX

```tsx
// REMOVED
const element = React.createFactory('button', { className: 'btn' }, 'Click');

// USE JSX
const element = <button className="btn">Click</button>;
```

#### `static contextTypes` / `static childContextTypes` / `static getChildContext` → Modern Context

```tsx
// REMOVED (class component)
class MyComponent extends React.Component {
  static contextTypes = {
    theme: PropTypes.string
  };
  static childContextTypes = {
    theme: PropTypes.string
  };
  static getChildContext() {
    return { theme: 'dark' };
  }
  render() {
    return <div>{this.context.theme}</div>;
  }
}

// USE Modern Context API
const ThemeContext = React.createContext('light');

function MyComponent() {
  const theme = useContext(ThemeContext);
  return <div>{theme}</div>;
}

// Provider
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>
```

#### `static propTypes` → TypeScript

```tsx
// REMOVED
class MyComponent extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    age: PropTypes.number
  };
}

// USE TypeScript
interface Props {
  name: string;
  age?: number;
}

function MyComponent({ name, age }: Props) {
  return <div>{name} - {age}</div>;
}
```

#### `this.refs` → createRef/useRef

```tsx
// REMOVED
class MyComponent extends React.Component {
  render() {
    return <div ref="myDiv">Content</div>;
  }
  componentDidMount() {
    this.refs.myDiv.style.color = 'red';
  }
}

// USE createRef or useRef
class MyComponent extends React.Component {
  myDivRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.myDivRef.current.style.color = 'red';
  }

  render() {
    return <div ref={this.myDivRef}>Content</div>;
  }
}
```

---

## Legacy APIs (Still Available but Not Recommended)

These APIs still work but are not recommended for new code:

| API | Replacement |
|-----|-------------|
| `Children` | Array methods, `React.Children.toArray()` |
| `cloneElement` | Consider design patterns (props, composition) |
| `Component` (class) | Function components with hooks |
| `createElement` | Use JSX |
| `createRef` | `useRef` for function components |
| `PureComponent` | `React.memo` for function components |

### Migration from Class Components

```tsx
// OLD class component
class MyComponent extends React.Component<Props, State> {
  static defaultProps = { count: 0 };

  state = { value: '' };

  componentDidMount() { /* ... */ }
  componentDidUpdate() { /* ... */ }

  handleClick = () => { /* ... */ };

  render() {
    return (
      <div onClick={this.handleClick}>
        {this.props.name}: {this.state.value}
      </div>
    );
  }
}

// NEW function component
function MyComponent({ name, count = 0 }: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    // componentDidMount + componentDidUpdate equivalent
  }, [value]);

  const handleClick = () => { /* ... */ };

  return (
    <div onClick={handleClick}>
      {name}: {value}
    </div>
  );
}
```

### Migration from `Children.map`

```tsx
// OLD
React.Children.map(children, child => {
  return <div>{child}</div>;
});

// NEW
React.Children.toArray(children).map(child => {
  return <div>{child}</div>;
});
```

### Migration from `cloneElement`

```tsx
// OLD - modifying children via cloneElement
const modifiedChildren = React.Children.map(children, child =>
  React.cloneElement(child, { newProp: 'value' })
);

// NEW - composition pattern
function Parent({ children }) {
  return React.Children.map(children, child =>
    <WrapperComponent {...child.props} newProp="value">
      {child}
    </WrapperComponent>
  );
}

// Or use context/props
function Parent({ children, newProp }) {
  return React.Children.map(children, child => (
    <child.type {...child.props} newProp={newProp}>
      {child.props.children}
    </child.type>
  ));
}
```

---

## Deprecated Patterns to Avoid

### String Refs (Removed)

```tsx
// REMOVED
<div ref="myRef">Content</div>

// USE callback ref or createRef
<div ref={(el) => { this.myRef = el; }}>Content</div>
// or
const myRef = useRef(null);
<div ref={myRef}>Content</div>
```

### Legacy Context (Removed)

```tsx
// REMOVED
class MyComponent extends React.Component {
  static childContextTypes = { /* ... */ };
  static contextTypes = { /* ... */ };
  static getChildContext() { return {}; }
}

// USE Context Provider
<MyContext.Provider value={value}>
  {children}
</MyContext.Provider>
```

### PropTypes in Class Components (Removed)

```tsx
// REMOVED
static propTypes = {
  name: PropTypes.string.isRequired
};

// USE TypeScript
interface Props {
  name: string;
}
```

---

## Migration Checklist

- [ ] Replace `createFactory` with JSX
- [ ] Replace `static contextTypes`/`childContextTypes`/`getChildContext` with Context Provider
- [ ] Replace `static propTypes` with TypeScript
- [ ] Replace `this.refs` with `createRef`/`useRef`
- [ ] Migrate class components to function components
- [ ] Replace `Children.map` with array methods
- [ ] Review and refactor any `cloneElement` usage

---

## References

- [React Legacy Reference](https://react.dev/reference/react/legacy)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)