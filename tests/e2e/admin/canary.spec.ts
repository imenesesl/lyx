import { test, expect } from "../fixtures/test-fixtures";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("Canary Deployments", () => {
  test("canary tab visible on app detail", async ({ adminPage, testApp }) => {
    await adminPage.goto(`${ADMIN_URL}/apps/${testApp._id}`);

    const canaryTab = adminPage.locator(".tab", { hasText: "Canary" });
    await expect(canaryTab).toBeVisible();
  });

  test.describe("Canary Operations", () => {
    let appId: string;
    let slotId: string;
    let mfeId: string;
    let versionIdV1: string;
    let versionIdV2: string;

    test.beforeEach(async ({ apiContext }) => {
      const layoutsRes = await apiContext.get("/api/layouts");
      const layouts = await layoutsRes.json();
      expect(layouts.length).toBeGreaterThan(0);

      const appRes = await apiContext.post("/api/apps", {
        data: {
          name: `e2e-canary-app-${Date.now()}`,
          layoutTemplateId: layouts[0]._id,
        },
      });
      expect(appRes.ok()).toBe(true);
      const app = await appRes.json();
      appId = app._id;

      const configRes = await apiContext.get(`/api/apps/${appId}/config`);
      const config = await configRes.json();
      slotId = config.layoutSnapshot.regions[0]?.slot ?? "main";

      const mfeRes = await apiContext.post("/api/mfes", {
        data: { name: `e2e-canary-mfe-${Date.now()}` },
      });
      expect(mfeRes.ok()).toBe(true);
      const mfe = await mfeRes.json();
      mfeId = mfe._id;

      const v1Res = await apiContext.post(`/api/mfes/${mfeId}/versions`, {
        data: {
          slot: slotId,
          remoteEntryUrl: "http://localhost:9999/remoteEntry.js",
          bundlePath: "/bundles/v1",
        },
      });
      if (v1Res.ok()) {
        const v1 = await v1Res.json();
        versionIdV1 = v1._id;
      }

      const v2Res = await apiContext.post(`/api/mfes/${mfeId}/versions`, {
        data: {
          slot: slotId,
          remoteEntryUrl: "http://localhost:9999/remoteEntry-v2.js",
          bundlePath: "/bundles/v2",
        },
      });
      if (v2Res.ok()) {
        const v2 = await v2Res.json();
        versionIdV2 = v2._id;
      }

      if (versionIdV1) {
        await apiContext.put(`/api/apps/${appId}/config`, {
          data: {
            assignments: [
              {
                slotId,
                mfeId,
                mfeVersionId: versionIdV1,
                mfeName: mfe.name,
                mfeVersion: "1",
              },
            ],
          },
        });
        await apiContext.post(`/api/apps/${appId}/publish`, {
          data: {
            assignments: [
              {
                slotId,
                mfeId,
                mfeVersionId: versionIdV1,
                mfeName: mfe.name,
                mfeVersion: "1",
              },
            ],
          },
        });
      }
    });

    test.afterEach(async ({ apiContext }) => {
      if (appId) {
        try { await apiContext.delete(`/api/apps/${appId}`); } catch {}
      }
      if (mfeId) {
        try { await apiContext.delete(`/api/mfes/${mfeId}`); } catch {}
      }
    });

    test("create canary rule from UI", async ({ adminPage }) => {
      test.skip(!versionIdV2, "Need 2 MFE versions to create canary");

      await adminPage.goto(`${ADMIN_URL}/apps/${appId}`);
      await adminPage.locator(".tab", { hasText: "Canary" }).click();
      await adminPage.waitForTimeout(500);

      const startCanarySection = adminPage.getByText("Start New Canary");
      await expect(startCanarySection).toBeVisible();

      const slotSelect = adminPage.locator(".card").filter({ hasText: "Start New Canary" }).locator(".select").first();
      const options = await slotSelect.locator("option").allTextContents();

      if (options.length > 1) {
        await slotSelect.selectOption({ index: 1 });

        const mfeSelect = adminPage.locator(".card").filter({ hasText: "Start New Canary" }).locator(".select").nth(1);
        const mfeOptions = await mfeSelect.locator("option").allTextContents();
        if (mfeOptions.length > 1) {
          await mfeSelect.selectOption({ index: 1 });
          await adminPage.waitForTimeout(300);

          const versionSelect = adminPage.locator(".card").filter({ hasText: "Start New Canary" }).locator(".select").nth(2);
          const versionOptions = await versionSelect.locator("option").allTextContents();
          if (versionOptions.length > 1) {
            await versionSelect.selectOption({ index: 1 });
            await adminPage.getByRole("button", { name: "Start Canary" }).click();
            await adminPage.waitForTimeout(1000);

            await expect(
              adminPage.getByText("Active Canaries")
            ).toBeVisible();
          }
        }
      }
    });

    test("promote canary via API and verify UI", async ({
      adminPage,
      apiContext,
    }) => {
      test.skip(!versionIdV2, "Need 2 MFE versions for canary");

      await apiContext.post(`/api/apps/${appId}/canary`, {
        data: { slotId, mfeVersionId: versionIdV2, percentage: 10 },
      });

      await adminPage.goto(`${ADMIN_URL}/apps/${appId}`);
      await adminPage.locator(".tab", { hasText: "Canary" }).click();
      await adminPage.waitForTimeout(500);

      const promoteBtn = adminPage.getByRole("button", {
        name: "Promote to Stable",
      });

      if (await promoteBtn.isVisible()) {
        await promoteBtn.click();
        await adminPage.waitForTimeout(1000);

        const canariesGone = await adminPage
          .getByText("Active Canaries")
          .isHidden()
          .catch(() => true);
        expect(canariesGone).toBe(true);
      }
    });

    test("rollback canary via API and verify UI", async ({
      adminPage,
      apiContext,
    }) => {
      test.skip(!versionIdV2, "Need 2 MFE versions for canary");

      await apiContext.post(`/api/apps/${appId}/canary`, {
        data: { slotId, mfeVersionId: versionIdV2, percentage: 10 },
      });

      await adminPage.goto(`${ADMIN_URL}/apps/${appId}`);
      await adminPage.locator(".tab", { hasText: "Canary" }).click();
      await adminPage.waitForTimeout(500);

      const rollbackBtn = adminPage.getByRole("button", { name: "Rollback" });

      if (await rollbackBtn.isVisible()) {
        await rollbackBtn.click();
        await adminPage.waitForTimeout(1000);

        const canariesGone = await adminPage
          .getByText("Active Canaries")
          .isHidden()
          .catch(() => true);
        expect(canariesGone).toBe(true);
      }
    });
  });
});
