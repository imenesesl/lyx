---
name: lyx-mfe-workflow
description: >-
  Create, develop, and deploy Lyx micro frontends following framework conventions.
  Use when the user wants to create an MFE, scaffold a project, publish components,
  or configure apps in the Admin UI.
---

# Lyx MFE Workflow

## Creating a New Project

```bash
cd /path/to/lyx
lyx init <project-name>
```

This creates `apps/<project-name>/` with `lyx.config.json`, `layouts/`, and `mfes/` directories.

## Creating an MFE

```bash
cd apps/<project-name>
lyx create <mfe-name> --slot <slot>
```

Slots: `root`, `header`, `sidebar`, `main`, `footer`.

Creates `mfes/<mfe-name>/` with:
- `mfe.config.json` — name, slot, version
- `src/index.tsx` — component (must `export default`)
- `vite.config.ts` — auto-configured with `@lyx/vite-plugin`
- `package.json` — dependencies

## MFE Component Template

```tsx
import React from "react";

function MyComponent() {
  return (
    <div style={{ padding: 16 }}>
      <h1>My Component</h1>
    </div>
  );
}

export default MyComponent;
```

Rules:
- Must `export default`
- Can use `@lyx/sdk` for events, shared state, navigation
- Cannot import from other MFEs directly

## Inter-MFE Communication

```tsx
import { emit, useEvent, useSharedState } from "@lyx/sdk";

// Events (fire-and-forget)
emit("domain:action", { key: "value" });
useEvent("domain:action", (data) => { /* handle */ });

// Shared State (reactive)
const [value, setValue] = useSharedState("key", initialValue);
```

## Publishing

```bash
cd apps/<project-name>
lyx deploy          # deploy changed MFEs
lyx deploy --all    # deploy all MFEs
```

The CLI auto-increments versions (0.0.1 → 0.0.2 → ...).

## After Publishing

1. Open Admin UI
2. Go to **Apps** → select or create an app
3. **Configuration** tab → assign MFE + version to each slot
4. **Save Draft** → **Publish**
5. View at `/{accountId}/{slug}/`

## Checklist

- [ ] `lyx init` from monorepo root
- [ ] `pnpm install` after creating MFEs
- [ ] `lyx login` before deploying
- [ ] Component exports default
- [ ] No direct MFE-to-MFE imports
- [ ] Uses `@lyx/sdk` for communication
