# Lyx Product Backlog

> Owned by: **Product Owner**
> Last updated: 2026-03-24
> Source: [docs/competitive-analysis.md](competitive-analysis.md)

---

## Priority Framework

| Priority | Meaning | Criteria |
|----------|---------|----------|
| **P0** | Critical differentiator | Fills a market gap no competitor solves. High user impact. |
| **P1** | Competitive parity | Leaders already have it. Missing it risks disqualification in evaluations. |
| **P2** | Strategic advantage | Unique to Lyx vision. Extends the moat. |
| **P3** | Nice to have | Low urgency. Improves polish or niche use cases. |

Status: `proposed` | `architect-review` | `approved` | `in-progress` | `done` | `rejected`

---

## P0 — Critical Differentiators

### P0-001: MFE Contract Testing

**Status**: done
**Competitive gap**: No competitor validates that MFE event schemas remain compatible across independent release cadences.
**Description**: Automated validation that MFE events (`emit`/`on` contracts), shared state keys, and exposed props don't break consumers when a producer MFE is updated independently.
**Acceptance criteria**:
- CLI command `lyx test` that validates event contracts between MFEs
- Detects breaking changes before `lyx deploy` completes
- Generates a compatibility report
- Blocks deploy if breaking changes are found (with `--force` override)
**Technical scope**: CLI, SDK, Admin API (contract registry)
**Review roles**: Architect (contract schema design), Staff (SDK integration)

### P0-002: Per-MFE Observability

**Status**: done
**Competitive gap**: Per-MFE error budgets and health metrics are fragmented across RUM vendors. No MFE framework provides this natively.
**Description**: Error boundaries with metrics collection, per-slot error budgets, health dashboard in Admin UI, and alerts when an MFE degrades.
**Acceptance criteria**:
- [x] Shell captures and reports MFE load failures, render errors, and event timeouts
- [x] Admin UI shows per-MFE health: error rate, load time p50/p95, availability
- [x] Error budget per MFE with visual indicator (green/yellow/red)
- [x] API endpoint for health data consumption by external tools
**Technical scope**: Shell, Admin API, Admin UI
**Review roles**: Architect (data pipeline), Staff (performance impact)

### P0-003: Canary / Rollback per MFE

**Status**: done
**Competitive gap**: All competitors require custom-built canary and rollback. No framework provides version traffic splitting at the MFE level.
**Description**: Deploy a new MFE version to X% of users (canary), monitor error rates, auto-rollback if error threshold exceeded.
**Acceptance criteria**:
- Admin UI: set traffic split percentage per MFE version (e.g., 90% v1 / 10% v2)
- Runtime API resolves MFE version based on traffic rules (cookie or header-based session stickiness)
- Auto-rollback trigger when error rate exceeds configurable threshold
- CLI: `lyx deploy --canary 10` flag for automatic 10% canary
**Technical scope**: Admin API, Runtime API, Shell, CLI
**Review roles**: Architect (traffic splitting design), Staff (session stickiness)

---

## P1 — Competitive Parity

### P1-001: CSS Style Isolation

**Status**: proposed
**Competitive gap**: Qiankun and Garfish provide CSS scoping per MFE. Lyx MFEs can bleed styles into each other.
**Description**: Automatic CSS scoping per MFE slot to prevent style conflicts between independently developed MFEs.
**Acceptance criteria**:
- MFE styles are scoped to their slot container (no global leakage)
- Supports both inline styles and external CSS files
- Zero config for MFE developers (automatic in Shell)
- Option to opt-out for intentional global styles
**Technical scope**: Shell (MFESlot), Vite Plugin
**Review roles**: Staff (Shadow DOM vs scoped CSS tradeoffs)

### P1-002: MFE Prefetch / Preload

**Status**: proposed
**Competitive gap**: Garfish and micro-app offer predictive MFE loading. Lyx loads MFEs only on render.
**Description**: Predictive loading of MFEs based on layout configuration and navigation patterns to reduce perceived load times.
**Acceptance criteria**:
- Shell preloads MFE bundles for visible slots during idle time
- Navigation-based prefetch: preload target MFEs when user hovers on navigation links
- Configurable prefetch strategy: `eager` (on page load), `idle` (requestIdleCallback), `hover` (on intent)
- No performance regression for initial page load
**Technical scope**: Shell, SDK (navigation hooks)
**Review roles**: Staff (performance benchmarking), Architect (caching strategy)

### P1-003: Multi-Framework Support

**Status**: proposed
**Competitive gap**: single-spa and Piral support React, Angular, Vue, Svelte. Lyx is React-only.
**Description**: Allow MFEs written in Vue, Angular, or Svelte to be loaded alongside React MFEs in the same Shell.
**Acceptance criteria**:
- MFE can be built with Vue 3, Angular 17+, or Svelte 5 using the Lyx Vite Plugin
- Shell renders any framework's MFE in any slot
- SDK events and shared state work across frameworks
- CLI `lyx create` supports `--framework vue|angular|svelte|react` flag
**Technical scope**: Vite Plugin, Shell (MFESlot adapter), SDK, CLI
**Review roles**: Architect (adapter pattern design), Staff (bundle size impact)

### P1-004: Supabase Compatibility

