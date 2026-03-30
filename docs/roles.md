# Lyx Role-Based Decision Framework

Every change to the Lyx framework should be evaluated from four perspectives. This ensures quality, scalability, and maintainability.

---

## Roles

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
- Architect: [impact on system design]
- Staff: [impact on implementation patterns]
- Developer: [impact on DX and workflow]
- QA: [impact on testing and reliability]
```

---

## Feedback Loop

1. **Error occurs** → Developer reports
2. **Debug** → Consult `docs/errors.md` first
3. **Fix** → Implement solution
4. **Document** → Add to `docs/errors.md` with full analysis
5. **Prevent** → Add rule to `.cursor/rules/` if it's a pattern
6. **Verify** → Ensure CI catches it going forward
7. **Educate** → Update README if user-facing

This cycle ensures zero-bug convergence over time.
