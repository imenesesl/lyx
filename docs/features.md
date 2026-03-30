# Lyx Feature Inventory

Complete inventory of every feature, behavior, and component in the Lyx framework.
Last updated by automated sweep. Keep in sync with code changes.

---

## 1. SDK (`@lyx/sdk`)

### Public API

| Export | Kind | Signature |
|--------|------|-----------|
| `emit` | function | `emit<T>(eventName: string, payload: T): void` |
| `on` | function | `on<T>(eventName: string, handler: (payload: T) => void): () => void` |
| `off` | function | `off(eventName: string, handler: EventListener): void` |
| `useEvent` | hook | `useEvent<T>(eventName: string, handler: (payload: T) => void): void` |
| `useSharedState` | hook | `useSharedState<T>(key: string, initial: T): [T, Setter<T>]` |
| `createSharedStore` | function | `createSharedStore<T>(name: string, initial: T): { get, set, subscribe, reset }` |
| `navigate` | function | `navigate(mfeName: string, targetSlot?: string, params?: Record<string, string>): void` |
| `goBack` | function | `goBack(): void` |
| `onNavigate` | function | `onNavigate(handler: (payload: NavigatePayload | null) => void): () => void` |
| `loadMFE` | function | `loadMFE(name: string, registryUrl?: string): Promise<ComponentType>` |
| `useMFE` | hook | `useMFE(name: string): { Component, loading, error }` |
| `MFELoader` | component | `<MFELoader name fallback? errorFallback? props? />` |
| `getLyxConfig` | function | `getLyxConfig(): { registryUrl: string }` |
| `setLyxConfig` | function | `setLyxConfig(partial: Partial<LyxRuntimeConfig>): void` |

### Internals

- **Event bus**: DOM `CustomEvent` on `window` with prefix `lyx:`. All events become `lyx:{eventName}`.
- **Shared state**: Global Zustand store (`globalThis.__lyx_zustand_store__`), DevTools name `"Lyx Shared State"`.
- **Navigation**: `emit("lyx:navigate", payload)` → event type `lyx:lyx:navigate`. Pushes history state.
- **MFE loader**: Fetches registry, injects `<script>` for `remoteEntry`, resolves federation container.

### Known Edge Cases

- `off()` does not work with the original handler passed to `on()` — always use the unsubscribe returned by `on()`
- `loadMFE` has a permanent cache — no version-aware invalidation
- SSR: `emit`, `on`, `goBack`, `onNavigate` require `window` (browser-only)
- `useSharedState` initial value only set if key is `undefined` (first writer wins)

---

## 2. CLI (`@lyx/cli`)

### Commands

| Command | Args/Options | Description |
|---------|-------------|-------------|
| `lyx init <name>` | `--layout` (default `main`) | Create project in `apps/<name>/` with config, layouts, tsconfig |
| `lyx create <name>` | `--slot` (required) | Scaffold MFE in `mfes/<name>/` with config, vite, component template |
| `lyx dev` | `--only`, `--port`, `--registry-port` | Start registry + Vite dev servers for MFEs |
| `lyx build [mfe]` | — | Run `vite build` for one or all MFEs |
| `lyx registry` | `--url` | List MFEs registered on the dev registry |
| `lyx publish [mfe]` | `-s`, `-t`, `-v`, `--slot` | Build, tar, upload single MFE version to server |
| `lyx login` | `-s`, `-e`, `-p` | Authenticate and save token to `~/.lyxrc` |
| `lyx deploy` | `-s`, `-v`, `-a/--all` | Interactive multi-MFE deploy with auto version bump |
| `lyx view` | `-s`, `--app`, `--port` | Preview published app locally using shell |

### Behaviors

- `init` updates `pnpm-workspace.yaml` if not already covered by existing globs
- `deploy` auto-increments patch version from server's latest published version
- `deploy` writes updated version back to `mfe.config.json`
- `login` stores `accountId` (alias or ObjectId) in `~/.lyxrc`
- `view` generates temporary `vite.preview.config.ts` in shell package (cleaned on exit)

---

## 3. Shell (`@lyx/shell`)

### Components

| Component | File | Role |
|-----------|------|------|
| `ShellApp` | `ShellApp.tsx` | Root: URL parsing, layout fetch, error/loading states |
| `LayoutRenderer` | `engine/LayoutRenderer.tsx` | CSS grid layout engine with 5 positions |
| `MFESlot` | `components/MFESlot.tsx` | Module Federation remote loader per slot |
| `SlotSkeleton` | `components/SlotSkeleton.tsx` | Position-aware shimmer skeletons |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary for MFE crashes |
| `LyxDevtools` | `components/LyxDevtools.tsx` | Debug panel (Ctrl+Shift+D) |

### URL Parsing

Regex: `/^\/([a-z0-9][a-z0-9-]{1,30}[a-z0-9]|[a-f0-9]{24})\/([^/]+)/`
- Segment 1: `accountId` (alias or ObjectId)
- Segment 2: `slug`

### Module Federation

- Host name: `lyx_shell`
- Remote key format: `{mfeName}_v{version}` (dots → underscores)
- Each version gets a unique key to prevent MF cache collisions
- `loadRemote` result cast to `{ default: ComponentType } | null`

### SSR

- `entry-server.tsx`: `renderToPipeableStream` with skeleton HTML
- `entry-client.tsx`: Hydrate from `window.__LYX_INITIAL__` or CSR fallback
- Assets served from `/_assets/` base path

