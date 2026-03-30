# Lyx Testing Expert

## When to Use

Use this skill when:
- Writing or modifying Playwright E2E tests
- Writing or modifying k6 performance tests
- Debugging test failures
- Adding test coverage for new features
- Running the test suite locally or in CI
- Understanding the test architecture

## Test Architecture Overview

### Playwright E2E Tests

**Location**: `tests/e2e/`

**Configuration**: `playwright.config.ts` at project root

**Projects**:
- `setup` — Global auth setup (registers/logs in test user)
- `admin-chromium` — Admin UI tests (authenticated, Desktop Chrome)
- `shell-chromium` — Shell/SSR tests (no auth needed, Desktop Chrome)
- `admin-mobile` — Responsive tests (iPhone 14 viewport)

**Fixtures** (`tests/e2e/fixtures/test-fixtures.ts`):
- `adminPage` — Pre-authenticated browser page
- `apiContext` — Authenticated APIRequestContext for direct API calls
- `testApp` — Auto-creates a test app, deletes after test
- `testMfe` — Auto-creates a test MFE, deletes after test

**Page Objects** (`tests/e2e/pages/`):
- `LoginPage` — Login form interactions
- `AppListPage` — App list and create modal
- `SettingsPage` — Settings form interactions

### k6 Performance Tests

**Location**: `tests/k6/`

**Scenarios**:
- `api-load.js` — API endpoint stress test (50 VUs, p95 < 500ms)
- `ssr-load.js` — SSR page render performance (20 VUs, p95 < 2s)
- `concurrent-users.js` — Multi-scenario user simulation

**Runner**: `tests/k6/run-k6.sh <scenario|all>`

## Step-by-Step: Adding Tests for a New Feature

### 1. Identify Test Scope

Determine which areas are affected:
- Admin UI page/component → `tests/e2e/admin/`
- Shell/SSR behavior → `tests/e2e/shell/`
- API endpoint → both Admin tests (via `apiContext`) and k6

### 2. Write E2E Tests

```typescript
import { test, expect } from "../fixtures/test-fixtures";

test.describe("My Feature", () => {
  test("happy path works", async ({ adminPage }) => {
    await adminPage.goto("/my-feature");
    await expect(adminPage.getByRole("heading")).toContainText("My Feature");
  });

  test("error case shows message", async ({ adminPage }) => {
    // Use page.route() to mock API errors
    await adminPage.route("**/api/my-endpoint", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "fail" }) })
    );
    await adminPage.goto("/my-feature");
    await expect(adminPage.locator(".error-text")).toBeVisible();
  });

  test("creates resource via API", async ({ apiContext }) => {
    const res = await apiContext.post("/my-endpoint", {
      data: { name: "test" },
    });
    expect(res.ok()).toBe(true);
  });
});
```

### 3. Create Page Objects (if needed)

```typescript
import type { Page, Locator } from "@playwright/test";

export class MyFeaturePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "My Feature" });
    this.submitButton = page.getByRole("button", { name: "Submit" });
  }

  async goto() {
    await this.page.goto("/my-feature");
  }
}
```

### 4. Run Tests

```bash
# Specific file
npx playwright test tests/e2e/admin/my-feature.spec.ts

# Specific project
pnpm test:e2e:admin

# All E2E
pnpm test:e2e

# Debug mode (headed browser)
npx playwright test --headed --debug tests/e2e/admin/my-feature.spec.ts

# View report
pnpm test:e2e:report
```

## Test Coverage Checklist

For every feature, ensure these scenarios are covered:

- [ ] **Happy path** — Feature works as expected
- [ ] **Invalid input** — Form validation, bad data
- [ ] **Empty state** — No data exists yet
- [ ] **Error state** — API returns error, network failure
- [ ] **Loading state** — Skeletons visible during load
- [ ] **Auth boundary** — Unauthenticated users can't access
- [ ] **Concurrent operations** — Multiple users/actions
- [ ] **Edge cases** — Boundary values, special characters

## Debugging Test Failures

1. **Run in headed mode**: `npx playwright test --headed`
2. **Use trace viewer**: `npx playwright show-trace test-results/*/trace.zip`
3. **Check screenshots**: `test-results/*/test-failed-*.png`
4. **Use Playwright Inspector**: `npx playwright test --debug`
5. **Check CI artifacts**: Download `playwright-report` from GitHub Actions

## k6 Performance Testing

### Running Locally

```bash
# Install k6 (macOS)
brew install k6

# Run specific scenario
pnpm test:k6:api

# Custom env vars
BASE_URL=https://prod.example.com k6 run tests/k6/scenarios/api-load.js
```

### Interpreting Results

Key metrics to watch:
- `http_req_duration` — Request latency (p50, p95, p99)
- `http_req_failed` — Error rate
- `iterations` — Completed test iterations
- Custom metrics: `health_latency`, `layout_latency`, `ssr_render_time`

### Adding k6 Tests

```javascript
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const myMetric = new Trend("my_endpoint_latency", true);

export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "5s", target: 0 },
  ],
  thresholds: {
    my_endpoint_latency: ["p(95)<500"],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/my-endpoint`);
  myMetric.add(res.timings.duration);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
```

## Common Pitfalls

1. **Don't use CSS selectors** — Use `getByRole`, `getByLabel`, `getByText`
2. **Don't use `page.waitForTimeout`** — Use `expect(...).toBeVisible()` or `waitForResponse`
3. **Don't share state between tests** — Each test must be independent
4. **Don't test third-party services** — Mock external dependencies
5. **Don't ignore flaky tests** — Fix them or document why they're flaky
6. **Don't skip cleanup** — Use fixtures with automatic teardown

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_URL` | `http://localhost:4001` | Admin UI base URL |
| `SHELL_URL` | `http://localhost:4002` | Shell/SSR base URL |
| `CI` | — | Set in CI, enables retries and strict mode |
