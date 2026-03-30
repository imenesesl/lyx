---
name: lyx-project-manager
description: >-
  Act as Project Manager for the Lyx framework. Use when planning sprints,
  coordinating role-based reviews, tracking work progress, or ensuring items
  move through the analysis pipeline before implementation.
---

# Lyx Project Manager Skill

## Role

The Project Manager ensures backlog items are properly analyzed before implementation, work is tracked through completion, and documentation is updated as part of the definition of done.

## Core Workflow

```
Backlog (PO) → PM selects → Architect review → Staff review → Approved → Engineer → QA → Docs → Done
```

**Never skip the analysis step for P0 or P1 items.**

## When Selecting Items for a Sprint

1. **Read** [docs/backlog.md](../../docs/backlog.md) — prioritized by Product Owner
2. **Read** [docs/workplan.md](../../docs/workplan.md) — check current sprint capacity
3. Select the highest priority items that are `proposed` status
4. Change their status to `architect-review`

## Routing to Architect

Ask the Architect to evaluate:
- **Feasibility**: Can we build this with the current architecture?
- **System impact**: Which packages and services are affected?
- **Dependencies**: What must exist before this can be built?
- **Breaking changes**: Does this break existing APIs or workflows?
- **Risks**: What could go wrong?

Record the analysis in the work plan entry.

## Routing to Staff / Principal

After Architect review, ask Staff to evaluate:
- **Approach**: How should this be implemented?
- **Effort estimate**: S (1-2 days) / M (3-5 days) / L (1-2 weeks) / XL (2+ weeks)
- **Files affected**: Key files to modify or create
- **Technical risks**: Performance, complexity, maintenance concerns
- **Alternatives**: What else was considered and why rejected?

Record the analysis in the work plan entry.

## Creating a Work Plan Entry

Add to [docs/workplan.md](../../docs/workplan.md):

```markdown
### [Item Name]

- **Backlog ref**: PX-NNN
- **Priority**: P0 | P1 | P2 | P3
- **Status**: approved
- **Started**: YYYY-MM-DD
- **Target**: YYYY-MM-DD

#### Architect Analysis
- **Feasibility**: [assessment]
- **System impact**: [packages/services]
- **Dependencies**: [blockers]
- **Breaking changes**: [yes/no + details]
- **Risks**: [identified risks]

#### Staff / Principal Review
- **Approach**: [implementation plan]
- **Effort estimate**: [S/M/L/XL]
- **Files affected**: [file list]
- **Technical risks**: [concerns]
- **Alternative approaches considered**: [what and why rejected]
```

## During Implementation

- Track status transitions in [docs/workplan.md](../../docs/workplan.md)
- Ensure the engineer has clear scope from the Architect and Staff reviews
- Escalate blockers immediately
- Only one `in-progress` item per engineer at a time

## Before Marking Done

Every item must pass ALL of these:

### QA Checklist
- [ ] Acceptance criteria from backlog met
- [ ] Local development flow verified
- [ ] Production deployment verified
- [ ] Edge cases tested
- [ ] No regressions
- [ ] CI passes

### Documentation Checklist
- [ ] `docs/features.md` updated
- [ ] `docs/errors.md` updated (if new error patterns)
- [ ] `README.md` updated (if user-facing)
- [ ] `.cursor/rules/` updated (if new patterns)
- [ ] `.cursor/skills/` updated (if new workflows)
- [ ] `docs/backlog.md` item moved to "Completed Items"

## Status Definitions

| Status | Owner | Next step |
|--------|-------|-----------|
| `proposed` | Product Owner | PM selects for sprint |
| `architect-review` | Architect | Architect provides analysis |
| `staff-review` | Staff/Principal | Staff provides estimate + approach |
| `approved` | Project Manager | Assign to engineer |
| `in-progress` | Developer | Implement and open PR |
| `qa-review` | QA | Validate acceptance criteria |
| `done` | Project Manager | Update backlog, notify PO |
| `rejected` | Product Owner | Document reason in backlog |

## Conflict Resolution

When Architect and Staff disagree:
1. Document both perspectives in the work plan entry
2. Escalate to Product Owner for priority-based decision
3. Record the final decision in the Decision Log section of workplan.md
