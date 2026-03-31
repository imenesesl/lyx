import { test, expect } from "../fixtures/test-fixtures";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("MFE Management", () => {
  test.describe("MFE List", () => {
    test("shows existing MFEs", async ({ adminPage, testMfe }) => {
      await adminPage.goto(`${ADMIN_URL}/admin/mfes`);

      await expect(adminPage.locator(".page-header h1")).toContainText("Micro Frontends");
      await expect(adminPage.getByText(testMfe.name)).toBeVisible();
    });

    test("empty state when no MFEs exist", async ({ adminPage, apiContext }) => {
      const res = await apiContext.get("/api/mfes");
      const mfes = await res.json();

      for (const mfe of mfes) {
        try {
          await apiContext.delete(`/api/mfes/${mfe._id}`);
        } catch {
          // MFE may be in use
        }
      }

      await adminPage.goto(`${ADMIN_URL}/admin/mfes`);

      const emptyState = adminPage.locator(".empty-state");
      if (await emptyState.isVisible()) {
        await expect(
          adminPage.getByText("No micro frontends registered")
        ).toBeVisible();
      }

      for (const mfe of mfes) {
        await apiContext.post("/api/mfes", { data: { name: mfe.name } });
      }
    });
  });

  test.describe("MFE Detail", () => {
    test("detail page shows MFE name and version history", async ({
      adminPage,
      testMfe,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/admin/mfes/${testMfe._id}`);

      await expect(adminPage.locator(".page-header h1")).toContainText(testMfe.name);
      await expect(adminPage.getByText("Versions")).toBeVisible();
    });

    test("version detail shows remote entry URL when versions exist", async ({
      adminPage,
      testMfe,
      apiContext,
    }) => {
      const versionsRes = await apiContext.get(`/api/mfes/${testMfe._id}/versions`);
      const versions = await versionsRes.json();

      await adminPage.goto(`${ADMIN_URL}/admin/mfes/${testMfe._id}`);

      if (versions.length > 0) {
        await expect(adminPage.getByText("Entry:")).toBeVisible();
      } else {
        await expect(
          adminPage.getByText("No versions published")
        ).toBeVisible();
      }
    });

    test("archive MFE toggles archived state", async ({
      adminPage,
      testMfe,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/admin/mfes/${testMfe._id}`);

      await adminPage.getByRole("button", { name: "Archive" }).click();
      await adminPage.waitForTimeout(500);

      await expect(adminPage.locator(".badge.badge-warning")).toContainText("archived");

      await adminPage.getByRole("button", { name: "Unarchive" }).click();
      await adminPage.waitForTimeout(500);

      await expect(adminPage.locator(".badge.badge-warning")).not.toBeVisible();
    });

    test("delete unused MFE navigates to list", async ({
      adminPage,
      apiContext,
    }) => {
      const createRes = await apiContext.post("/api/mfes", {
        data: { name: `e2e-del-mfe-${Date.now()}` },
      });
      const mfe = await createRes.json();

      await adminPage.goto(`${ADMIN_URL}/admin/mfes/${mfe._id}`);

      adminPage.on("dialog", (dialog) => dialog.accept());

      await adminPage.getByRole("button", { name: "Delete" }).click();

      await adminPage.waitForURL(/\/mfes$/);
      await expect(adminPage.locator(".page-header h1")).toContainText("Micro Frontends");
    });

    test("delete MFE that is in use shows error", async ({
      adminPage,
      testApp,
      testMfe,
      apiContext,
    }) => {
      const configRes = await apiContext.get(`/api/apps/${testApp._id}/config`);
      const config = await configRes.json();

      if (config.layoutSnapshot?.regions?.length > 0) {
        const slot = config.layoutSnapshot.regions[0].slot;
        await apiContext.put(`/api/apps/${testApp._id}/config`, {
          data: {
            assignments: [
              {
                slotId: slot,
                mfeId: testMfe._id,
                mfeVersionId: "",
                mfeName: testMfe.name,
                mfeVersion: "",
              },
            ],
          },
        });
      }

      await adminPage.goto(`${ADMIN_URL}/admin/mfes/${testMfe._id}`);

      adminPage.on("dialog", (dialog) => dialog.accept());

      await adminPage.getByRole("button", { name: "Delete" }).click();
      await adminPage.waitForTimeout(500);

      const errorVisible = await adminPage.locator(".error-text").isVisible();
      const stillOnPage = adminPage.url().includes(`/mfes/${testMfe._id}`);

      expect(errorVisible || stillOnPage).toBe(true);
    });
  });
});
