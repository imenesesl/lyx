---
name: lyx-cli-expert
description: >-
  Expert on the Lyx CLI commands: init, create, dev, build, deploy, login, view, aws.
  Use when modifying CLI commands, adding new commands, debugging CLI issues, or
  understanding the MFE publish flow.
---

# Lyx CLI Expert

## Command Architecture

Entry: `packages/cli/src/index.ts` — Commander program `lyx`.
Commands: `packages/cli/src/commands/*.ts`
Build: esbuild → `dist/index.js`, bin: `./bin/lyx.mjs`

## Command Details

### `init <project-name>`
- Creates `apps/<name>/` with `package.json`, `lyx.config.json`, `layouts/`, `mfes/`, `tsconfig.json`
- Updates `pnpm-workspace.yaml` if workspace exists and glob not already covered
- Default layout: `main` (header + sidebar + main + footer)

### `create <name> --slot <slot>`
- Must run from project root (relative to `mfes/`)
- Creates: `mfe.config.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, `src/index.tsx`, `index.html`
- No slot validation — accepts any string

### `deploy`
- Reads `~/.lyxrc` for server/token/accountId
- `GET /api/auth/me` — session check
- `GET /api/mfes` — find or create MFE by name
- Auto-version: `getNextVersion(localVersion, serverVersions)` — patch bump from max server version
- Writes new version to `mfe.config.json`
- Builds with Vite, tars `dist/`, uploads multipart

### `login`
- `POST /api/auth/login` → saves `{ server, token, email, accountId }` to `~/.lyxrc`
- `accountId` = `account.alias || account.id` from response

### `view`
- Requires `accountId` in `~/.lyxrc`
- Generates temporary `vite.preview.config.ts` in `packages/shell/`
- Cleaned up on exit/signals

### `aws`

Subcommand group for AWS credential management:

- `lyx aws login` — prompts for ACCESS_KEY_ID, SECRET_ACCESS_KEY, optional SESSION_TOKEN. Validates with STS. Saves to `~/.lyx-aws`.
- `lyx aws status` — checks if `~/.lyx-aws` credentials are valid. Shows account and identity.
- `lyx aws logout` — removes `~/.lyx-aws` content.

Uses `execSync("aws sts get-caller-identity")` for validation. Auto-loads existing credentials before prompting.

## Key Edge Cases

- `deploy` without `--all` prompts interactively — not scriptable without `--all`
- `findViteBin()` walks up parents — may find wrong vite in nested node_modules
- Token from env `LYX_TOKEN` works but `accountId` must come from `~/.lyxrc`
- `publish` vs `deploy`: publish = single MFE, deploy = multi with version bump
- `aws login` requires `aws` CLI to be installed — used for STS validation
- `lyx deploy` does NOT need AWS credentials — it talks to Admin API via `~/.lyxrc` token
- AWS credentials only needed for infrastructure commands (`deploy-aws.sh`, `ensure-infra.sh`)
