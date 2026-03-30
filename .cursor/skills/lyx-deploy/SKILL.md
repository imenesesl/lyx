---
name: lyx-deploy
description: >-
  Deploy Lyx platform to AWS or manage local development environment.
  Use when the user wants to deploy to production, set up CI/CD, manage
  AWS infrastructure, or troubleshoot deployment issues.
---

# Lyx Deployment

## Local Development

```bash
bash scripts/platform.sh up      # start everything
bash scripts/platform.sh down    # stop everything
bash scripts/platform.sh logs    # view logs
```

Services: Admin API (4000), Admin UI (4001), SSR (4002), MongoDB (27017), MinIO (9000/9001), Nginx (80).

## First AWS Deploy (Manual)

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export MONGO_URI="mongodb+srv://..."
bash scripts/deploy-aws.sh deploy
```

Creates: 3 ECR repos, 2 IAM roles, 1 S3 bucket, 3 App Runner services.

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
2. **ECR repo not found**: `ensure-infra.sh` creates them automatically
3. **JSON parse error**: Secrets have trailing newlines — `jq` handles this
4. **App Runner stuck**: `aws apprunner start-deployment --service-arn <arn>`
