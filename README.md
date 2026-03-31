# Lyx

A framework for building web applications with micro frontends. You write components, Lyx handles the rest.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) or `nvm use` (`.nvmrc` included) |
| pnpm | 9+ | `npm install -g pnpm` |
| AWS CLI | Latest | [aws.amazon.com/cli](https://aws.amazon.com/cli/) |
| Docker | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) (optional, for local platform) |

Verify:

```bash
node --version     # v22.x.x+
pnpm --version     # 9.x.x+
aws --version      # any recent
```

---

## Architecture — Single Resource Model

Lyx uses a **single resource model**: local and production environments share the same cloud infrastructure. There is no separate local database or storage layer.

| Resource | Provider | Used by |
|----------|----------|---------|
| Database | MongoDB Atlas | Admin API (local + prod) |
| MFE Bundles | AWS S3 | Admin API uploads, SSR serves |
| Container Images | AWS ECR | CI/CD deploys |
| Services | AWS App Runner | Production hosting |

**Recommended setup**: two AWS accounts — one for dev, one for prod. Switch between them with `lyx aws login`.

```
Developer Machine                       AWS Account
┌──────────────┐                 ┌────────────────────┐
│  lyx CLI     │ ────deploy────► │  S3 (bundles)      │
│  Admin API   │ ────connect───► │  MongoDB Atlas     │
│  SSR Server  │ ────read──────► │  S3 (bundles)      │
└──────────────┘                 └────────────────────┘
```

---

## Quick Start

### 1. Clone and install

```bash
git clone <repository-url> lyx
cd lyx
pnpm install
```

### 2. Install the CLI globally

```bash
cd packages/cli && pnpm build && pnpm link --global && cd ../..
lyx --help
```

### 3. Set up cloud resources

You need two things: an AWS account and a MongoDB Atlas database.

#### MongoDB Atlas (free tier)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → create account
2. Create a **FREE M0 cluster** (choose your region)
3. Create a database user (save username/password)
4. **Network Access** → Add IP → Allow from Anywhere (`0.0.0.0/0`)
5. **Database** → **Connect** → **Drivers** → copy the connection string

#### AWS credentials

```bash
lyx aws login
```

It will prompt for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optionally `AWS_SESSION_TOKEN`. Credentials are saved to `~/.lyx-aws`.

### 4. Log in to the Lyx platform

```bash
# First time — deploy the platform to AWS first (see "Deploying to AWS" below)
# Then log in with your platform URL:
lyx login -s https://YOUR-API-URL.awsapprunner.com

# Or if running locally:
lyx login
```

### 5. Create your account

Open the Admin UI → click **Register** → enter name, email, password.

---

## Creating and Deploying an MFE

### Step 1 — Create your project

```bash
lyx init my-project
```

Creates `apps/my-project/` with the full structure.

### Step 2 — Create an MFE

```bash
cd apps/my-project
lyx create my-header --slot header
```

Available slots: `root`, `header`, `sidebar`, `main`, `footer`.

### Step 3 — Edit your component

Open `mfes/my-header/src/index.tsx`:

```tsx
function MyHeader() {
  return (
    <header style={{ padding: 16, background: "#1a1a2e", color: "white" }}>
      <h1>My App</h1>
    </header>
  );
}

export default MyHeader;
```

The only rule: **export as default**.

### Step 4 — Install dependencies and publish

```bash
cd ../..            # back to monorepo root
pnpm install
cd apps/my-project
lyx deploy
```

The CLI auto-detects MFEs, calculates versions, builds, and uploads to S3.

### Step 5 — Configure in the Admin UI

1. **Apps** → **Create App** → fill name, path (URL slug), description
2. Select a layout:
   - **Empty** — single `root` slot
   - **Classic** — header + sidebar + main + footer
   - **Full Width** — header + main + footer
   - **Dashboard** — header + 2 sidebars + main + footer
3. **Configuration** tab → assign MFE + version to each slot
4. **Save Draft** → **Publish**

