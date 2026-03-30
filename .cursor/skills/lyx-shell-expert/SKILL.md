---
name: lyx-shell-expert
description: >-
  Expert on the Lyx Shell: layout rendering, Module Federation, SSR streaming,
  URL parsing, devtools. Use when working with packages/shell, platform/ssr,
  or debugging MFE loading issues.
---

# Lyx Shell Expert

## Architecture

- `ShellApp` → `LayoutRenderer` → `MFESlot[]` → Module Federation remotes
- SSR: `entry-server.tsx` streams HTML → `entry-client.tsx` hydrates

## URL Parsing (`getAppIdentifier`)

Regex: `/^\/([a-z0-9][a-z0-9-]{1,30}[a-z0-9]|[a-f0-9]{24})\/([^/]+)/`
- Matches both custom aliases (3-32 chars, alphanumeric + hyphens) and MongoDB ObjectIds (24 hex)
- Returns `{ accountId, slug }`
- SSR path: `initialSlug` from `__LYX_INITIAL__` bypasses URL parsing

## Layout Engine

5-band flex layout:
1. **top** regions → full width
2. **left** + **center** + **right** → CSS grid row (left/right: `region.size ?? "250px"`, center: `1fr`)
3. **bottom** regions → full width

Navigation events (`lyx:lyx:navigate`) override slot content dynamically.

## Module Federation Integration

- Host: `lyx_shell` (init once)
- Remote key: `{name}_v{version}` with dots replaced by underscores
- `registerRemotes([{ name: key, entry: url, type: "module" }], { force: true })`
- `loadRemote(\`${key}/default\`)` — cast result, never use generics on `loadRemote`
- **Critical**: Each version MUST have a unique key to avoid MF cache returning wrong version

## SSR Flow

1. Server: `renderToPipeableStream` with `ShellApp` (layout + slug props)
2. MFESlot renders `SlotSkeleton` on server (no federation)
3. Stream includes `<script>window.__LYX_INITIAL__={...}</script>`
4. Client hydrates → MFESlot loads real remotes
5. Assets at `/_assets/` base path (both vite configs)

## Devtools

- Toggle: `Ctrl/Cmd + Shift + D`
- Tabs: State (Zustand snapshot), Events (ring buffer), Navigation (history)
- Patches `window.dispatchEvent` and `history.pushState` for logging