**Status**: proposed
**Competitive gap**: No MFE framework integrates with BaaS platforms. Teams on Supabase must wire auth, storage, and database manually. First-class support would dramatically lower Lyx's barrier to entry and tap into Supabase's massive developer community.
**Description**: Pluggable backend adapter layer so Lyx can use Supabase Auth (instead of custom JWT), Supabase Storage (instead of S3/MinIO), and Supabase Database (PostgreSQL, instead of MongoDB) as its persistence and identity layer.
**Acceptance criteria**:
- Admin API supports Supabase as an alternative backend via env-based adapter selection (`LYX_BACKEND=supabase`)
- Auth: login/register/session via Supabase Auth (RLS-aware), with JWT forwarding to the Admin API
- Storage: MFE bundles stored in Supabase Storage buckets instead of S3/MinIO
- Database: app, MFE, layout, and metric data persisted in Supabase PostgreSQL (via Prisma or Supabase JS client) instead of MongoDB/Mongoose
- CLI: `lyx init` detects Supabase config and scaffolds accordingly
- Docker Compose profile for local dev with Supabase (`supabase start` or self-hosted)
- Zero changes required for MFE developers — the adapter is transparent to the runtime
**Technical scope**: Admin API (adapter layer), CLI, Docker Compose, docs
**Review roles**: Architect (adapter pattern, data migration strategy), Staff (Supabase SDK integration), QA (parity testing with MongoDB backend)

---

## P2 — Strategic Advantage

### P2-001: Visual Layout Builder (Drag-and-Drop)

**Status**: proposed
**Competitive gap**: No competitor has a no-code layout editor for MFE composition. Piral and Backstage require code for layouts.
**Description**: Drag-and-drop interface in Admin UI to create custom layouts by placing MFE slots visually, with resizing and responsive breakpoints.
**Acceptance criteria**:
- Admin UI: canvas-based layout designer with drag-and-drop slots
- Save custom layouts to the database
- Preview layout with assigned MFEs before publishing
- Export layout as JSON (compatible with existing layout system)
- Responsive: configure desktop, tablet, and mobile breakpoints
**Technical scope**: Admin UI, Admin API (layout model)
**Review roles**: Staff (UI component architecture), Architect (layout schema)

### P2-002: MFE Marketplace / Registry Discovery

**Status**: proposed
**Competitive gap**: Backstage has a plugin catalog. No MFE framework has a searchable MFE marketplace with versioning, docs, and previews.
**Description**: Searchable catalog of available MFEs within an account, with version history, README, live preview, and usage statistics.
**Acceptance criteria**:
- Admin UI: browsable MFE catalog with search and filters (by slot, by tag)
- Each MFE has a detail page: README (from repo), version history, live preview, apps using it
- MFE developers can add tags, description, and documentation via `mfe.config.json`
- Usage analytics: which apps use which MFE, how many users see it
**Technical scope**: Admin UI, Admin API, CLI (metadata upload)
**Review roles**: Architect (data model), Staff (search implementation)

### P2-003: CLI-driven E2E Testing

**Status**: proposed
**Competitive gap**: E2E testing across MFE boundaries is notoriously painful. No framework provides a CLI command for this.
**Description**: `lyx test` command that spins up a local shell with specific MFE versions and runs integration tests.
**Acceptance criteria**:
- `lyx test` starts a local shell with MFEs from `mfes/` directory
- Supports Playwright or Cypress as test runner (configurable)
- Can pin specific MFE versions for version-skew testing
- Generates test report with per-MFE results
**Technical scope**: CLI, Shell (test mode), Registry
**Review roles**: Staff (test harness design), QA (testing patterns)

### P2-004: Edge Deployment / CDN

**Status**: proposed
**Competitive gap**: All competitors serve MFE bundles from origin servers. CloudFront/CDN distribution would reduce latency globally.
**Description**: Serve MFE bundles from CloudFront (or compatible CDN) instead of proxying through the SSR App Runner service.
**Acceptance criteria**:
- MFE bundles served from CloudFront with S3 origin
- Cache invalidation on new version publish
- `remoteEntryUrl` points to CDN URL instead of `/storage/`
- Fallback to direct S3 if CDN is unavailable
- Measurable latency improvement (target: 50% reduction in MFE load time for non-local users)
**Technical scope**: Infrastructure (CloudFront, S3), Admin API (URL generation), CI
**Review roles**: Architect (CDN architecture), Staff (cache invalidation strategy)

---

## P3 — Nice to Have

### P3-001: Mobile WebView SDK

**Status**: proposed
**Competitive gap**: Most MFE stacks target web SPA only.
**Description**: SDK for embedding Lyx shell in native iOS/Android WebViews with bridge for native-to-MFE communication.
**Acceptance criteria**:
- JavaScript bridge for native app to send events to MFEs
- MFEs can request native capabilities (camera, geolocation) via SDK
- Shell adapts layout for WebView constraints
**Technical scope**: SDK, Shell, native SDKs (iOS/Android)
**Review roles**: Architect (bridge protocol design)

### P3-002: Design Token Governance

**Status**: proposed
**Competitive gap**: Design tokens across independently deployed UIs remain a process gap.
**Description**: Shared design tokens enforced at build time across all MFEs in an account.
**Acceptance criteria**:
- Admin UI: upload/manage design token set (colors, spacing, typography)
- Vite Plugin injects tokens as CSS custom properties at build time
- Build warning if MFE uses hardcoded values instead of tokens
**Technical scope**: Admin API, Admin UI, Vite Plugin
**Review roles**: Staff (build-time injection)

### P3-003: Audit Trail

**Status**: proposed
**Competitive gap**: Audit logs for MFE operations are custom-built everywhere.
**Description**: Log every publish, config change, version swap, and rollback in Admin API with timestamp and actor.
**Acceptance criteria**:
- All state-changing operations in Admin API create an audit log entry
- Admin UI: audit log page with filters (by app, by MFE, by user, by date)
- API endpoint for external log consumption
**Technical scope**: Admin API, Admin UI
**Review roles**: Architect (data retention), QA (compliance requirements)

---

## Completed Items

### P0-001: MFE Contract Testing — Completed 2026-03-24
Automated validation of MFE event and shared state contracts via `lyx test` and `lyx deploy`.

---

## Rejected Items

_No items rejected yet._