---

## 4. Admin API (`@lyx/admin-api`)

### Routes

| Group | Endpoints | Auth |
|-------|-----------|------|
| Health | `GET /api/health` | No |
| Auth | `POST register/login`, `GET /me`, `PUT /alias` | Rate-limited, JWT for /me and /alias |
| Apps | CRUD `GET/POST/PUT/DELETE /api/apps/:id` | JWT |
| App Config | `GET/PUT config`, `POST publish`, `GET versions` | JWT |
| MFEs | CRUD + `POST versions` (multipart upload) | JWT |
| Layouts | List (public), CRUD (JWT for write) | Mixed |
| Runtime | `GET /:accountId/:slug/{layout,mfes,mfes/slot/:s,mfes/by-name/:n}` | No (public) |

### Models

| Model | Key Fields | Unique Constraints |
|-------|-----------|-------------------|
| Account | email, passwordHash, name, alias | email; alias (sparse) |
| App | accountId, name, slug, description | {accountId, slug} compound |
| AppConfig | appId, version, status, assignments[], layoutSnapshot | {appId, version} |
| MFE | accountId, name, archived | name (global) |
| MFEVersion | mfeId, version, slot, remoteEntryUrl, bundlePath | {mfeId, version} |
| LayoutTemplate | name, regions[], isBuiltIn | name |

### Business Logic

- **Draft/Publish cycle**: Apps have draft configs → publish creates published snapshot + new draft
- **Version bumping**: Patch increment on publish (`0.0.0` → `1.0.0` for first, then `1.0.1`, `1.0.2`...)
- **remoteEntryUrl resolution**: Always from MFEVersion record, never from client
- **Account alias**: 3-32 chars, alphanumeric + hyphens, unique, not reserved slugs
- **MFE delete guard**: Cannot delete if referenced in any published AppConfig

---

## 5. Admin UI (`@lyx/admin-ui`)

### Pages

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | Stats cards, recent apps/MFEs |
| AppList | `/apps` | Create app modal (with layout picker), app cards with preview links |
| AppDetail | `/apps/:id` | Tabs: Configuration (assign MFEs), Versions, Settings. Save draft, publish |
| MFEList | `/mfes` | Register MFE modal, active/archived separation |
| MFEDetail | `/mfes/:id` | Version list, archive/delete |
| Layouts | `/layouts` | Layout grid with preview, create/edit/delete |
| LayoutBuilder | `/layouts/new`, `/layouts/:id/edit` | Visual region builder, quick templates |
| Settings | `/settings` | Account alias management, logout |
| Login | `/login` | Email/password form |
| Register | `/register` | Name/email/password form |

### Contexts

- **AuthContext**: `account`, `login`, `register`, `logout`, `refreshAccount`
- **RefreshContext**: `refreshKey`, `triggerRefresh` (header refresh button)

### Design System

- Dark theme with CSS variables
- Components: `Skeleton`, `CardSkeleton`, `ListSkeleton`, `PageSkeleton`
- Patterns: `LayoutPreview`, `VersionSelector`

---

## 6. SSR Server (`platform/ssr`)

### Routes

| Path | Behavior |
|------|----------|
| `GET /health` | JSON health check |
| `/storage/*` | S3 direct or API proxy for MFE bundles |
| `/api/*` | Reverse proxy to admin-api with cache tuning |
| `/_assets/*` | Static files (immutable, 1yr cache) |
| `/:accountId/:slug` | Streaming SSR with skeleton-first rendering |

### Reserved Paths

`health`, `api`, `storage`, `_assets`, `admin`, `favicon`, `login`, `register`, `auth` — not treated as accountId.

---

## 7. Infrastructure

### Local (Docker Compose)

| Service | Port | Role |
|---------|------|------|
| nginx | 80 | Reverse proxy, all routes |
| admin-api | 4000 | Express API |
| admin-ui | 4001 | React SPA |
| ssr | 4002 | Streaming SSR |
| mongodb | 27017 | Database |
| minio | 9000/9001 | Object storage |

### AWS (App Runner)

| Service | Port | Instance Role |
|---------|------|--------------|
| lyx-production-admin-api | 4000 | lyx-apprunner-instance (S3 access) |
| lyx-production-admin-ui | 4001 | None |
| lyx-production-ssr | 4002 | lyx-apprunner-instance (S3 access) |

### CI/CD Pipeline

| Job | Trigger | Purpose |
|-----|---------|---------|
| build-and-test | All pushes/PRs | Build, lint, test framework packages |
| detect-changes | Push to main + dispatch | Determine what to deploy |
| setup-infra | Any deploy needed | Create ECR, IAM, S3 if missing |
| deploy-admin-api | admin-api files changed | Build, push, create/update service |
| deploy-admin-ui | admin-ui files changed | Build, push, create/update service |
| deploy-ssr | ssr/shell files changed | Build, push, create/update service |
| show-urls | After deploy | Display service URLs |

### Scripts

| Script | Purpose |
|--------|---------|
| `platform.sh` | Local Docker Compose management |
| `deploy-aws.sh` | Full AWS deployment (IAM, S3, ECR, App Runner) |
| `destroy-aws.sh` | Tear down all AWS resources |
| `ensure-infra.sh` | Idempotent infra creation for CI |
| `ensure-service.sh` | App Runner create-or-update for CI |
| `aws-login.sh` | Save AWS credentials to `~/.lyx-aws` |
| `iam-policy.json` | IAM policy for CI user |
