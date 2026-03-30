# Lyx Competitive Analysis

> Owned by: **Product Owner**
> Last updated: 2026-03-24
> Review cadence: Quarterly

---

## Executive Summary

Lyx occupies a unique position in the micro frontend space: it is the only framework that combines a **CLI-driven developer workflow**, **Admin UI for non-technical users**, **Streaming SSR**, and **account-namespaced multi-tenancy** in a single integrated platform. Competitors typically solve one or two of these dimensions well, leaving teams to assemble the rest.

---

## Direct Competitors

### single-spa

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Framework-agnostic application lifecycle orchestrator. Top-level routing to mount/unmount independent SPAs. |
| **Strengths** | Mature, widely adopted, no bundler lock-in, large community, supports React/Angular/Vue/Svelte simultaneously. |
| **Weaknesses** | No built-in JS/CSS sandbox, no SSR story, no admin UI, no CLI workflow, no registry/discovery. Teams must assemble their own deployment and governance. |
| **Pricing** | Open source (MIT). |
| **Lyx advantage** | Lyx provides the full platform (CLI, Admin UI, SSR, registry) that single-spa teams must build themselves. |
| **Lyx gap** | single-spa supports multi-framework natively; Lyx is React-only. |

### Module Federation (Webpack/Rspack/Vite ecosystem)

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Runtime remote loading mechanism: hosts consume exposed modules from remotes with shared dependencies. |
| **Strengths** | De facto standard for code sharing at runtime, reduces duplicate vendor bundles, works across Webpack/Rspack/Vite. |
| **Weaknesses** | Not a full platform — no routing, auth, navigation contracts, error budgets, admin tools, or SSR/streaming. |
| **Pricing** | Open source. |
| **Lyx advantage** | Lyx builds ON TOP of Module Federation, adding everything MF lacks (CLI, Admin, SSR, versioning, registry). |
| **Lyx gap** | MF ecosystem has broader bundler support and community tooling. |

### Piral

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Opinionated end-to-end MFE framework: pilets (feature bundles), Piral instance (shell), feed/registry. |
| **Strengths** | Full framework with clear productized path, extension points between pilets, Piral Cloud for managed ops. |
| **Weaknesses** | Smaller ecosystem than MF/single-spa, pilet model is more restrictive, less SSR focus. |
| **Pricing** | Open source (MIT). Piral Cloud has paid tiers. |
| **Lyx advantage** | Lyx has streaming SSR, a visual Admin UI, account multi-tenancy, and a simpler CLI workflow. |
| **Lyx gap** | Piral has a more mature plugin extension API and inter-pilet communication model. |

### Qiankun (Alibaba)

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Full micro-frontend kit built on single-spa with JS sandbox, style isolation, prefetch. |
| **Strengths** | Practical defaults for sandbox + lifecycle, large enterprise usage, strong isolation (global variable protection, CSS bleed prevention). |
| **Weaknesses** | Sandbox complexity creates debugging edge cases, performance vs isolation tradeoffs, English docs weaker. |
| **Pricing** | Open source. |
| **Lyx advantage** | Lyx has SSR, Admin UI, CLI, versioning, multi-tenancy — none of which Qiankun provides. |
| **Lyx gap** | Qiankun's JS sandbox and style isolation are production-hardened; Lyx has no isolation. |

### Garfish (ByteDance)

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Container + sandbox framework with router, loader, store, HTML entry, dependency sharing, preload. |
| **Strengths** | Production-hardened at ByteDance scale, route-driven mounting, cross-framework support. |
| **Weaknesses** | Smaller global mindshare, overlaps heavily with Qiankun, community skews to Chinese ecosystem. |
| **Pricing** | Open source. |
| **Lyx advantage** | Full platform vs runtime-only tool. |
| **Lyx gap** | Garfish has prefetch/preload and sandbox that Lyx lacks. |

### Luigi (SAP)

| Dimension | Assessment |
|-----------|------------|
| **What it is** | PostMessage-based bridge for enterprise portals. Navigation, context, auth helpers for modular admin UIs. |
| **Strengths** | Enterprise guardrails, consistent shell UX, strong fit for internal platforms, tech-agnostic. |
| **Weaknesses** | Portal/iframe-oriented architecture, less SPA-native, lower mindshare outside SAP ecosystem. |
| **Pricing** | Open source (Apache-2.0). |
| **Lyx advantage** | Lyx uses Module Federation (no iframes), has SSR streaming, modern React-based Admin UI. |
| **Lyx gap** | Luigi has more mature enterprise governance patterns. |

### Bit.dev

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Component and app composition platform with scopes, workspaces, documentation, and cross-repo reuse. |
| **Strengths** | Excellent for scaling design systems, controlled reuse, versioned component APIs. |
| **Weaknesses** | Not a runtime shell for micro-apps, still needs routing/isolation/deployment elsewhere, enterprise pricing. |
| **Pricing** | Open source core (MIT). Bit Cloud enterprise is sales-led pricing. |
| **Lyx advantage** | Lyx is a full runtime platform, not just a component registry. |
| **Lyx gap** | Bit's component-level versioning and documentation is more granular. |

### micro-app (JD.com)

| Dimension | Assessment |
|-----------|------------|
| **What it is** | Custom element embedding (`<micro-app>`), JS sandbox, style/element isolation, plugins, preload. |
| **Strengths** | Ergonomic declarative host markup, good performance claims, Web Component integration. |
| **Weaknesses** | Narrow global adoption, shadow DOM boundaries surprise teams on accessibility/styling. |
| **Pricing** | Open source. |
| **Lyx advantage** | Full platform with Admin UI, CLI, SSR, versioning. |
| **Lyx gap** | micro-app's Web Component approach enables declarative embedding. |

