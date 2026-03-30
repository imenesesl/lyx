# Lyx Work Plan

> Owned by: **Project Manager**
> Last updated: 2026-03-24
> Source: [docs/backlog.md](backlog.md)

---

## Workflow

```
Backlog (PO) → PM selects → Architect review → Staff/Principal review → Approved → Engineer implements → QA validates → Docs updated → Done
```

### Status Definitions

| Status | Meaning | Owner |
|--------|---------|-------|
| `proposed` | In backlog, not yet analyzed | Product Owner |
| `architect-review` | Architect evaluating feasibility, impact, risks | Architect |
| `staff-review` | Staff/Principal estimating effort, defining approach | Staff Engineer |
| `approved` | Ready for implementation | Project Manager |
| `in-progress` | Engineer actively working on it | Developer |
| `qa-review` | Implementation complete, QA validating | QA |
| `done` | Shipped, documented, verified | Project Manager |
| `rejected` | Not viable or deprioritized with reason | Product Owner |

---

## Current Sprint

### MFE Contract Testing

- **Backlog ref**: P0-001
- **Priority**: P0
- **Status**: done
- **Started**: 2026-03-24
- **Completed**: 2026-03-24

#### Architect Analysis
- **Feasibility**: Yes — contracts declared in existing `mfe.config.json`, validation as pure function
- **System impact**: Types, CLI, Admin API (new contracts route)
- **Dependencies**: None — builds on existing event bus and shared state
- **Breaking changes**: No — `contracts` field is optional in `MFEConfig`
- **Risks**: Low — additive feature, no changes to runtime behavior

#### Staff / Principal Review
- **Approach**: Contract schemas use JSON Schema subset (type, properties, required, items). Validation logic is a pure function comparing producer/consumer schemas. CLI `lyx test` discovers MFEs and runs validation. `lyx deploy` calls validation pre-upload.
- **Effort estimate**: M (3-5 days)
- **Files affected**: `packages/types/src/contracts.ts` (new), `packages/types/src/mfe-config.ts`, `packages/cli/src/commands/test.ts` (new), `packages/cli/src/lib/contract-validator.ts` (new), `packages/cli/src/commands/deploy.ts`, `platform/admin-api/src/routes/contracts.ts` (new)
- **Technical risks**: Schema comparison is structural, not semantic — cannot catch all incompatibilities
- **Alternative approaches considered**: Full JSON Schema with `ajv` (rejected: too heavy for V1), source code scanning (rejected: unreliable with dynamic event names)

#### Implementation
- **Assigned to**: Engineer (AI agent)
- **Branch**: main

#### QA Checklist
- [x] Acceptance criteria from backlog met
- [ ] Local development flow verified
- [ ] Production deployment verified
- [x] Edge cases tested (no contracts, partial contracts, schema mismatches)
- [x] No regressions in existing features
- [ ] CI pipeline passes

#### Documentation Checklist
- [x] `docs/features.md` updated
- [ ] `docs/errors.md` updated
- [x] `README.md` updated
- [ ] `.cursor/rules/` updated
- [ ] `.cursor/skills/` updated
- [x] `docs/backlog.md` item status updated

---

## Sprint Template

When the Project Manager moves an item from the backlog to the work plan, use this format:

### [Item Name]

- **Backlog ref**: P0-001
- **Priority**: P0 | P1 | P2 | P3
- **Status**: proposed | architect-review | staff-review | approved | in-progress | qa-review | done
- **Started**: YYYY-MM-DD
- **Target**: YYYY-MM-DD

#### Architect Analysis
- **Feasibility**: [Can we build this with current architecture?]
- **System impact**: [Which packages/services are affected?]
- **Dependencies**: [What must exist before this can be built?]
- **Breaking changes**: [Does this break existing APIs or workflows?]
- **Risks**: [What could go wrong?]

#### Staff / Principal Review
- **Approach**: [How should this be implemented?]
- **Effort estimate**: [S/M/L/XL — with time range]
- **Files affected**: [List of key files to modify/create]
- **Technical risks**: [Performance, complexity, maintenance concerns]
- **Alternative approaches considered**: [What else was evaluated and why rejected]

#### Implementation
- **Assigned to**: [Engineer]
- **Branch**: [feature/P0-001-contract-testing]
- **PR**: [link when created]

#### QA Checklist
- [ ] Acceptance criteria from backlog met
- [ ] Local development flow verified
- [ ] Production deployment verified
- [ ] Edge cases tested (empty state, error state, first-time use)
- [ ] No regressions in existing features
- [ ] CI pipeline passes

#### Documentation Checklist
- [ ] `docs/features.md` updated
- [ ] `docs/errors.md` updated (if new error patterns)
- [ ] `README.md` updated (if user-facing)
- [ ] `.cursor/rules/` updated (if new patterns)
- [ ] `.cursor/skills/` updated (if new workflows)

---

## Completed Sprints

_No sprints completed yet._

---

## Decision Log

Record key decisions made during sprint execution:

### Template

- **Date**: YYYY-MM-DD
- **Item**: P0-001
- **Decision**: [What was decided]
- **Rationale**: [Why]
- **Architect sign-off**: [Yes/No]
- **Staff sign-off**: [Yes/No]
