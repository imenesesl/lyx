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

### SSR Dockerfile fails to resolve @lyx/sdk

**Category**: CI / Docker
**Symptom**: `Rollup failed to resolve import "@lyx/sdk" from "MFESlot.tsx"` during `pnpm build:all` in the SSR Dockerfile.
**Cause**: The SSR Dockerfile did not include `@lyx/sdk` in the build stage (missing package.json copy, source copy, and build step). When `@lyx/shell` gained a dependency on `@lyx/sdk` for observability, the Docker build broke.
**Fix**: Update `platform/ssr/Dockerfile` to: (1) COPY `packages/sdk/package.json`, (2) COPY `packages/sdk/src` and `tsconfig.json`, (3) add `RUN cd packages/sdk && pnpm build` before the shell build. Also ensure `RUN cd packages/types && pnpm build` runs before the SDK build since the SDK depends on types.
**Prevention**: When adding a new workspace dependency to the Shell, always update the SSR Dockerfile to include the new package in the multi-stage build. The build order must respect the dependency chain: types -> sdk -> vite-plugin -> shell.

---

### MFE Health Dashboard Shows No Data

**Category**: Runtime
**Symptom**: The Health page in Admin UI shows "No metrics yet" even though MFEs are being used.
**Cause**: Metrics are only collected on the client side (browser). Possible reasons: (1) the MFE Shell is not deployed with the latest SDK containing the observability module, (2) the `/api/metrics` endpoint is unreachable from the browser, or (3) the metrics haven't flushed yet (default: every 30 seconds).
**Fix**: Ensure the Shell and SDK are rebuilt and deployed with the observability changes. Check browser DevTools Network tab for `POST /api/metrics` requests. If the endpoint returns errors, check Admin API logs.
**Prevention**: Always rebuild and redeploy the Shell/SSR after SDK updates.

---

### ORPHANED_CONSUMER Warning

**Category**: Deploy
**Symptom**: `lyx test` reports `⚠ [ORPHANED_CONSUMER] "my-mfe" consumes event "some:event" but no MFE emits it`
**Cause**: An MFE declares a consumed event in its contracts, but no MFE in the workspace emits that event.
**Fix**: Either add the event to a producer's `emits` contracts, or remove it from the consumer's `consumes`. This is a warning and does not block deploy.
**Prevention**: Keep contracts in sync when adding or removing events.

---

### Shell Stuck in Infinite Loading — `$m is not defined`

**Category**: Build / Runtime
**Symptom**: After deploying the Shell/SSR, MFEs never load. The page shows skeleton placeholders forever. Browser console shows `Uncaught ReferenceError: $m is not defined` in the main bundle.
**Cause**: `@module-federation/vite` configures `react` and `react-dom` as `shared` modules in the host (Shell). During the Vite/Rollup production build, `react-dom`'s CommonJS code (`react-dom.production.js`) gets inlined into the main bundle. This code contains `require('react')`, which Module Federation intercepts and transforms into an async shared-module reference. After minification, the reference becomes `$m` (or similar), but the variable is never defined in the module scope because the async resolution fails at bundle time. This crashes the entire client-side JavaScript bundle, preventing React from initializing.
**Fix**: Remove `react` and `react-dom` from the host's Module Federation `shared` build config in `packages/vite-plugin/src/host-plugin.ts`:
```typescript
shared: {},
```
Instead, register React as a shared module at **runtime** in `MFESlot.tsx` when calling `mf.init()`:
```typescript
mf.init({
  name: "lyx_shell",
  remotes: [],
  shared: {
    react: {
      version: React.version,
      scope: "default",
      lib: () => React,
      shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
    },
    "react-dom": {
      version: (ReactDOM as any).version ?? React.version,
      scope: "default",
      lib: () => ReactDOM,
      shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
    },
  },
});
```
This approach lets Vite bundle React normally (no CJS interception issues) while still exposing it to MFEs through the Module Federation runtime.
**Prevention**: Never configure `react` or `react-dom` in the host's build-time `shared` config when using `@module-federation/vite`. Always use runtime registration via `init()` with `lib` callbacks instead. The remote (MFE) plugins can still declare `shared` because they use a different code path.

---

### Multiple React Instances — `Cannot read properties of null (reading 'useState')`

**Category**: Build / Runtime
**Symptom**: MFEs crash with `TypeError: Cannot read properties of null (reading 'useState')` and React error #418 (hydration mismatch). The browser console also shows `[lyx] MFE crashed: TypeError: Cannot read properties of null (reading 'useState')`.
**Cause**: If `shared: {}` is set in the host WITHOUT runtime shared registration, MFEs bundle their own copy of React. When an MFE component calls `useState`, it uses its own React instance, which has no active fiber tree (the host's `hydrateRoot`/`createRoot` was called with the host's React). React hooks require the calling React instance to be the same one that rendered the component tree.
**Fix**: This error is the consequence of removing `shared` from the build config without replacing it with runtime registration. The complete fix requires BOTH steps:
1. Remove `shared` from host build config (fixes `$m`)
2. Add runtime `shared` registration in `MFESlot.tsx` `init()` call (fixes multiple instances)
See the fix above for `$m is not defined` — it includes both steps.
**Prevention**: These two errors are linked. Never apply one fix without the other. If `shared` is removed from the build config, runtime registration MUST be added. Test locally with the SSR server + real MFEs before pushing.

---

### SSR Hydration Mismatch — React Error #418

**Category**: Runtime
**Symptom**: Console shows `[lyx] Hydration recovery: Error: Minified React error #418`. The page briefly flashes before client rendering takes over.
**Cause**: The SSR-rendered HTML doesn't exactly match the client's initial render. Common causes in Lyx: (1) `<style>` tags from `SlotSkeleton` rendered differently, (2) devtools/observability components are client-only, (3) timing differences in layout rendering.
**Fix**: `entry-client.tsx` uses `hydrateRoot` with an `onRecoverableError` callback that logs the error as a warning. If hydration throws, it falls back to `createRoot` (full client render). This is non-fatal — the app recovers automatically.
**Prevention**: This is a known trade-off of SSR with dynamic MFE loading. The skeletons are intentionally server-rendered for perceived performance. The hydration mismatch is expected and handled gracefully. Do not treat this warning as a bug unless it causes visible UI issues.

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

---

### Admin API fails to start — "MONGO_URI is not set"
**Category**: Infra
**Symptom**: Admin API exits immediately with `[FATAL] MONGO_URI is not set. Provide a MongoDB Atlas connection string.`
**Cause**: Lyx uses a **single resource model** — there is no local MongoDB. The `MONGO_URI` env var must point to a MongoDB Atlas instance.
**Fix**:
1. Get a connection string from [cloud.mongodb.com](https://cloud.mongodb.com)
2. Set it in `platform/.env`: `MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/lyx`
**Prevention**: Always configure `platform/.env` before running `bash scripts/platform.sh up`

### Storage operations fail — no S3 credentials
**Category**: Infra
**Symptom**: `AccessDenied` or `CredentialsProviderError` when uploading/reading MFE bundles
**Cause**: Lyx uses AWS S3 for all MFE bundle storage (local and production). AWS credentials must be available.
**Fix**:
1. Run `lyx aws login` to set up credentials in `~/.lyx-aws`
2. The Docker Compose services load these from `platform/.env`
3. For local development, ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are in `platform/.env`
**Prevention**: Run `lyx aws status` before starting the platform
