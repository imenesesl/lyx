---
name: lyx-infra-expert
description: >-
  Expert on Lyx infrastructure: Docker, Nginx, AWS App Runner, ECR, S3, IAM,
  CI/CD pipeline, deployment scripts. Use when working with Docker, AWS,
  CI configuration, or deployment issues.
---

# Lyx Infrastructure Expert

## Local Stack (Docker Compose)

`platform/docker-compose.yml` — 6 services:
- nginx (80) → reverse proxy
- admin-api (4000) → Express + MongoDB + MinIO
- admin-ui (4001) → React SPA
- ssr (4002) → Streaming SSR
- mongodb (27017) → data
- minio (9000/9001) → object storage

Start: `bash scripts/platform.sh up`

## Nginx Routing (Local)

| Path | Backend |
|------|---------|
| `/` | 302 → `/admin/` |
| `/api/` | admin-api:4000 |
| `/storage/` | minio:9000/lyx-bundles/ (with CORS, immutable cache) |
| `/_assets/` | ssr:4002 (immutable cache) |
| `/{accountId}/{slug}` | ssr:4002 (streaming, no buffering) |
| `/admin/` | admin-ui:4001 (WebSocket support) |

## AWS Architecture

3 App Runner services + S3 + ECR + IAM:
- `lyx-production-admin-api` (4000, instance role for S3)
- `lyx-production-admin-ui` (4001, no instance role)
- `lyx-production-ssr` (4002, instance role for S3)

## CI Pipeline (`ci.yml`)

1. `build-and-test` — always runs (build 8 framework packages, lint 6, test 2)
2. `detect-changes` — checks: manual trigger? < 3 services? first commit? CI/scripts changed? specific paths?
3. `setup-infra` — `ensure-infra.sh` (idempotent: ECR repos, IAM roles, S3 bucket)
4. `deploy-*` — `ensure-service.sh` (create or update App Runner)
5. `show-urls` — list all services

## Key Scripts

- `ensure-infra.sh`: Creates ECR, IAM roles (lyx-apprunner-ecr, lyx-apprunner-instance), S3. Uses `::group::` for GH Actions.
- `ensure-service.sh`: 5 args (name, image, port, env_json, needs_instance_role). Creates or updates.
- `deploy-aws.sh`: Full deploy with secrets, IAM, S3, ECR, build, push, App Runner. Modes: deploy, update, status.

## Critical Rules

1. **JSON construction**: Always use `jq -nc --arg` for secrets in env vars — never string interpolation
2. **Concurrency**: One workflow per branch at a time
3. **IAM policy**: `scripts/iam-policy.json` covers ECR, App Runner, IAM roles, S3, STS
4. **Bucket naming**: `lyx-bundles-{accountId}-production`
5. **Service naming**: `lyx-production-{service-name}`
