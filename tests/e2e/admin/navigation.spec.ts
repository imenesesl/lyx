import { test, expect } from "../fixtures/test-fixtures";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

const SIDEBAR_LINKS = [
  { label: "Overview", path: "/", exact: true },
  { label: "Applications", path: "/apps", exact: false },
  { label: "Micro Frontends", path: "/mfes", exact: false },
  { label: "MFE Health", path: "/health", exact: false },
  { label: "Layouts", path: "/layouts", exact: false },
  { label: "Settings", path: "/settings", exact: false },
];

test.describe("Navigation and Layout", () => {
  test.describe("Sidebar", () => {
    test("sidebar shows all navigation links", async ({ adminPage }) => {
      await adminPage.goto(ADMIN_URL);

      for (const link of SIDEBAR_LINKS) {
        await expect(
          adminPage.locator("nav").getByText(link.label)
        ).toBeVisible();
      }
    });

    test.describe("sidebar links navigate correctly", () => {
      for (const link of SIDEBAR_LINKS) {
        test(`${link.label} link navigates to ${link.path}`, async ({
          adminPage,
        }) => {
          await adminPage.goto(ADMIN_URL);

          await adminPage.locator("nav").getByText(link.label).click();

          if (link.exact) {
            await expect(adminPage).toHaveURL(new RegExp(`^${ADMIN_URL}/?$`));
          } else {
            await expect(adminPage).toHaveURL(new RegExp(link.path));
          }
        });
      }
    });
  });

  test.describe("Page Titles", () => {
    test("header shows correct page title for each route", async ({
      adminPage,
    }) => {
      const ROUTES: { path: string; title: string }[] = [
        { path: "/", title: "Overview" },
        { path: "/apps", title: "Applications" },
        { path: "/mfes", title: "Micro Frontends" },
        { path: "/health", title: "MFE Health" },
        { path: "/layouts", title: "Layouts" },
        { path: "/settings", title: "Settings" },
      ];

      for (const route of ROUTES) {
        await adminPage.goto(`${ADMIN_URL}${route.path}`);

        const headerTitle = adminPage.locator("header h2");
        await expect(headerTitle).toContainText(route.title);
      }
    });
  });

  test.describe("Refresh Button", () => {
    test("refresh button reloads data without full page reload", async ({
      adminPage,
    }) => {
      await adminPage.goto(`${ADMIN_URL}/apps`);
      await adminPage.waitForTimeout(500);

      const responsePromise = adminPage.waitForResponse(
        (res) => res.url().includes("/api/apps") && res.status() === 200
      );

      const refreshBtn = adminPage.locator('button[title="Refresh content"]');
      await expect(refreshBtn).toBeVisible();
      await refreshBtn.click();

      await responsePromise;

      await expect(adminPage).toHaveURL(new RegExp("/apps"));
    });
  });

  test.describe("Shell Layout Structure", () => {
    test("page has sidebar, header, and main content", async ({
      adminPage,
    }) => {
      await adminPage.goto(ADMIN_URL);

      await expect(adminPage.locator("aside")).toBeVisible();
      await expect(adminPage.locator("header")).toBeVisible();
      await expect(adminPage.locator("main")).toBeVisible();
    });

    test("sidebar shows Lyx Admin branding", async ({ adminPage }) => {
      await adminPage.goto(ADMIN_URL);

      await expect(adminPage.getByText("Lyx Admin")).toBeVisible();
    });

    test("sidebar shows logged-in user info", async ({ adminPage }) => {
      await adminPage.goto(ADMIN_URL);

      await expect(
        adminPage.locator("aside").getByRole("button", { name: "Log out" })
      ).toBeVisible();
    });
  });
});
