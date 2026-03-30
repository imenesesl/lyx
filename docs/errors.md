# Lyx Error Knowledge Base

Every resolved error is documented here. This serves as a feedback loop — agents and developers should consult this file before debugging, and update it after every new resolution.

---

## Build Errors

### loadRemote Type Arguments Not Supported
**Category**: Build
**Symptom**: `TS2347: Untyped function calls may not accept type arguments` on `mf.loadRemote<...>(...)`
**Cause**: `@module-federation/runtime` instance method doesn't support generic type arguments
**Fix**: Cast the result instead:
```tsx
const mod = await mf.loadRemote(`${key}/default`) as { default: ComponentType<any> } | null;
```
**Prevention**: Never use generic type arguments with `loadRemote`.

### Spread Argument Tuple Type
**Category**: Build
**Symptom**: `TS2556: A spread argument must either have a tuple type or be passed to a rest parameter`
**Cause**: `window.history.pushState` override with `...args: any[]` doesn't satisfy the original signature
**Fix**: Use explicit tuple type:
```tsx
window.history.pushState = function (...args: [any, string, string?]) {
  origPush(...args);
```
**Prevention**: Always type override function parameters explicitly.

### pnpm.onlyBuiltDependencies Warning
**Category**: Build
**Symptom**: `WARN The field "pnpm.onlyBuiltDependencies" was found in sub-package.json`
**Cause**: This field only works at the workspace root, not in individual packages
**Fix**: Remove the `pnpm` field from sub-package `package.json` files
**Prevention**: Only configure `pnpm.*` fields in the root `package.json`.

---

## Deploy Errors

### ECR Repository Not Found
**Category**: Deploy / CI
**Symptom**: `name unknown: The repository with name 'lyx-production/admin-ui' does not exist`
**Cause**: ECR repos don't exist in the target AWS account (new account or different account)
**Fix**: `ensure-infra.sh` creates them automatically. Ensure it runs before deploy jobs.
**Prevention**: CI `setup-infra` job always runs before any deploy.

### IAM AccessDeniedException on ECR
**Category**: Infra / CI
**Symptom**: `AccessDeniedException: User is not authorized to perform: ecr:CreateRepository`
**Cause**: IAM user `lyx-ci-deploy` missing required permissions
**Fix**: Attach `scripts/iam-policy.json` policy to the user (inline or managed)
**Prevention**: Use the comprehensive policy that covers ECR, App Runner, IAM, S3, STS.

### Invalid JSON Control Character in Secrets
**Category**: Deploy / CI
**Symptom**: `Invalid control character at: line 1 column N` when creating App Runner service
**Cause**: GitHub secrets (especially MONGO_URI) contain trailing newlines
**Fix**: Use `jq -nc --arg` to build JSON instead of string interpolation:
```bash
ENV_VARS=$(jq -nc --arg mongo "$MONGO_URI" '{ MONGO_URI: $mongo }')
```
**Prevention**: Always construct JSON with `jq` when including secrets.

---

## Runtime Errors

### Same MFE Shows Same Version in All Slots
**Category**: Runtime
**Symptom**: Multiple slots assigned different versions of the same MFE all render the first loaded version
**Cause**: Module Federation caches remotes by name — if all slots use the same MFE name, first cache wins
**Fix**: Generate unique remote names per version: `pick-a-cat_v0_0_2`
**Prevention**: `MFESlot.tsx` appends version to remote name automatically.

### MFE Version Stuck After Admin Update
**Category**: Runtime
**Symptom**: Admin shows v3 but app renders v2 after publishing
**Cause**: `app-config.ts` trusted client-sent `remoteEntryUrl` instead of resolving from `MFEVersion`
**Fix**: Always resolve `remoteEntryUrl` from the `MFEVersion` database record when `mfeVersionId` is provided
**Prevention**: Never trust client-provided URLs for version resolution.

### Unexpected Token '<' on Login
**Category**: Auth / Runtime
**Symptom**: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Cause**: API requests hitting the static file server, returning `index.html` instead of JSON
**Fix**: `serve.cjs` proxies `/api/*` requests to the Admin API URL at runtime
**Prevention**: Always ensure API proxy is configured in production.

---

## CI Errors

### CI Build Takes 15+ Minutes
**Category**: CI
**Symptom**: `pnpm build` runs for 15+ minutes
**Cause**: Building all 16 projects including example MFE apps with Module Federation DTS plugin
**Fix**: Build only 8 framework packages explicitly:
```bash
pnpm nx run-many -t build --projects='@lyx/types,@lyx/sdk,...,@lyx/admin-ui'
```
**Prevention**: CI always specifies explicit project list.

