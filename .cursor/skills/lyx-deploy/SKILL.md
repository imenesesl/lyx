---
name: lyx-deploy
description: >-
  Deploy Lyx platform to AWS or manage local development environment.
  Use when the user wants to deploy to production, set up CI/CD, manage
  AWS infrastructure, or troubleshoot deployment issues.
---

# Lyx Deployment

## Local AWS Credentials

**CRITICAL**: Before running ANY AWS command, always ensure credentials are loaded.

### Check credentials

```bash
lyx aws status
```

### Set up credentials (first time or expired)

```bash
lyx aws login
```

This saves credentials to `~/.lyx-aws` (chmod 600). All Lyx scripts (`deploy-aws.sh`, `ensure-infra.sh`, etc.) auto-load this file.

### Credential types

| Type | Expires | Use for |
|------|---------|---------|
| IAM user access keys (`AKIA...`) | Never | Local dev, CI/CD |
| SSO session tokens (`ASIA...`) | 1–12 hours | Temporary access |

If the user gets `ExpiredToken`, run `lyx aws login` again.

### Where credentials are stored

| Location | Purpose |
|----------|---------|
| `~/.lyx-aws` | Local machine — auto-loaded by all Lyx scripts |
| GitHub Secrets | CI/CD — used by GitHub Actions workflow |
| App Runner instance role | Production — automatic, no config needed |

## Local Development

```bash
bash scripts/platform.sh up      # start everything
bash scripts/platform.sh down    # stop everything
bash scripts/platform.sh logs    # view logs
```

Services: Admin API (4000), Admin UI (4001), SSR (4002), Nginx (80).
All services use cloud resources (MongoDB Atlas + AWS S3) — no local databases or storage.

## Deploying MFEs (local code → production)

```bash
lyx login -s https://YOUR-API-URL.awsapprunner.com
cd apps/my-project
lyx deploy       # interactive: pick MFEs
lyx deploy --all # deploy everything
```

**Note**: `lyx deploy` talks to the Admin API, NOT directly to AWS. No AWS credentials needed for MFE deployment — only for platform infrastructure.

## First AWS Deploy (Manual)

```bash
lyx aws login                                          # set up credentials
export MONGO_URI="mongodb+srv://user:pass@cluster/lyx"
bash scripts/deploy-aws.sh deploy
```

Creates: 3 ECR repos, 2 IAM roles, 1 S3 bucket, 3 App Runner services.

## Manage Production

```bash
bash scripts/deploy-aws.sh update    # redeploy with latest code
bash scripts/deploy-aws.sh status    # show service URLs and status
bash scripts/destroy-aws.sh          # tear down everything
```

## CI/CD Deploy (GitHub Actions)

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user access key (starts with `AKIA`) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random string (`openssl rand -base64 32`) |

### IAM Policy

The CI user needs `scripts/iam-policy.json` attached. Covers: ECR, App Runner, IAM (for lyx-apprunner-* roles), S3, STS.

### How It Works

1. `detect-changes` — checks if infra exists + git diff
2. `setup-infra` — `ensure-infra.sh` (idempotent, creates missing resources)
3. `ensure-service.sh` — creates App Runner if new, updates if exists
4. Secrets passed via `jq` to avoid JSON parsing errors

### Trigger Full Deploy

- Manual: GitHub Actions → CI → "Run workflow"
- Or: push changes to `.github/` or `scripts/`

## Troubleshooting

1. **Permission denied**: Attach `scripts/iam-policy.json` to IAM user
2. **ExpiredToken**: Run `lyx aws login` to refresh credentials
3. **ECR repo not found**: `ensure-infra.sh` creates them automatically
4. **JSON parse error**: Secrets have trailing newlines — `jq` handles this
5. **App Runner stuck**: `aws apprunner start-deployment --service-arn <arn>`
6. **MFE bundles not loading**: SSR uses AWS SDK (not public URLs) — ensure instance role is set
7. **Lockfile out of date**: Run `pnpm install --no-frozen-lockfile`, commit, push

## Agent Rules

- **Always check credentials first** before any AWS operation: `lyx aws status`
- If credentials are expired, guide the user to run `lyx aws login`
- Never hardcode AWS credentials in code or commits
- After fixing an issue, update `docs/errors.md` with the resolution
