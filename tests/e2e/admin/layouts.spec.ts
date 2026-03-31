import { test, expect } from "../fixtures/test-fixtures";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

interface LayoutListItem {
  _id: string;
  name: string;
  isBuiltIn: boolean;
}

test.describe("Layout Management", () => {
  test.describe("Layout List", () => {
    test("layouts page lists built-in templates", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/layouts`);

      await expect(adminPage.locator(".page-header h1")).toContainText("Layouts");
      await expect(adminPage.locator(".badge.badge-warning").first()).toContainText("built-in");
    });

    test("built-in layouts do not show delete button", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/layouts`);

      const builtInCards = adminPage.locator(".card").filter({
        has: adminPage.locator(".badge.badge-warning", { hasText: "built-in" }),
      });

      const count = await builtInCards.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const card = builtInCards.nth(i);
        await expect(
          card.getByRole("button", { name: "Delete" })
        ).not.toBeVisible();
      }
    });
  });

  test.describe("Layout Builder", () => {
    test("create custom layout with regions", async ({ adminPage, apiContext }) => {
      await adminPage.goto(`${ADMIN_URL}/layouts/new`);

      await expect(adminPage.locator(".page-header h1")).toContainText("Create Layout");

      const layoutName = `e2e-layout-${Date.now()}`;
      await adminPage.getByLabel("Name").fill(layoutName);
      await adminPage.getByLabel("Description").fill("E2E test layout");

      await adminPage.getByPlaceholder("e.g. header, sidebar").fill("header");
      await adminPage.locator(".select").selectOption("top");
      await adminPage.getByRole("button", { name: "Add" }).click();

      await expect(adminPage.getByText("header")).toBeVisible();
      await expect(adminPage.getByText("Regions (1)")).toBeVisible();

      await adminPage.getByPlaceholder("e.g. header, sidebar").fill("main");
      await adminPage.locator(".form-group").filter({ hasText: "Position" }).locator(".select").selectOption("center");
      await adminPage.getByRole("button", { name: "Add" }).click();

      await expect(adminPage.getByText("Regions (2)")).toBeVisible();

      await adminPage.getByRole("button", { name: "Create Layout" }).click();

      await adminPage.waitForURL(/\/layouts$/);
      await expect(adminPage.getByText(layoutName)).toBeVisible();

      const layoutsRes = await apiContext.get("/api/layouts");
      const layouts: LayoutListItem[] = await layoutsRes.json();
      const created = layouts.find((l) => l.name === layoutName);
      if (created && !created.isBuiltIn) {
        await apiContext.delete(`/api/layouts/${created._id}`);
      }
    });

    test("add and remove regions in layout builder", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/layouts/new`);

      await adminPage.getByPlaceholder("e.g. header, sidebar").fill("sidebar");
      await adminPage.getByRole("button", { name: "Add" }).click();

      await expect(adminPage.getByText("Regions (1)")).toBeVisible();
      await expect(adminPage.getByText("sidebar")).toBeVisible();

      await adminPage.getByRole("button", { name: "x" }).click();

      await expect(adminPage.getByText("Regions (0)")).toBeVisible();
      await expect(
        adminPage.getByText("Add regions to build your layout")
      ).toBeVisible();
    });

    test("edit existing custom layout", async ({ adminPage, apiContext }) => {
      const createRes = await apiContext.post("/api/layouts", {
        data: {
          name: `e2e-edit-layout-${Date.now()}`,
          description: "To be edited",
          regions: [
            { id: "h-1", slot: "header", position: "top" },
            { id: "m-1", slot: "main", position: "center" },
          ],
        },
      });
      const layout = await createRes.json();

      await adminPage.goto(`${ADMIN_URL}/layouts/${layout._id}/edit`);

      await expect(adminPage.locator(".page-header h1")).toContainText("Edit Layout");

      const nameInput = adminPage.getByLabel("Name");
      await nameInput.fill(`${layout.name}-updated`);

      await adminPage.getByRole("button", { name: "Save Changes" }).click();

      await adminPage.waitForURL(/\/layouts$/);
      await expect(
        adminPage.getByText(`${layout.name}-updated`)
      ).toBeVisible();

      await apiContext.delete(`/api/layouts/${layout._id}`);
    });

    test("quick template populates regions", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/layouts/new`);

      await adminPage
        .getByRole("button", { name: "Header + Main + Footer" })
        .click();

      await expect(adminPage.getByText("Regions (3)")).toBeVisible();
      await expect(adminPage.getByText("header")).toBeVisible();
      await expect(adminPage.getByText("main")).toBeVisible();
      await expect(adminPage.getByText("footer")).toBeVisible();
    });
  });
});