### Step 6 — View your app

- Production: `https://SSR-URL.awsapprunner.com/{accountId}/{slug}/`
- Local (with Docker): `http://localhost/{accountId}/{slug}/`

---

## Inter-MFE Communication

### Events (fire-and-forget)

```tsx
import { emit, useEvent } from "@lyx/sdk";

// Send
emit("cart:add", { product: "Shoes" });

// Receive (in another MFE)
useEvent("cart:add", (data) => {
  console.log("Added:", data.product);
});
```

### Shared State (reactive)

```tsx
import { useSharedState } from "@lyx/sdk";

const [user, setUser] = useSharedState("user", { name: "", loggedIn: false });
```

All MFEs sharing the same key see updates instantly.

### Navigation

```tsx
import { navigate } from "@lyx/sdk";

navigate("dashboard");             // navigate within the app
navigate("settings", "main");      // target a specific slot
```

### Dynamic MFE Loading

```tsx
import { MFELoader } from "@lyx/sdk";

<MFELoader name="contact-form" fallback={<p>Loading...</p>} />
```

---

## Local Development

### Option A — Run platform locally with Docker (pointing to cloud resources)

```bash
# 1. Set up credentials
lyx aws login                    # AWS credentials → ~/.lyx-aws
# 2. Edit platform/.env with your MONGO_URI
# 3. Start services
bash scripts/platform.sh up
# 4. Log in and deploy
lyx login
cd apps/my-project && lyx deploy
```

All services run locally in Docker, but they use **your AWS S3 bucket** for storage and **your MongoDB Atlas** for the database.

### Option B — Deploy directly to production

```bash
lyx login -s https://YOUR-API-URL.awsapprunner.com
cd apps/my-project && lyx deploy
```

Code compiles locally, bundles upload directly to production S3.

### Publishing a new version

```bash
cd apps/my-project
lyx deploy        # changed MFEs only
lyx deploy --all  # all MFEs
```

Versions auto-increment: 0.0.1 → 0.0.2 → 0.0.3...

Then in Admin UI: select the new version → **Publish**.

---

## Deploying to AWS (Production)

### Prerequisites