---

## Adjacent Competitors

### Vercel

| Dimension | Assessment |
|-----------|------------|
| **Overlap** | Multi-project monorepos, preview URLs, edge deployment. |
| **Strengths** | Fast shipping, excellent DX, serverless/edge runtime, analytics. |
| **Not a competitor because** | No in-browser MFE orchestration, no shared routing contracts between apps. |
| **Pricing** | Freemium + Pro/Enterprise. |

### Netlify

| Dimension | Assessment |
|-----------|------------|
| **Overlap** | Many sites/apps, branch previews, edge, enterprise delivery. |
| **Strengths** | Static + Jamstack workflows, simple mental model. |
| **Not a competitor because** | No opinionated in-browser shell for heterogeneous micro-apps. |
| **Pricing** | Free tier + paid plans. |

### AWS Amplify

| Dimension | Assessment |
|-----------|------------|
| **Overlap** | Full-stack hosting, auth, data, CI/CD for frontends. |
| **Strengths** | AWS-native integration (IAM, Cognito, AppSync). |
| **Not a competitor because** | No MFE orchestration or cross-repo runtime composition. |
| **Pricing** | Usage-based AWS billing. |

### Backstage (Spotify)

| Dimension | Assessment |
|-----------|------------|
| **Overlap** | Modular UI via plugins, catalog, developer portal — organizational scaling. |
| **Strengths** | Plugin architecture, software catalog, scaffolders, strong for internal dev platforms. |
| **Not a competitor because** | Primary audience is devportal, not consumer-grade multi-team SPAs. |
| **Pricing** | Open source (Apache-2.0, CNCF). |

---

## Feature Matrix

| Capability | Lyx | single-spa | Module Federation | Piral | Qiankun | Garfish | Luigi | Bit | Backstage |
|---|---|---|---|---|---|---|---|---|---|
| CLI workflow | **Lead** | - | - | Match | - | - | - | Match | Match |
| Admin UI (no-code config) | **Lead** | - | - | Partial | - | - | - | - | Match |
| Streaming SSR | **Lead** | - | - | - | - | - | - | - | - |
| Account multi-tenancy | **Lead** | - | - | - | - | - | - | - | - |
| MFE versioning + registry | **Lead** | - | - | Match | - | - | - | Lead | Match |
| Inter-MFE events + state | Match | Match | - | Match | - | Match | Match | - | - |
| JS sandbox / isolation | **Missing** | - | - | - | Lead | Lead | Partial | - | - |
| Style isolation (CSS) | **Missing** | - | - | - | Lead | Lead | Partial | - | - |
| MFE prefetch/preload | **Missing** | - | - | - | Match | Lead | - | - | - |
| Multi-framework support | **Missing** | Lead | Match | Match | Lead | Match | Lead | Match | Partial |
| Per-MFE observability | **Missing** | - | - | - | - | - | - | - | Partial |
| Contract testing | **Missing** | - | - | - | - | - | - | Partial | - |
| Visual layout builder | Partial | - | - | - | - | - | - | - | - |
| Edge/CDN deployment | **Missing** | - | - | - | - | - | - | - | - |
| Mobile/WebView SDK | **Missing** | - | - | - | - | - | - | - | - |

Legend: **Lead** = best-in-class, **Match** = competitive parity, **Partial** = exists but incomplete, **Missing** = not implemented, **-** = not applicable/not offered.

---

## Market Gaps (Opportunities for Lyx)

1. **Cross-team API contracts and versioning** — No tool validates that MFE event schemas remain compatible across independent release cadences. Consumer-driven contract testing for frontends is immature.

2. **SSR + streaming + MFE composition** — Lyx already leads here. Deepening this with partial hydration and edge caching would extend the moat.

3. **Runtime security boundaries** — True strong isolation (CPU/memory) usually implies iframes or Worker-based designs. Most "sandboxes" are best-effort JS patches. An ergonomic middle ground is unsolved.

4. **Per-MFE observability and SLOs** — Error budgets, distributed tracing from shell through remotes, and user-impact attribution when one MFE fails are fragmented across RUM vendors.

5. **Governance without slowing teams** — Design tokens, accessibility baselines, performance budgets, and compliance across independently deployed UIs remain process + tooling gaps.

6. **Discovery and operations** — Dynamic registries (who can expose what, at which version, to which tenant), rollback, canary by route/user, and audit trails are custom-built everywhere.

7. **Testing across MFE boundaries** — E2E across remotes, visual regression with version skew, and contract tests for federated imports are notoriously painful.

8. **Mobile and native** — Most MFE stacks target web SPA. Embedding in native WebViews with consistent contracts is ad hoc.

---

## Strategic Positioning

Lyx's unique value proposition is:

> **The only MFE framework where a developer writes a component, runs `lyx deploy`, and a non-technical user assembles the application from the Admin UI — with streaming SSR, account isolation, and zero infrastructure configuration.**

This positions Lyx as **the full-stack MFE platform**, competing not on any single axis but on the **integration of all axes**: CLI + Admin UI + SSR + Registry + Multi-tenancy + CI/CD.

The primary threat is not a single competitor but the **"assemble your own" approach** (MF + single-spa + Vercel + custom admin). Lyx wins when the cost of assembly exceeds the cost of adoption.
