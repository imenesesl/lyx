# Lyx

A framework for building web applications with micro frontends. You write components, Lyx handles the rest.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) or `nvm use` (`.nvmrc` included) |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| AWS CLI | Latest | [aws.amazon.com/cli](https://aws.amazon.com/cli/) (only for production) |

Verify:

```bash
node --version     # v22.x.x+
pnpm --version     # 9.x.x+
docker --version   # any recent
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

### 3. Start the local platform

```bash
bash scripts/platform.sh up
```

| Service | URL |
|---------|-----|
| Admin UI | http://localhost/admin/ |
| Your apps | http://localhost/{accountId}/{slug}/ |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin) |

### 4. Create your account

Open http://localhost/admin/ → click **Register** → enter name, email, password.

### 5. Log in from the CLI

```bash
lyx login
```

For production:

```bash
lyx login -s https://YOUR-API-URL.awsapprunner.com
```

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

The CLI auto-detects MFEs, calculates versions, builds, and uploads.

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

- Local: `http://localhost/{accountId}/{slug}/`
- Production: `https://SSR-URL.awsapprunner.com/{accountId}/{slug}/`

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

### Option A — Fully local (recommended)

```bash
bash scripts/platform.sh up
lyx login
cd apps/my-project && lyx deploy
```

Everything runs locally: MongoDB, MinIO, all services.

### Option B — Local code, deploy to production

```bash
lyx login -s https://YOUR-API-URL.awsapprunner.com
cd apps/my-project && lyx deploy
```

Code compiles locally, bundles upload to production.

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
   - Create a FREE M0 cluster
   - Create a database user (save username/password)
   - Network Access → Add IP → Allow from Anywhere (`0.0.0.0/0`)
   - Database → Connect → Drivers → copy the connection string

### First deploy

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
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
   Users ─────────────│   App Runner      │──── Express + MongoDB + S3
                      │   admin-api       │
                      └──────────────────┘
                      ┌──────────────────┐
                      │   App Runner      │──── Streaming SSR + MFE loading
                      │   ssr             │
                      └──────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       ┌────┴────┐    ┌─────┴─────┐   ┌─────┴─────┐
       │   S3    │    │  MongoDB  │   │    ECR    │
       │ Bundles │    │  Atlas    │   │  Images   │
       └─────────┘    └───────────┘   └───────────┘
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

## CLI Reference

| Command | Description |
|---------|-------------|
| `lyx init <name>` | Create a new project in `apps/` |
| `lyx create <name> --slot <slot>` | Create an MFE inside a project |
| `lyx deploy` | Build and publish changed MFEs |
| `lyx deploy --all` | Build and publish all MFEs |
| `lyx login` | Log in to local platform |
| `lyx login -s <url>` | Log in to a remote server |
| `lyx view` | Open the app in the browser |
| `lyx --help` | Show all available commands |

## Platform Commands

| Command | Description |
|---------|-------------|
| `bash scripts/platform.sh up` | Start local platform |
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
│   ├── admin-api/           ← Express API + MongoDB + S3
│   ├── admin-ui/            ← React admin dashboard
│   ├── ssr/                 ← Streaming SSR server
│   └── nginx/               ← Reverse proxy (local only)
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
│   └── skills/              ← AI agent workflows
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
   - Clone → deploy to AWS (once)
   - Share URLs with the team

2. Each Developer:
   - Clone → pnpm install → link CLI
   - lyx login -s https://API-URL
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
| `docs/errors.md` | Error knowledge base with solutions |
| `docs/roles.md` | Architect/Staff/Dev/QA review framework |
| `.cursor/rules/` | AI agent project conventions (6 rule files) |
| `.cursor/skills/` | AI agent workflows (3 skills) |

---

## Quick Reference

```bash
# SETUP (once)
git clone <repo> lyx && cd lyx
pnpm install
cd packages/cli && pnpm build && pnpm link --global && cd ../..

# LOCAL
bash scripts/platform.sh up
lyx login
lyx init my-project
cd apps/my-project
lyx create my-component --slot root
cd ../.. && pnpm install
cd apps/my-project && lyx deploy
# Admin UI: create app → assign MFE → publish
# http://localhost/{accountId}/{slug}/

# PRODUCTION
lyx login -s https://API.awsapprunner.com
cd apps/my-project && lyx deploy
# Admin UI: select version → publish
```
