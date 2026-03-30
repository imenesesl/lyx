# Lyx Role-Based Decision Framework

Every change to the Lyx framework should be evaluated from six perspectives. This ensures quality, scalability, maintainability, and strategic alignment.

---

## Roles

### Product Owner
**Focus**: Product strategy, market positioning, backlog prioritization, competitive analysis
**Questions to ask**:
- Does this feature close a competitive gap? (see [competitive-analysis.md](competitive-analysis.md))
- What is the user impact?
- Is this the highest priority item we could work on?
- Are the acceptance criteria clear and measurable?
- How does this affect our strategic positioning?

**Responsibilities**:
- Maintains [docs/backlog.md](backlog.md) — the single source of truth for what to build
- Updates [docs/competitive-analysis.md](competitive-analysis.md) quarterly
- Defines acceptance criteria for every backlog item using the P0-P3 framework
- Prioritizes based on: market gap, user impact, competitive pressure, technical feasibility
- Reviews completed features against acceptance criteria before marking "done"
- Analyzes competitor releases and adjusts priorities accordingly

**Review checklist**:
- [ ] Feature addresses a documented competitive gap or user need
- [ ] Priority level (P0-P3) is justified with market data
- [ ] Acceptance criteria are specific, measurable, and testable
- [ ] Backlog entry includes competitive justification
- [ ] No duplicate or conflicting backlog items

### Project Manager
**Focus**: Execution planning, role coordination, status tracking, delivery assurance
**Questions to ask**:
- Has this item been analyzed by Architect and Staff?
- Is the effort estimate realistic?
- Are there blocking dependencies?
- Is documentation included in the definition of done?
- Is the sprint load balanced?

**Responsibilities**:
- Takes prioritized backlog items and routes them through the analysis pipeline
- For each candidate, requests review from Architect (feasibility) and Staff/Principal (approach + effort)
- Maintains [docs/workplan.md](workplan.md) — the current execution plan
- Tracks status transitions: proposed → architect-review → staff-review → approved → in-progress → qa-review → done
- Ensures documentation is updated before marking any item "done"
- Facilitates decision-making when Architect and Staff disagree

**Review checklist**:
- [ ] Architect analysis completed with risks identified
- [ ] Staff/Principal estimate provided with approach documented
- [ ] Engineer assigned with clear scope
- [ ] QA checklist defined
- [ ] Documentation checklist included
- [ ] No item skips the analysis step (P0/P1 items require both Architect and Staff sign-off)

### Architect
**Focus**: System design, boundaries, data flow, infrastructure
**Questions to ask**:
- Does this change respect package boundaries?
- Does it affect the data flow between services?
- Is the infrastructure impact understood?
- Does it scale horizontally?
- Are there security implications?

**Review checklist**:
- [ ] No circular dependencies between packages
- [ ] API contracts are backward-compatible
- [ ] Database schema changes are migration-safe
- [ ] Infrastructure changes are idempotent
- [ ] URL patterns follow `/{accountId}/{slug}/` convention

### Staff Engineer
**Focus**: Implementation quality, patterns, performance, DX
**Questions to ask**:
- Is the pattern consistent with existing code?
- Are there performance implications?
- Is error handling comprehensive?
- Does it follow TypeScript strict mode?
- Is the developer experience intuitive?

**Review checklist**:
- [ ] Follows established patterns (see `.cursor/rules/`)
- [ ] No `any` types without justification
- [ ] Error boundaries for MFE loading
- [ ] Loading states (skeletons) for async operations
- [ ] CLI commands are documented and tested

### Developer
**Focus**: Feature implementation, component quality, SDK usage
**Questions to ask**:
- Does the MFE export default correctly?
- Is inter-MFE communication using SDK (not window)?
- Are events named with `domain:action` convention?
- Is shared state key unique?
- Does the component handle loading/error states?

**Review checklist**:
- [ ] `export default` on the MFE component
- [ ] Uses `@lyx/sdk` for communication
- [ ] No hardcoded URLs
- [ ] Responsive design considered
- [ ] Component is self-contained (no cross-MFE imports)

### QA
**Focus**: Testing, regression prevention, error documentation
**Questions to ask**:
- Is this error documented in `docs/errors.md`?
- Could this break existing MFEs?
- Are edge cases handled (first deploy, empty state, missing data)?
- Is the fix tested in both local and production environments?
- Does the CI catch this type of error?

**Review checklist**:
- [ ] Error documented with cause, fix, and prevention
- [ ] Regression test added if applicable
- [ ] CI pipeline validates the fix
- [ ] Local development flow verified
- [ ] Production deployment flow verified

---

## Decision Template

When making a significant change, document the decision:

```markdown
## [Decision Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Implemented

### Context
What problem are we solving?

### Decision
What approach did we choose?

### Consequences
- Product Owner: [impact on backlog and competitive position]
- Project Manager: [impact on timeline and dependencies]
- Architect: [impact on system design]
- Staff: [impact on implementation patterns]
- Developer: [impact on DX and workflow]
- QA: [impact on testing and reliability]
```

---

## Feedback Loop

### Bug Resolution
1. **Error occurs** → Developer reports
2. **Debug** → Consult `docs/errors.md` first
3. **Fix** → Implement solution
4. **Document** → Add to `docs/errors.md` with full analysis
5. **Prevent** → Add rule to `.cursor/rules/` if it's a pattern
6. **Verify** → Ensure CI catches it going forward
7. **Educate** → Update README if user-facing

### Feature Delivery
1. **Signal** → User request, competitor release, or market gap identified
2. **PO analyzes** → Check `docs/competitive-analysis.md`, create backlog entry
3. **PM routes** → Send to Architect + Staff for analysis
4. **Architect reviews** → Feasibility, system impact, risks
5. **Staff reviews** → Approach, effort, technical risks
6. **PM approves** → Add to `docs/workplan.md` sprint
7. **Engineer implements** → Code, tests, PR
8. **QA validates** → Acceptance criteria, regression, edge cases
9. **Docs updated** → features.md, errors.md, README, rules, skills
10. **PO signs off** → Feature marked done, backlog updated

This cycle ensures strategic alignment and zero-bug convergence over time.
