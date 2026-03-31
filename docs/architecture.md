# Lyx Architecture

## Decision Record

All architectural decisions follow this review process:

| Role | Responsibility |
|------|---------------|
| **Architect** | System design, package boundaries, data flow, infrastructure |
| **Staff Engineer** | Implementation patterns, performance, scalability, security |
| **Developer** | Feature implementation, component design, SDK usage |
| **QA** | Testing strategy, regression prevention, error documentation |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Lyx Framework                           │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  @lyx/cli    │  @lyx/sdk    │  @lyx/shell  │ @lyx/vite-plugin  │
│  scaffold    │  events      │  host app    │ Module Federation  │
│  build       │  state       │  SSR         │ auto-config        │
│  deploy      │  navigation  │  layout      │                    │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│                        @lyx/types                               │
│                   Shared TypeScript interfaces                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Platform Services                          │
├────────────────┬────────────────┬───────────────┬──────────────┤
│  admin-api     │  admin-ui      │  ssr          │  nginx       │
│  Express+Mongo │  React SPA     │  Streaming    │  Reverse     │
│  S3 Storage    │  Dashboard     │  React SSR    │  Proxy       │
│  JWT Auth      │  App Config    │  MFE Loading  │  (local)     │
└────────────────┴────────────────┴───────────────┴──────────────┘
```

## Data Flow

### MFE Publish Flow

```
Developer → lyx deploy → CLI builds with Vite+MF → tar bundle
  → POST /api/mfes/:id/versions (upload)
  → API extracts to S3 → stores MFEVersion record in MongoDB
  → returns new version number
```

### App Rendering Flow

```
Browser → /{accountId}/{slug}/ → SSR Server
  → fetch /api/runtime/{accountId}/{slug}/layout (get layout + assignments)
  → renderToPipeableStream (skeleton HTML)
  → stream to browser (instant paint)
  → client hydrates → Module Federation loads each MFE remote
  → MFEs replace skeletons
```

### URL Resolution

```
/{accountId}/{slug}/
     │          │
     │          └── App slug (unique per account)
     │
     └── Account identifier: MongoDB ObjectId OR custom alias
         Resolved by: resolveAccountId() in runtime.ts
```

## Package Dependencies

```
@lyx/types ←── @lyx/sdk ←── (MFEs use this)
    │              │
    ├── @lyx/vite-plugin ←── (MFEs use this in vite.config)
    │
    ├── @lyx/registry ←── (local dev server)
    │
    ├── @lyx/shell ←── (host app, uses @lyx/vite-plugin)
    │
    └── @lyx/cli ←── (orchestrates everything)
```

## Key Design Decisions

### 1. Module Federation for MFE Loading
**Decision**: Use `@module-federation/runtime` for dynamic remote loading.
**Reason**: Allows independent deployment, version isolation, shared dependencies.
**Trade-off**: Requires unique remote names per version to avoid cache collisions.

### 2. Account-Namespaced URLs
**Decision**: `/{accountId}/{slug}/` instead of `/apps/{slug}/`.
**Reason**: Prevents slug collisions between different accounts.
**Trade-off**: More complex URL parsing, requires alias resolution.

### 3. Streaming SSR
**Decision**: `renderToPipeableStream` with skeleton placeholders.
**Reason**: Instant first paint, progressive loading, SEO support.
**Trade-off**: Requires Node.js SSR server (not static hosting).

### 4. CLI-Driven Workflow
**Decision**: All MFE operations go through `lyx` CLI.
**Reason**: Consistent versioning, validation, and deployment across teams.
**Trade-off**: Developers must install and link the CLI globally.

### 5. jq for JSON Construction in CI
**Decision**: Use `jq -nc` to build env var JSON in GitHub Actions.
**Reason**: Secrets can contain newlines or special characters that break string interpolation.
**Trade-off**: Requires `jq` on CI runners (pre-installed on ubuntu-latest).

### 6. Idempotent Infrastructure Scripts
**Decision**: `ensure-infra.sh` and `ensure-service.sh` check-then-create.
**Reason**: Safe to run on any AWS account — creates what's missing, skips what exists.
**Trade-off**: Slightly slower due to API checks before each operation.
