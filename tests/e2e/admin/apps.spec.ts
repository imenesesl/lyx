import { test, expect } from "../fixtures/test-fixtures";
import { AppListPage } from "../pages/app-list.page";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("Application Management", () => {
  test.describe("App List", () => {
    test("shows existing apps", async ({ adminPage, testApp }) => {
      await adminPage.goto(`${ADMIN_URL}/apps`);

      await expect(adminPage.locator(".page-header h1")).toContainText("Applications");
      await expect(adminPage.getByText(testApp.name)).toBeVisible();
    });

    test("empty state when no apps exist", async ({ adminPage, apiContext }) => {
      const res = await apiContext.get("/api/apps");
      const apps = await res.json();

      for (const app of apps) {
        await apiContext.delete(`/api/apps/${app._id}`);
      }

      await adminPage.goto(`${ADMIN_URL}/apps`);

      await expect(adminPage.locator(".empty-state")).toBeVisible();
      await expect(
        adminPage.getByText("No applications yet")
      ).toBeVisible();

      for (const app of apps) {
        const layoutsRes = await apiContext.get("/api/layouts");
        const layouts = await layoutsRes.json();
        await apiContext.post("/api/apps", {
          data: { name: app.name, layoutTemplateId: layouts[0]._id },
        });
      }
    });
  });

  test.describe("Create App", () => {
    test("create new application with layout selection", async ({ adminPage }) => {
      const appListPage = new AppListPage(adminPage);
      await appListPage.goto();

      const appName = `e2e-create-${Date.now()}`;
      await appListPage.createApp(appName);

      await appListPage.expectAppExists(appName);

      const card = appListPage.getAppCard(appName);
      await card.click();
      await adminPage.waitForURL(/\/apps\/.+/);

      await adminPage.goBack();
      await adminPage.waitForURL(/\/apps$/);

      const deleteCard = appListPage.getAppCard(appName);
      await expect(deleteCard).toBeVisible();
    });

    test("create app without selecting layout keeps button disabled", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/apps`);

      await adminPage.getByRole("button", { name: "New Application" }).click();
      const modal = adminPage.locator(".modal-content");
      await expect(modal).toBeVisible();

      await modal.getByLabel("Name").fill("No Layout App");

      const createBtn = modal.getByRole("button", { name: "Create" });
      await expect(createBtn).toBeDisabled();

      await adminPage.locator(".modal-overlay").click({ position: { x: 10, y: 10 } });
    });
  });

  test.describe("App Detail", () => {
    test("detail page loads with app name and tabs", async ({ adminPage, testApp }) => {
      await adminPage.goto(`${ADMIN_URL}/apps/${testApp._id}`);

      await expect(adminPage.locator(".page-header h1")).toContainText(testApp.name);
      await expect(adminPage.getByText("Configuration")).toBeVisible();
      await expect(adminPage.getByText("Versions")).toBeVisible();
      await expect(adminPage.getByText("Canary")).toBeVisible();
      await expect(adminPage.getByText("Settings")).toBeVisible();
    });

    test("detail page shows layout slot assignments", async ({ adminPage, testApp }) => {
      await adminPage.goto(`${ADMIN_URL}/apps/${testApp._id}`);

      await expect(
        adminPage.getByText("Slot Assignments")
      ).toBeVisible();
      await expect(adminPage.locator(".badge.badge-accent").first()).toBeVisible();
    });

    test("publish app config assigns MFEs to slots", async ({
      adminPage,
      testApp,
      testMfe,
      apiContext,
    }) => {
      const versionsRes = await apiContext.get(`/api/mfes/${testMfe._id}/versions`);
      const versions = await versionsRes.json();

      if (versions.length === 0) {
        test.skip(true, "No MFE versions available to assign");
        return;
      }

      await adminPage.goto(`${ADMIN_URL}/apps/${testApp._id}`);

      const firstSelect = adminPage.locator(".select").first();
      await firstSelect.selectOption({ label: testMfe.name });

      await adminPage.getByRole("button", { name: "Save Draft" }).click();
      await adminPage.waitForTimeout(500);
    });

    test("edit app name and description", async ({ adminPage, testApp }) => {
      await adminPage.goto(`${ADMIN_URL}/apps/${testApp._id}`);

      await adminPage.getByText("Settings").click();
      await adminPage.waitForTimeout(300);

      const nameInput = adminPage.locator('.card .form-group').filter({ hasText: "Name" }).locator(".input");
      await nameInput.fill(`${testApp.name}-edited`);

      const descInput = adminPage.locator('.card .form-group').filter({ hasText: "Description" }).locator(".input");
      await descInput.fill("E2E edited description");

      await adminPage.getByRole("button", { name: "Save Changes" }).click();
      await adminPage.waitForTimeout(500);

      await expect(
        adminPage.locator(".page-header h1")
      ).toContainText(`${testApp.name}-edited`);
    });

    test("delete app navigates back to list", async ({
      adminPage,
      apiContext,
    }) => {
      const layoutsRes = await apiContext.get("/api/layouts");
      const layouts = await layoutsRes.json();
      const createRes = await apiContext.post("/api/apps", {
        data: { name: `e2e-delete-${Date.now()}`, layoutTemplateId: layouts[0]._id },
      });
      const app = await createRes.json();

      await adminPage.goto(`${ADMIN_URL}/apps/${app._id}`);
      await adminPage.getByText("Settings").click();
      await adminPage.waitForTimeout(300);

      adminPage.on("dialog", (dialog) => dialog.accept());

      await adminPage.getByRole("button", { name: "Delete this app" }).click();

      await adminPage.waitForURL(/\/apps$/);
      await expect(adminPage.locator(".page-header h1")).toContainText("Applications");
    });

    test("preview link contains correct URL structure", async ({
      adminPage,
      testApp,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/apps/${testApp._id}`);

      const previewLink = adminPage.locator('a:has-text("Preview")').first();
      await expect(previewLink).toBeVisible();

      const href = await previewLink.getAttribute("href");
      expect(href).toContain(`/${testApp.slug}/`);
    });
  });
});
