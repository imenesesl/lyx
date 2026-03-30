# Lyx

A framework for building web applications with micro frontends. You write components, Lyx handles the rest.

---

## Prerequisites

1. **Node.js** version 22 or higher — [download here](https://nodejs.org/)
2. **pnpm** — open your terminal and run:

```bash
npm install -g pnpm
```

3. **Docker** — required for local development — [download here](https://www.docker.com/products/docker-desktop/)
4. **AWS CLI** — only needed if deploying to production — [download here](https://aws.amazon.com/cli/)

To verify everything is set up correctly:

```bash
node --version     # should show v22.x.x or higher
pnpm --version     # should show a version number
docker --version   # should show a version number
```

---

## Quick Start (new user)

### 1. Clone and install

```bash
git clone <repository-url> lyx
cd lyx
pnpm install
```

### 2. Install the CLI globally

```bash
cd packages/cli && pnpm build && pnpm link --global && cd ../..
```

Verify it works:

```bash
lyx --help
```

### 3. Start the local platform

```bash
bash scripts/platform.sh up
```

This starts everything (API, Admin UI, MongoDB, MinIO, SSR, Nginx). When it finishes:

| Service | URL |
|---|---|
| Admin UI | http://localhost/admin/ |
| Your apps | http://localhost/{accountId}/{slug}/ |

### 4. Create your account

Open http://localhost/admin/ and click **Register**. Enter your name, email, and password.

### 5. Log in from the CLI

```bash
lyx login
```

It will prompt for email and password. The default server is `http://localhost`.

If your platform is running in production (App Runner):

```bash
lyx login -s https://YOUR-API-URL.awsapprunner.com
```

---

## Creating and Deploying an MFE (step by step)

### Step 1 — Create your project

```bash
cd lyx
lyx init my-project
```

Creates `apps/my-project/` with the full structure and registers it in the workspace.

### Step 2 — Create the MFE

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

The only rule: export as `default`.

### Step 4 — Install dependencies

```bash
cd ../..   # go back to root
pnpm install
```

### Step 5 — Publish

```bash
cd apps/my-project
lyx deploy
```

The CLI automatically:
- Detects MFEs inside `mfes/`
- Queries the server and calculates the next version
- Builds, packages, and uploads

### Step 6 — Create the app in Admin

1. Open the Admin UI
2. **Apps** > **Create App**
3. Fill in: **Name**, **Path** (URL slug), **Description**
4. Select a layout:
   - **Empty** — a single `root` slot
   - **Classic** — header + sidebar + main + footer
   - **Full Width** — header + main + footer
   - **Dashboard** — header + 2 sidebars + main + footer
5. Click **Create App**

### Step 7 — Assign MFEs and publish

1. Go to your app > **Configuration**
2. In each slot, select your MFE and version
3. **Save Draft** > **Publish**

### Step 8 — View your app

Click **Preview** or open directly:
- Local: `http://localhost/{accountId}/{slug}/`
- Production: `https://YOUR-SSR-URL.awsapprunner.com/{accountId}/{slug}/`

---

## Local Development (connected to production)

If you already have the platform running in production and want to develop locally:

### Option A — Fully local development (recommended for getting started)

```bash
bash scripts/platform.sh up     # start the full local platform
lyx login                        # log in to localhost
cd apps/my-project
lyx deploy                       # publish MFEs locally
```

Everything lives on your machine. Local MongoDB, local MinIO, all local.

### Option B — Local development + deploy to production

Work on code locally, publish to production:

```bash
# Log in to production
lyx login -s https://YOUR-API-URL.awsapprunner.com

# Develop your MFE locally (edit src/index.tsx)

# When ready, publish directly to production
cd apps/my-project
lyx deploy
```

Your MFE is compiled on your machine and uploaded to the production server.

### Option C — Local platform pointing to the production database

If you want to see the admin UI with production data locally:

```bash
# Edit platform/.env with the production MONGO_URI
# Edit MINIO_ENDPOINT to point to the production S3
bash scripts/platform.sh up
```

---

## Publishing a New Version of an MFE

1. Make your changes in the code
2. From your project folder:

```bash
cd apps/my-project
lyx deploy
```

3. In the Admin UI, go to your app > select the new version > **Publish**

Versions are incremented automatically (0.0.1 > 0.0.2 > 0.0.3...).

To publish all MFEs in a project at once:

```bash
lyx deploy --all
```

---

## Deploying to AWS (production)

### Prerequisites

1. **AWS account** — [create one here](https://aws.amazon.com/)
2. **MongoDB Atlas** (free tier) — [https://cloud.mongodb.com](https://cloud.mongodb.com)
   - Create a FREE M0 cluster in **us-west-2**
   - Create a database user (save the username and password)
   - Go to **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
   - Go to **Database** → **Connect** → **Drivers** → copy the connection string

### First deploy (one command)

```bash
# Set your AWS credentials (SSO or environment variables)
source ~/.lyx-aws   # if you previously saved them
# or
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."   # only for SSO temporary credentials

# Set MongoDB connection string
export MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/lyx"

# Deploy everything
bash scripts/deploy-aws.sh deploy
```

The script automatically creates IAM roles, S3 bucket, ECR repositories, builds 3 Docker images, pushes to ECR, and creates 3 App Runner services.

### Update production (manual)

```bash
bash scripts/deploy-aws.sh update
```

### Check status

```bash
bash scripts/deploy-aws.sh status
```

### Destroy everything

```bash
bash scripts/destroy-aws.sh
```

### AWS Architecture

```
                        ┌──────────────────┐
                        │   App Runner      │
                        │   admin-ui        │──── Static React SPA
                        │   (auto-scale)    │
                        └──────────────────┘
                        ┌──────────────────┐
   Users ───────────────│   App Runner      │──── Express + MongoDB
                        │   admin-api       │──── + S3 storage
                        │   (auto-scale)    │
                        └──────────────────┘
                        ┌──────────────────┐
                        │   App Runner      │──── Streaming SSR
                        │   ssr             │──── (Node.js + React)
                        │   (auto-scale)    │
                        └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────┴────┐    ┌─────┴─────┐   ┌─────┴─────┐
         │  S3     │    │  MongoDB  │   │   ECR     │
         │ Bundles │    │  Atlas    │   │  Images   │
         └─────────┘    └───────────┘   └───────────┘
```

---

## CI/CD — Automatic Deployment from GitHub

Every push to `main` automatically runs tests and deploys **only the services that changed**. No manual deploys needed.

### Step 1 — Create an IAM User for CI

GitHub needs permanent AWS credentials (not SSO, which expires every hour).

1. Go to the [AWS IAM Console](https://console.aws.amazon.com/iam)
2. In the left menu, click **Users**
3. Click **Create user**
4. User name: `lyx-ci-deploy`
5. **Do NOT** check "Provide user access to the AWS Management Console"
6. Click **Next**
7. Select **Attach policies directly**
8. Search and check these 3 policies:
   - `AmazonEC2ContainerRegistryPowerUser`
   - `AWSAppRunnerFullAccess`
   - `IAMReadOnlyAccess`
9. Click **Next** → **Create user**
10. Click on the user `lyx-ci-deploy` you just created
11. Go to the **Security credentials** tab
12. Scroll down to **Access keys** → click **Create access key**
13. Select **Command Line Interface (CLI)**
14. Check the confirmation checkbox at the bottom
15. Click **Next** → **Create access key**
16. **Copy both values** — you will need them in the next step:
    - **Access key ID** (starts with `AKIA...`)
    - **Secret access key** (click "Show" to reveal)

### Step 2 — Add secrets to GitHub

Go to your repository on GitHub → **Settings** → **Secrets and variables** → **Actions**.

#### Secrets (click "New repository secret" for each)

| Name | Value | Where to find it |
|------|-------|-------------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | From Step 1 (IAM User access key) |
| `AWS_SECRET_ACCESS_KEY` | The secret key | From Step 1 (IAM User secret key) |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/lyx?retryWrites=true&w=majority` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Any random string (e.g. `openssl rand -base64 32`) | You choose this — used to sign auth tokens |
| `S3_BUCKET` | `lyx-bundles-ACCOUNT_ID-production` | Created by `deploy-aws.sh` — check with `aws s3 ls` |

#### Variables (click the "Variables" tab → "New repository variable")

| Name | Value |
|------|-------|
| `AWS_REGION` | `us-west-2` |

### Step 3 — Push to main

That's it. Every push to `main` will:

1. **Build** — compile all framework packages
2. **Lint** — type-check all packages
3. **Test** — run admin-api and shell tests
4. **Detect changes** — compare files with the previous commit
5. **Deploy only what changed** — in parallel:

| Files changed | Service deployed |
|---------------|-----------------|
| `platform/admin-api/*` | admin-api only |
| `platform/admin-ui/*` | admin-ui only |
| `platform/ssr/*` or `packages/shell/*` | SSR only |
| Multiple folders | Only the affected services (in parallel) |
| `packages/sdk/*`, `packages/cli/*`, etc. | No deploy (only build + test) |

### How to trigger a full deploy

If you need to redeploy everything (e.g. after changing secrets):

```bash
# Make an empty commit
git commit --allow-empty -m "redeploy all"
git push
```

This won't trigger any service deploy (no files changed). To force all 3, touch one file in each:

```bash
touch platform/admin-api/Dockerfile platform/admin-ui/serve.cjs platform/ssr/server.js
git add -A && git commit -m "trigger full deploy" && git push
```

---

## CLI Commands

| What you want to do | Command |
|---|---|
| Create a new project | `lyx init name` |
| Create a new MFE | `lyx create name --slot header` |
| Log in to the platform | `lyx login` |
| Log in to production | `lyx login -s https://api-url.awsapprunner.com` |
| Publish MFEs | `lyx deploy` |
| Publish all | `lyx deploy --all` |
| Local dev (playground) | `pnpm dev:playground` |
| Show help | `lyx --help` |

---

## Platform Commands

| What you want to do | Command |
|---|---|
| Start local | `bash scripts/platform.sh up` |
| Stop local | `bash scripts/platform.sh down` |
| View logs | `bash scripts/platform.sh logs` |
| Deploy to AWS | `bash scripts/deploy-aws.sh deploy` |
| Update AWS | `bash scripts/deploy-aws.sh update` |
| AWS status | `bash scripts/deploy-aws.sh status` |
| Destroy AWS | `bash scripts/destroy-aws.sh` |

---

## Core Concepts

### Slots

Each layout has **slots** — spaces where components are placed:

| Slot | Where it appears |
|---|---|
| `root` | Full page (Empty layout) |
| `header` | Top of the page |
| `sidebar` | Left side |
| `main` | Main content area in the center |
| `footer` | Bottom of the page |

### Inter-component Communication

#### 1. Events — for notifying that something happened

```tsx
import { emit, useEvent } from "@lyx/sdk";

// Send an event
<button onClick={() => emit("cart:add", { product: "Shoes" })}>
  Add to Cart
</button>

// Listen for an event (in another component)
useEvent("cart:add", (data) => {
  console.log("Added:", data.product);
});
```

#### 2. Shared State — for data that all components need to see

```tsx
import { useSharedState } from "@lyx/sdk";

const [user, setUser] = useSharedState("user", {
  name: "",
  loggedIn: false,
});
```

When one component changes the user, all others see the update instantly.

#### 3. Navigation

```tsx
import { navigate } from "@lyx/sdk";

<button onClick={() => navigate("dashboard")}>
  Go to Dashboard
</button>
```

### Loading a Component Dynamically

```tsx
import { MFELoader } from "@lyx/sdk";
import { useState } from "react";

function MyPage() {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(true)}>Load Form</button>
      {show && <MFELoader name="contact-form" />}
    </div>
  );
}

export default MyPage;
```

---

## Project Structure

```
apps/
└── my-project/
    ├── mfes/                        ← your MFEs go here
    │   ├── my-header/
    │   │   ├── mfe.config.json      ← name, slot, and version
    │   │   └── src/
    │   │       └── index.tsx        ← your component (export default)
    │   └── my-sidebar/
    │       ├── mfe.config.json
    │       └── src/
    │           └── index.tsx
    ├── layouts/
    │   └── main.json                ← local layout (for dev)
    ├── lyx.config.json              ← general configuration
    └── package.json
```

---

## Framework Structure

```
lyx/
├── apps/               →  Your projects (lyx init creates them here)
├── packages/
│   ├── types/          →  Shared types
│   ├── vite-plugin/    →  Plugin for automatic Module Federation
│   ├── registry/       →  Local MFE server (development)
│   ├── sdk/            →  Events, state, navigation, dynamic loading
│   ├── shell/          →  Host app (layouts + MFEs)
│   └── cli/            →  Commands: init, create, dev, deploy, login
├── platform/           →  Admin platform (Docker)
│   ├── admin-api/      →  Express API + MongoDB + S3/MinIO
│   ├── admin-ui/       →  React dashboard
│   ├── ssr/            →  Streaming SSR server
│   └── nginx/          →  Reverse proxy (local only)
├── infra/              →  AWS infrastructure (App Runner + S3)
├── scripts/
│   ├── platform.sh     →  Start/stop the local platform
│   ├── deploy-aws.sh   →  Deploy to AWS
│   └── destroy-aws.sh  →  Destroy AWS infrastructure
└── pnpm-workspace.yaml
```

---

## Streaming SSR

Lyx includes Server-Side Rendering with streaming for instant app loading.

### How it works

1. The user opens `/{accountId}/my-app/`
2. The SSR server fetches the layout from the Admin API
3. Generates HTML with streaming — the browser paints immediately
4. Each slot appears as an animated skeleton (shimmer)
5. React hydrates the page when JavaScript arrives
6. MFEs replace the skeletons via Module Federation

### Benefits

- **Instant time to first paint**
- **Smart skeletons** by position (header, sidebar, main)
- **Progressive loading** independent per MFE
- **SEO-ready**

---

## Multi-person Workflow

### Scenario: team of 5 people

```
1. DevOps/Lead:
   - Clone the repo
   - bash scripts/deploy-aws.sh deploy  (once)
   - Share the URLs with the team

2. Each developer:
   - Clone the repo
   - pnpm install
   - cd packages/cli && pnpm build && pnpm link --global && cd ../..
   - lyx login -s https://API-URL.awsapprunner.com
   - lyx init my-feature
   - cd apps/my-feature
   - lyx create my-component --slot main
   - (edit the code)
   - lyx deploy
   - (assign in Admin UI > Publish)

3. QA/PM:
   - Open https://SSR-URL.awsapprunner.com/{accountId}/{slug}/
   - Review the live app
```

### Team Guidelines

- Each developer works on their own project (`apps/my-feature/`)
- MFEs are independent (each person publishes their own)
- Apps are configured in the Admin UI (assign MFEs to slots)
- Automatic versioning: no version conflicts
- An MFE can be reused across multiple apps

---

## Editing an Existing App

1. Go to the app in the Admin UI
2. **Settings** tab
3. Edit the name, path, or description
4. **Save Changes**

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
# edit mfes/my-component/src/index.tsx
cd ../.. && pnpm install
cd apps/my-project && lyx deploy
# Admin UI: create app > assign MFE > publish
# http://localhost/{accountId}/{slug}/

# PRODUCTION
lyx login -s https://API.awsapprunner.com
cd apps/my-project
lyx deploy    # publish directly to prod
# Admin UI: select version > publish
```
