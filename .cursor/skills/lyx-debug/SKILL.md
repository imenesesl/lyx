---
name: lyx-debug
description: >-
  Debug and resolve Lyx framework errors. Use when the user encounters build failures,
  deployment errors, runtime issues, CI failures, or MFE loading problems. Consults
  the error knowledge base for known solutions.
---

# Lyx Debug Skill

## Step 1: Classify the Error

| Category | Symptoms |
|----------|----------|
| **Build** | `tsc` errors, Vite failures, Module Federation issues |
| **Deploy** | `lyx deploy` failures, S3 upload errors, version conflicts |
| **CI** | GitHub Actions failures, ECR push errors, App Runner issues |
| **Runtime** | MFE not loading, wrong version rendered, blank page |
| **Auth** | Login failures, JWT errors, `Unexpected token '<'` |
| **Infra** | IAM permission denied, ECR repo not found, S3 access denied |

## Step 2: Check Known Errors

Read [docs/errors.md](../../docs/errors.md) for previously resolved issues with exact solutions.

## Step 3: Common Solutions

### Build Errors

- **`loadRemote` type error**: Cast result — `mf.loadRemote(...) as { default: ComponentType } | null`
- **Spread args error**: Use tuple type — `(...args: [any, string, string?])`
- **`pnpm.onlyBuiltDependencies`**: Remove from sub-packages, only keep at root

### Deploy Errors

- **ECR repo not found**: Run `bash scripts/ensure-infra.sh` first
- **IAM permission denied**: Apply `scripts/iam-policy.json` to the CI user
- **Invalid JSON in env vars**: Use `jq -nc` to build JSON, never string interpolation

### Runtime Errors

- **Same MFE, different slots show same version**: MF caches by remote name — each version needs unique name (`mfeName_v0_0_2`)
- **MFE version stuck after publish**: Check that `app-config.ts` resolves `remoteEntryUrl` from `MFEVersion` record, not client-sent data
- **`Unexpected token '<'`**: API requests hitting static server — ensure `serve.cjs` proxy is working

### CI Errors

- **Secret with newline breaks JSON**: Use `jq --arg` to pass secrets safely
- **Build takes 15+ min**: Only build framework packages, not example apps
- **Lint fails for `@lyx/shell`**: Check `MFESlot.tsx` and `LyxDevtools.tsx` for TS errors

## Step 4: Document the Resolution

After fixing, add the error and solution to `docs/errors.md` following this format:

```markdown
### [Error Title]
**Category**: Build | Deploy | CI | Runtime | Auth | Infra
**Symptom**: What the user sees
**Cause**: Root cause
**Fix**: Step-by-step solution
**Prevention**: How to avoid in the future
```