### CI Deploy Jobs Skipped
**Category**: CI
**Symptom**: All deploy jobs show "skipped" even though deploy is needed
**Cause**: Changes in `scripts/` or `.github/` don't match the path detection patterns
**Fix**: Added `.github/`, `scripts/`, `Dockerfile` to the "deploy all" triggers. Added AWS service count check.
**Prevention**: `detect-changes` checks both file diffs AND whether services exist.

---

## Infrastructure Errors

### App Runner Service Not Updating
**Category**: Infra
**Symptom**: `update-service` succeeds but old version still serves
**Cause**: App Runner may not trigger a new deployment after image update
**Fix**: Force deployment: `aws apprunner start-deployment --service-arn <arn>`
**Prevention**: CI could add a `start-deployment` step after `update-service`.

### AWS Credentials Expired (ExpiredToken)
**Category**: Infra / Local
**Symptom**: `An error occurred (ExpiredToken) when calling the GetCallerIdentity operation: The security token included in the request is expired`
**Cause**: Local AWS SSO session token has expired. SSO tokens last 1–12 hours depending on configuration.
**Fix**: Run `lyx aws login` to enter new credentials. They are saved to `~/.lyx-aws` and auto-loaded by all Lyx scripts. Check with `lyx aws status`.
**Prevention**: For local development, prefer IAM user access keys (permanent) over SSO session tokens (temporary). All Lyx scripts auto-load `~/.lyx-aws` — always check credential validity with `lyx aws status` before running AWS commands.

### MFE Bundles Not Loading from S3 (Failed to fetch dynamically imported module)
**Category**: Infra / Runtime
**Symptom**: `Failed to fetch dynamically imported module: https://...awsapprunner.com/storage/mfe-name/0.0.1/remoteEntry.js`
**Cause**: SSR server was fetching MFE bundles from S3 via public URLs (`https://bucket.s3.region.amazonaws.com/key`), but S3 blocks public access by default. The `fetch()` call returned 403/404.
**Fix**: SSR server now uses `@aws-sdk/client-s3` with `GetObjectCommand`, which authenticates using the App Runner instance role (`lyx-apprunner-instance` with `AmazonS3FullAccess`). No public bucket needed.
**Prevention**: Never use unauthenticated `fetch()` for S3 in production. Always use the AWS SDK with instance role credentials. The SSR service must be deployed with `NEEDS_INSTANCE_ROLE=true`.

### Frozen Lockfile Failure After Directory Rename
**Category**: Build / CI
**Symptom**: `ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date`
**Cause**: Renaming workspace directories (e.g., MFE folders) invalidates the lockfile paths. CI uses `--frozen-lockfile` by default.
**Fix**: Run `pnpm install --no-frozen-lockfile` locally, commit the updated `pnpm-lock.yaml`, and push.
**Prevention**: Always run `pnpm install` after any directory rename and commit the lockfile.

---

### Contract Validation Blocks Deploy

**Category**: Deploy
**Symptom**: `lyx deploy` exits with `✗ Contract validation failed: N error(s)` and refuses to upload.
**Cause**: One or more MFEs have incompatible event or shared state contracts. Common causes:
- Producer emits an event with a schema missing fields that a consumer expects
- Two MFEs declare the same shared state key with incompatible schemas
- An MFE consumes an event that no other MFE emits (warning, but does not block)
**Fix**: Run `lyx test` to see the full report. Fix schema mismatches in the relevant `mfe.config.json` files. If the incompatibility is intentional, deploy with `lyx deploy --force`.
**Prevention**: Add contracts to `mfe.config.json` early. Run `lyx test` during development. Review contract changes in PRs.

---

### ORPHANED_CONSUMER Warning

**Category**: Deploy
**Symptom**: `lyx test` reports `⚠ [ORPHANED_CONSUMER] "my-mfe" consumes event "some:event" but no MFE emits it`
**Cause**: An MFE declares a consumed event in its contracts, but no MFE in the workspace emits that event.
**Fix**: Either add the event to a producer's `emits` contracts, or remove it from the consumer's `consumes`. This is a warning and does not block deploy.
**Prevention**: Keep contracts in sync when adding or removing events.

---

## Adding New Errors

When documenting a new error, use this template:

```markdown
### [Descriptive Title]
**Category**: Build | Deploy | CI | Runtime | Auth | Infra
**Symptom**: What the user sees (error message, behavior)
**Cause**: Root cause analysis
**Fix**: Step-by-step solution with code if applicable
**Prevention**: How to avoid this in the future
```
