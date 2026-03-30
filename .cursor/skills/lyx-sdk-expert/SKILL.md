---
name: lyx-sdk-expert
description: >-
  Expert on the Lyx SDK internals: event bus, shared state, navigation, MFE loading.
  Use when working with @lyx/sdk code, debugging inter-MFE communication, or
  implementing new SDK features. Knows all edge cases and internal behaviors.
---

# Lyx SDK Expert

## Event Bus (`events/event-bus.ts`)

- All events use `window.CustomEvent` with prefix `lyx:` → `emit("cart:add", data)` dispatches `lyx:cart:add`
- `on()` wraps the handler — the returned unsubscribe is the ONLY way to remove. `off()` with the original handler does NOT work
- `navigate()` uses event name `"lyx:navigate"` → actual DOM event is `lyx:lyx:navigate` (double prefix)
- Browser-only: no SSR guards on `window`

## Shared State (`store.ts`)

- Zustand vanilla store on `globalThis.__lyx_zustand_store__` with Redux DevTools
- `useSharedState(key, initial)` — first writer wins; if key already has a value, `initial` is ignored
- `createSharedStore(name, initial)` — namespaced object state; shallow merge only on `set()`
- Snapshot fallback: if value is `undefined`, returns `initialValue` (can mask intentional undefined)

## Navigation (`navigation.ts`)

- `navigate(mfeName, targetSlot, params)` → emits event + pushes history state
- `getAppBase()` reads from pathname: matches `/apps/<slug>/` or `/` — legacy pattern
- `onNavigate()` subscribes to both `lyx:navigate` events AND `popstate`
- `goBack()` has no `typeof window` guard — crashes on server

## MFE Loading (`loader.ts`)

- Permanent in-memory cache by MFE name — no version invalidation
- Script injection: if `window[name]` exists, skips loading (uses existing container)
- Federation: calls `container.init()` then `container.get("./default")`
- Returns `mod.default ?? mod` — handles both named and default exports

## Known Issues

For complete list see [docs/errors.md](../../docs/errors.md)

## Adding New SDK Features

1. Export from `src/index.ts`
2. Re-export types from `@lyx/types` if shared
3. Keep browser-only code guarded with `typeof window !== "undefined"`
4. Update `docs/features.md` SDK section
5. Add tests if behavior is non-trivial