1. **AWS account** — [aws.amazon.com](https://aws.amazon.com/)
2. **MongoDB Atlas** (free tier) — [cloud.mongodb.com](https://cloud.mongodb.com)

### Configure AWS credentials

```bash
lyx aws login
```

### First deploy

```bash
export MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/lyx"
bash scripts/deploy-aws.sh deploy
```

Creates IAM roles, S3 bucket, ECR repos, builds Docker images, deploys 3 App Runner services.

### Manage production

```bash
bash scripts/deploy-aws.sh update    # redeploy with latest code
bash scripts/deploy-aws.sh status    # show service URLs and status
bash scripts/destroy-aws.sh          # tear down everything
```

### AWS Architecture

```
                      ┌──────────────────┐
                      │   App Runner      │
                      │   admin-ui        │──── React SPA + API proxy
                      └──────────────────┘
                      ┌──────────────────┐
   Users ─────────────│   App Runner      │──── Express + MongoDB Atlas + S3
                      │   admin-api       │
                      └──────────────────┘
                      ┌──────────────────┐
                      │   App Runner      │──── Streaming SSR + S3 bundles
                      │   ssr             │
                      └──────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
           ┌────┴────┐ ┌───┴─────┐ ┌───┴─────┐
           │   S3    │ │ MongoDB │ │   ECR   │
           │ Bundles │ │  Atlas  │ │ Images  │
           └─────────┘ └─────────┘ └─────────┘
```

---

## CI/CD — Automatic Deployment

Every push to `main` runs tests and deploys **only the services that changed**.

### Step 1 — Create an IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam) → **Users** → **Create user**
2. Name: `lyx-ci-deploy` — do NOT enable console access
3. Click **Next** → **Attach policies directly**
4. Skip AWS managed policies (we'll use a custom one)
5. **Create user** → click on `lyx-ci-deploy`
6. **Permissions** tab → **Add permissions** → **Create inline policy**
7. Click **JSON** tab → paste the contents of `scripts/iam-policy.json`
8. Name: `lyx-ci-full-access` → **Create policy**
9. **Security credentials** tab → **Create access key** → **CLI** → **Create**
10. Copy the **Access key ID** and **Secret access key**

### Step 2 — Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Value | Source |
|--------|-------|--------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | The secret key | IAM user secret key |
| `AWS_REGION` | `us-east-1` | Choose a region with App Runner |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Random string | `openssl rand -base64 32` |

### Step 3 — Push to main

The CI will:

1. **Build + Lint + Test** framework packages
2. **Check infrastructure** — if ECR repos, IAM roles, or S3 bucket are missing, create them
3. **Check services** — if < 3 App Runner services exist, deploy everything
4. **Detect changes** — compare with previous commit
5. **Deploy only what changed**:

| Files changed | Service deployed |
|---------------|-----------------|
| `platform/admin-api/*` | admin-api |
| `platform/admin-ui/*` | admin-ui |
| `platform/ssr/*` or `packages/shell/*` | ssr |
| `.github/*` or `scripts/*` | all services |
| `packages/sdk/*`, `packages/cli/*`, etc. | none (build + test only) |

### Manual deploy

Go to GitHub → **Actions** → **CI** → **Run workflow** → triggers a full deploy.

---

## Environment Setup Summary

| What | How |
|------|-----|
| AWS credentials | `lyx aws login` → saved to `~/.lyx-aws` |
| AWS credential check | `lyx aws status` |
| Lyx platform login | `lyx login -s <url>` → saved to `~/.lyxrc` |
| MongoDB Atlas | Set `MONGO_URI` in `platform/.env` or as env var |
| S3 bucket | Auto-created by `deploy-aws.sh` or `ensure-infra.sh` |
| Local platform | `bash scripts/platform.sh up` (requires `.env` + AWS creds) |

**No local databases or storage services.** Everything points to your cloud resources.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `lyx init <name>` | Create a new project in `apps/` |
| `lyx create <name> --slot <slot>` | Create an MFE inside a project |
| `lyx deploy` | Build and publish changed MFEs (validates contracts) |
| `lyx deploy --all` | Build and publish all MFEs |
| `lyx deploy --force` | Deploy without contract validation |
| `lyx test` | Validate MFE event and shared state contracts |
| `lyx test --json` | Output contract report as JSON |
| `lyx login` | Log in to local platform |
| `lyx login -s <url>` | Log in to a remote server |
| `lyx view` | Open the app in the browser |
| `lyx aws login` | Set up AWS credentials locally |
| `lyx aws status` | Check if AWS credentials are valid |
| `lyx aws logout` | Remove saved AWS credentials |
| `lyx --help` | Show all available commands |

## Platform Commands

| Command | Description |
|---------|-------------|
| `bash scripts/platform.sh up` | Start local platform (Docker + cloud resources) |
| `bash scripts/platform.sh down` | Stop local platform |
| `bash scripts/platform.sh logs` | View service logs |
| `bash scripts/deploy-aws.sh deploy` | First deploy to AWS |
| `bash scripts/deploy-aws.sh update` | Update AWS services |
| `bash scripts/deploy-aws.sh status` | Show AWS status |
| `bash scripts/destroy-aws.sh` | Destroy AWS infrastructure |

---

## Project Structure

```
lyx/
├── apps/                    ← Your projects (lyx init creates them here)
│   └── my-project/
│       ├── mfes/            ← MFEs (lyx create adds them here)
│       │   └── my-header/
│       │       ├── mfe.config.json
│       │       └── src/index.tsx    ← Your component (export default)
│       ├── layouts/main.json
│       └── lyx.config.json
├── packages/
│   ├── types/               ← Shared TypeScript interfaces
│   ├── sdk/                 ← Events, state, navigation, MFE loading
│   ├── shell/               ← Host app (layouts + MFE rendering)
│   ├── cli/                 ← lyx CLI commands
│   ├── registry/            ← Local MFE dev server
│   └── vite-plugin/         ← Auto Module Federation config
├── platform/
│   ├── admin-api/           ← Express API + MongoDB Atlas + S3
│   ├── admin-ui/            ← React admin dashboard
│   ├── ssr/                 ← Streaming SSR server
│   └── nginx/               ← Reverse proxy (local Docker only)
├── scripts/
│   ├── platform.sh          ← Local platform management
│   ├── deploy-aws.sh        ← AWS deployment
│   ├── ensure-infra.sh      ← Idempotent infra creation
│   ├── ensure-service.sh    ← App Runner create/update
│   └── iam-policy.json      ← IAM policy for CI user
├── docs/
│   ├── architecture.md      ← System design and decisions
│   ├── errors.md            ← Error knowledge base
│   └── roles.md             ← Role-based decision framework
├── .cursor/
│   ├── rules/               ← AI agent conventions
│   └── skills/              ← AI agent expert workflows
└── .github/workflows/ci.yml ← CI/CD pipeline
```

---

## Core Concepts

### Slots

| Slot | Position |
|------|----------|
| `root` | Full page (Empty layout) |
| `header` | Top |
| `sidebar` | Left side |
| `main` | Center content |
| `footer` | Bottom |

### Account URL Alias

Each account gets a default ID (MongoDB ObjectId). You can set a custom alias in **Settings** in the Admin UI. Apps are accessible at `/{alias}/{slug}/`.

### Streaming SSR

1. Browser requests `/{accountId}/my-app/`
2. SSR server fetches layout from Admin API
3. Streams HTML with animated skeleton placeholders
4. React hydrates when JavaScript arrives
5. MFEs load via Module Federation and replace skeletons

---

## Team Workflow

```
1. DevOps/Lead:
   - Deploy platform to AWS (once): bash scripts/deploy-aws.sh deploy
   - Share URLs with the team

2. Each Developer:
   - Clone → pnpm install → link CLI
   - lyx aws login (AWS creds)
   - lyx login -s https://API-URL (platform login)
   - lyx init my-feature → lyx create my-component --slot main
   - Edit code → lyx deploy
   - Admin UI: assign MFE → publish

3. QA:
   - Open https://SSR-URL/{accountId}/{slug}/
   - Review the live app
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | This file — getting started, commands, workflows |
| `docs/architecture.md` | System design, data flow, decision records |
| `docs/errors.md` | Error knowledge base with cause/fix/prevention |
| `docs/features.md` | Complete feature inventory |
| `docs/roles.md` | 6-role decision framework (PO, PM, Architect, Staff, Dev, QA) |
| `docs/backlog.md` | Product backlog with P0-P3 priorities and competitive justification |
| `docs/competitive-analysis.md` | Market analysis vs 8 direct + 4 adjacent competitors |
| `docs/workplan.md` | Sprint execution tracking with role-based review pipeline |
| `.cursor/rules/` | AI agent conventions (8 rule files) |
| `.cursor/skills/` | AI agent expert workflows (10 skills) |

---

## Quick Reference

```bash
# SETUP (once)
git clone <repo> lyx && cd lyx
pnpm install
cd packages/cli && pnpm build && pnpm link --global && cd ../..

# CREDENTIALS (once per AWS account)
lyx aws login                            # AWS credentials → ~/.lyx-aws

# FIRST DEPLOY (once)
export MONGO_URI="mongodb+srv://..."
bash scripts/deploy-aws.sh deploy

# WORK
lyx login -s https://API.awsapprunner.com
lyx init my-project
cd apps/my-project
lyx create my-component --slot root
cd ../.. && pnpm install
cd apps/my-project && lyx deploy
# Admin UI: create app → assign MFE → publish
# https://SSR-URL/{accountId}/{slug}/
```
