---
name: lyx-admin-api-expert
description: >-
  Expert on the Lyx Admin API: Express routes, MongoDB models, auth, storage,
  draft/publish lifecycle, runtime API. Use when modifying API routes, models,
  or debugging server-side issues.
---

# Lyx Admin API Expert

## Route Map

- `/api/health` — public, checks process + MongoDB + storage
- `/api/auth/*` — rate-limited (30/15min), JWT for /me and /alias
- `/api/apps/*` — JWT required, scoped to `req.auth.accountId`
- `/api/mfes/*` — JWT required, scoped to account
- `/api/layouts/*` — GET public, write operations JWT
- `/api/runtime/:accountId/:slug/*` — public, reads published configs

## Draft/Publish Lifecycle

1. `POST /api/apps` → creates App + draft AppConfig (version `"0.0.0"`, status `"draft"`)
2. `PUT /api/apps/:id/config` → updates latest draft (assignments, layout)
3. `POST /api/apps/:id/publish` → sets draft to `"published"`, bumps version, creates new draft clone
4. Published configs are immutable snapshots

## Critical Rules

1. **remoteEntryUrl**: ALWAYS resolve from MFEVersion record. Never trust client-sent URL.
2. **accountId filtering**: Every query must include `accountId` from JWT — never expose other accounts' data.
3. **resolveAccountId**: Accepts ObjectId string OR alias → returns real `_id`. Used in all runtime routes.
4. **MFE name uniqueness**: Global (not per-account) — two accounts cannot have same MFE name.
5. **Version uniqueness**: `{ mfeId, version }` compound unique — rejects duplicate versions.

## Storage

- Detection: `MINIO_ENDPOINT === "s3"` → AWS S3; else → MinIO client
- Upload: extracts tar.gz → stores each file under `{mfeName}/{version}/` with correct MIME
- Public bucket policy: `s3:GetObject` for `*`
- URL pattern: `/storage/{mfeName}/{version}/remoteEntry.js`

## Security

- JWT expires in 7 days (`signToken`)
- Production exits if `JWT_SECRET` is weak default
- Production exits if MinIO credentials are defaults
- Helmet + CORS configured
