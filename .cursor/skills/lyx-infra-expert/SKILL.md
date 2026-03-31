---
name: lyx-infra-expert
description: >-
  Expert on Lyx infrastructure: Docker, Nginx, AWS App Runner, ECR, S3, IAM,
  CI/CD pipeline, deployment scripts. Use when working with Docker, AWS,
  CI configuration, or deployment issues.
---

# Lyx Infrastructure Expert

## Single Resource Model

Lyx uses a **single resource model**: local and production environments use the same cloud infrastructure. There are no local databases or storage services. Everything points to AWS S3 and MongoDB Atlas.

## Local AWS Credentials

**ALWAYS verify before any AWS command**:

```bash
lyx aws status
```

If expired → `lyx aws login`

### Credential flow

| File | Purpose | Auto-loaded |
|------|---------|-------------|
| `~/.lyx-aws` | Local AWS credentials | Yes, by all Lyx scripts |
| `~/.lyxrc` | CLI login (Admin API token, server URL, accountId) | Yes, by `lyx` CLI |
| GitHub Secrets | CI/CD credentials | Yes, by GitHub Actions |

### When credentials are needed

| Action | AWS creds needed? | File used |
|--------|-------------------|-----------|
| `lyx deploy` (MFE upload) | No | `~/.lyxrc` (Admin API token) |
| `bash scripts/platform.sh up` | Yes | `~/.lyx-aws` (for S3 + MongoDB) |
| `bash scripts/deploy-aws.sh` | Yes | `~/.lyx-aws` |
| `bash scripts/ensure-infra.sh` | Yes | `~/.lyx-aws` |
| `aws apprunner list-services` | Yes | `~/.lyx-aws` |
| CI deploys | Yes | GitHub Secrets |

## Local Stack (Docker Compose)

`platform/docker-compose.yml` — 4 services (all using cloud resources):
- nginx (80) → reverse proxy
- admin-api (4000) → Express + MongoDB Atlas + S3
- admin-ui (4001) → React SPA
- ssr (4002) → Streaming SSR + S3

**Requirements to start**:
1. `lyx aws login` — AWS credentials in `~/.lyx-aws`
2. `MONGO_URI` set in `platform/.env`

Start: `bash scripts/platform.sh up`

## Nginx Routing (Local)

| Path | Backend |
|------|---------|
| `/` | 302 → `/admin/` |
| `/api/` | admin-api:4000 |
| `/storage/` | ssr:4002 (fetches from S3) |
| `/_assets/` | ssr:4002 (immutable cache) |
| `/{accountId}/{slug}` | ssr:4002 (streaming, no buffering) |
| `/admin/` | admin-ui:4001 (WebSocket support) |

## AWS Architecture

3 App Runner services + S3 + ECR + IAM:
- `lyx-production-admin-api` (4000, instance role for S3)
- `lyx-production-admin-ui` (4001, no instance role)
- `lyx-production-ssr` (4002, instance role for S3)

### S3 Storage Access

- **SSR server**: Uses `@aws-sdk/client-s3` with `GetObjectCommand` — authenticates via instance role
- **Admin API**: Uses `@aws-sdk/client-s3` with `PutObjectCommand` — uploads via instance role
- **NEVER use public S3 URLs** — S3 blocks public access by default
- `ensure-infra.sh` configures bucket policy as fallback

### Admin API Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `S3_BUCKET` | Yes | S3 bucket name for MFE bundles |
| `AWS_REGION` | Yes | AWS region (default: `us-west-2`) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `PORT` | No | Server port (default: `4000`) |
| `CORS_ORIGIN` | No | CORS origin (default: `*`) |

## CI Pipeline (`ci.yml`)

1. `build-and-test` — always runs (build 8 framework packages, lint 6, test 2)
2. `detect-changes` — checks: manual trigger? < 3 services? first commit? CI/scripts changed? specific paths?
3. `setup-infra` — `ensure-infra.sh` (idempotent: ECR repos, IAM roles, S3 bucket with public access config)
4. `deploy-*` — `ensure-service.sh` (create or update App Runner)
5. `show-urls` — list all services

## Key Scripts

- `platform.sh`: Start/stop local Docker services. Auto-loads `~/.lyx-aws`. Requires `MONGO_URI` in `platform/.env`.
- `ensure-infra.sh`: Creates ECR, IAM roles (lyx-apprunner-ecr, lyx-apprunner-instance), S3. Disables Block Public Access and sets bucket policy on creation. Uses `::group::` for GH Actions.
- `ensure-service.sh`: 5 args (name, image, port, env_json, needs_instance_role). Creates or updates.
- `deploy-aws.sh`: Full deploy with secrets, IAM, S3, ECR, build, push, App Runner. Auto-loads `~/.lyx-aws`. Modes: deploy, update, status.

## Critical Rules

1. **Credentials first**: Always run `lyx aws status` before AWS commands. If expired, run `lyx aws login`.
2. **JSON construction**: Always use `jq -nc --arg` for secrets in env vars — never string interpolation
3. **Concurrency**: One workflow per branch at a time
4. **IAM policy**: `scripts/iam-policy.json` covers ECR, App Runner, IAM roles, S3, STS
5. **Bucket naming**: `lyx-bundles-{accountId}-production`
6. **Service naming**: `lyx-production-{service-name}`
7. **Instance roles**: admin-api and ssr must have `NEEDS_INSTANCE_ROLE=true` for S3 access
8. **Lockfile after renames**: Always run `pnpm install` and commit `pnpm-lock.yaml` after renaming directories
9. **Documentation**: After fixing any infra issue, update `docs/errors.md`
