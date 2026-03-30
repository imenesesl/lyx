import { test, expect } from "../fixtures/test-fixtures";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("Health Dashboard", () => {
  test.describe("Dashboard Tab", () => {
    test("health page loads with tabs and time window buttons", async ({
      adminPage,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);

      await expect(adminPage.locator(".page-header h1")).toContainText("MFE Health");
      await expect(adminPage.getByText("Dashboard")).toBeVisible();
      await expect(adminPage.getByText("Logs")).toBeVisible();

      await expect(adminPage.getByRole("button", { name: "1h" })).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "24h" })).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "7d" })).toBeVisible();
    });

    test("metrics tab shows MFE stats or empty state", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);
      await adminPage.waitForTimeout(1000);

      const emptyState = adminPage.locator(".empty-state");
      const statCards = adminPage.locator(".stat-card");

      const hasData = (await statCards.count()) > 0;
      const isEmpty = await emptyState.isVisible();

      expect(hasData || isEmpty).toBe(true);

      if (hasData) {
        await expect(adminPage.getByText("Tracked MFEs")).toBeVisible();
        await expect(adminPage.getByText("Healthy")).toBeVisible();
      } else {
        await expect(adminPage.getByText("No metrics yet")).toBeVisible();
      }
    });

    test("switching time window reloads data", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);

      const responsePromise = adminPage.waitForResponse(
        (res) => res.url().includes("/metrics/health") && res.status() === 200
      );
      await adminPage.getByRole("button", { name: "24h" }).click();
      await responsePromise;
    });
  });

  test.describe("Logs Tab", () => {
    test("logs tab shows filterable log entries or empty state", async ({
      adminPage,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);

      await adminPage.getByText("Logs").click();
      await adminPage.waitForTimeout(500);

      const typeFilter = adminPage.locator(".select").filter({ hasText: "All types" });
      await expect(typeFilter).toBeVisible();

      const mfeFilter = adminPage.locator(".select").filter({ hasText: "All MFEs" });
      await expect(mfeFilter).toBeVisible();

      const searchInput = adminPage.getByPlaceholder("Search error messages...");
      await expect(searchInput).toBeVisible();
    });

    test("filter logs by type triggers API call", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);
      await adminPage.getByText("Logs").click();
      await adminPage.waitForTimeout(500);

      const responsePromise = adminPage.waitForResponse(
        (res) => res.url().includes("/metrics/logs") && res.url().includes("type=load_error")
      );

      const typeSelect = adminPage.locator(".select").first();
      await typeSelect.selectOption("load_error");

      await responsePromise;
    });

    test("filter logs by MFE name triggers API call", async ({
      adminPage,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);
      await adminPage.getByText("Logs").click();
      await adminPage.waitForTimeout(500);

      const mfeSelect = adminPage.locator(".select").nth(1);
      const options = await mfeSelect.locator("option").allTextContents();

      if (options.length > 1) {
        const mfeName = options[1];
        const responsePromise = adminPage.waitForResponse(
          (res) => res.url().includes("/metrics/logs") && res.url().includes("mfe=")
        );

        await mfeSelect.selectOption(mfeName);
        await responsePromise;
      }
    });

    test("search logs triggers API call with search param", async ({
      adminPage,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/health`);
      await adminPage.getByText("Logs").click();
      await adminPage.waitForTimeout(500);

      const searchInput = adminPage.getByPlaceholder("Search error messages...");
      await searchInput.fill("timeout");

      const responsePromise = adminPage.waitForResponse(
        (res) => res.url().includes("/metrics/logs") && res.url().includes("search=timeout")
      );

      await adminPage.getByRole("button", { name: "Search" }).click();
      await responsePromise;
    });
  });
});
