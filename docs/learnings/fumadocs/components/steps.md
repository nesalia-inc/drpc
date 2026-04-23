# Steps

Display sequential steps in documentation.

## Features

- Vertical step-by-step layout for guides/tutorials
- Visual step indicators (numbered markers)
- Tailwind CSS utility support
- Arbitrary variant support for targeting specific elements

## Components

- **`<Steps>`** - Container component for all steps
- **`<Step>`** - Individual step wrapper (typically contains a heading)

## Usage

**Standard import:**
```mdx
import { Step, Steps } from 'fumadocs-ui/components/steps';

<Steps>
  <Step>
    ### Step One Title
    Content here
  </Step>
  <Step>
    ### Step Two Title
    Content here
  </Step>
</Steps>
```

**Without imports (Tailwind utilities):**
```mdx
<div className="fd-steps">
  <div className="fd-step" />
</div>
```

**Target specific headings only:**
```mdx
<div className="fd-steps [&_h3]:fd-step">
  ### Hello World
</div>
```

## Installation

```bash
npx @fumadocs/cli add steps
```

---

Sources: [Fumadocs Steps](https://www.fumadocs.dev/docs/ui/components/steps)
