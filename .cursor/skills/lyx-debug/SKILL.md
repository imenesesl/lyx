---
name: lyx-debug
description: >-
  Debug and resolve Lyx framework errors. Use when the user encounters build failures,
  deployment errors, runtime issues, CI failures, or MFE loading problems. Consults
  the error knowledge base for known solutions.
---

# Lyx Debug Skill

## Step 0: Check Prerequisites

Before debugging, always verify:

1. **AWS credentials** (if AWS-related):
   ```bash
   source ~/.lyx-aws 2>/dev/null
   aws sts get-caller-identity
   ```
   If expired → `bash scripts/aws-login.sh`

2. **CLI is linked**:
   ```bash
   which lyx
   ```
   If not found → `cd packages/cli && pnpm build && pnpm link --global`

3. **Lockfile is current** (if install fails):
   ```bash
   pnpm install --no-frozen-lockfile
   ```
   Then commit `pnpm-lock.yaml` if changed.

## Step 1: Classify the Error

| Category | Symptoms |
|----------|----------|
| **Build** | `tsc` errors, Vite failures, Module Federation issues |
| **Deploy** | `lyx deploy` failures, S3 upload errors, version conflicts |
| **CI** | GitHub Actions failures, ECR push errors, App Runner issues |
| **Runtime** | MFE not loading, wrong version rendered, blank page |
| **Auth** | Login failures, JWT errors, `Unexpected token '<'` |
| **Infra** | IAM permission denied, ECR repo not found, S3 access denied, ExpiredToken |

## Step 2: Check Known Errors

Read [docs/errors.md](../../docs/errors.md) for previously resolved issues with exact solutions.

## Step 3: Common Solutions

### Build Errors

- **`loadRemote` type error**: Cast result — `mf.loadRemote(...) as { default: ComponentType } | null`
- **Spread args error**: Use tuple type — `(...args: [any, string, string?])`
- **`pnpm.onlyBuiltDependencies`**: Remove from sub-packages, only keep at root
- **Lockfile out of date after rename**: `pnpm install --no-frozen-lockfile`, commit `pnpm-lock.yaml`

### Deploy Errors

- **ECR repo not found**: Run `bash scripts/ensure-infra.sh` first
- **IAM permission denied**: Apply `scripts/iam-policy.json` to the CI user
- **Invalid JSON in env vars**: Use `jq -nc` to build JSON, never string interpolation
- **ExpiredToken**: Run `bash scripts/aws-login.sh` — credentials saved to `~/.lyx-aws`

### Runtime Errors

- **MFE bundles not loading (Failed to fetch dynamically imported module)**: SSR uses AWS SDK with instance role — ensure service deployed with `NEEDS_INSTANCE_ROLE=true`
- **Same MFE, different slots show same version**: MF caches by remote name — each version needs unique name (`mfeName_v0_0_2`)
- **MFE version stuck after publish**: Check that `app-config.ts` resolves `remoteEntryUrl` from `MFEVersion` record, not client-sent data
- **`Unexpected token '<'`**: API requests hitting static server — ensure `serve.cjs` proxy is working

### CI Errors

- **Secret with newline breaks JSON**: Use `jq --arg` to pass secrets safely
- **Build takes 15+ min**: Only build framework packages, not example apps
- **Lint fails for `@lyx/shell`**: Check `MFESlot.tsx` and `LyxDevtools.tsx` for TS errors
- **Deploy jobs skipped**: Check if services exist (< 3 triggers full deploy), or use manual dispatch

### Infrastructure Errors

- **S3 public access blocked**: SSR uses authenticated AWS SDK — no public bucket needed. Ensure SSR has instance role.
- **App Runner not updating**: Force with `aws apprunner start-deployment --service-arn <arn>`

## Step 4: Document the Resolution

**CRITICAL**: After fixing ANY error, update `docs/errors.md` following this format:

```markdown
### [Error Title]
**Category**: Build | Deploy | CI | Runtime | Auth | Infra
**Symptom**: What the user sees
**Cause**: Root cause
**Fix**: Step-by-step solution
**Prevention**: How to avoid in the future
```

This creates a feedback loop — future agents will find the solution immediately.

## Agent Self-Improvement Rules

1. Before debugging, always read `docs/errors.md` first
2. After resolving, always update `docs/errors.md`
3. If a fix involves a new pattern, update the corresponding `.cursor/rules/*.mdc`
4. If a fix changes the workflow, update the corresponding `.cursor/skills/*/SKILL.md`
5. Never make the same mistake twice — the error knowledge base prevents this
