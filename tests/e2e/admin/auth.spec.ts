import { test, expect } from "../fixtures/test-fixtures";
import { LoginPage } from "../pages/login.page";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test("login with valid credentials navigates to dashboard", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login("e2e@test.com", "Test1234!");

      await page.waitForURL(/\/admin\/?$/);
      await expect(page.locator(".page-header h1")).toContainText("Overview");

      await context.close();
    });

    test("login with invalid credentials shows error", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login("wrong@email.com", "WrongPassword!");

      await loginPage.expectError("Invalid");
      await expect(page).toHaveURL(/\/admin\/login/);

      await context.close();
    });

    test("login with empty fields shows HTML validation", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.submitButton.click();

      const emailInput = loginPage.emailInput;
      const isInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );
      expect(isInvalid).toBe(true);

      await context.close();
    });
  });

  test.describe("Registration", () => {
    test("register new account and redirect to dashboard", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      await page.goto(`${ADMIN_URL}/admin/register`, { waitUntil: "networkidle" });

      const uniqueEmail = `e2e-reg-${Date.now()}@test.com`;

      await page.getByPlaceholder("Your name").fill("New User");
      await page.getByPlaceholder("you@example.com").fill(uniqueEmail);
      await page.getByPlaceholder("Minimum 6 characters").fill("NewPass123!");
      await page.getByRole("button", { name: "Create Account" }).click();

      await page.waitForURL(/\/admin\/?$/);
      await expect(page.locator(".page-header h1")).toContainText("Overview");

      await context.close();
    });

    test("register with existing email shows error", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      await page.goto(`${ADMIN_URL}/admin/register`, { waitUntil: "networkidle" });

      await page.getByPlaceholder("Your name").fill("Duplicate User");
      await page.getByPlaceholder("you@example.com").fill("e2e@test.com");
      await page.getByPlaceholder("Minimum 6 characters").fill("Test1234!");
      await page.getByRole("button", { name: "Create Account" }).click();

      await expect(page.locator(".error-text")).toBeVisible();

      await context.close();
    });
  });

  test.describe("Session", () => {
    test("unauthenticated access redirects to login", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();

      await page.goto(`${ADMIN_URL}/admin`, { waitUntil: "networkidle" });

      await page.waitForURL(/\/admin\/login/);
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

      await context.close();
    });

    test("logout clears session and redirects to login", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/admin`, { waitUntil: "networkidle" });
      await expect(adminPage.locator(".page-header h1")).toContainText("Overview");

      await adminPage.getByRole("button", { name: "Log out" }).click();

      await adminPage.waitForURL(/\/admin\/login/);
      await expect(
        adminPage.getByRole("button", { name: "Sign In" })
      ).toBeVisible();
    });

    test("expired token redirects to login", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();

      await page.goto(`${ADMIN_URL}/admin`, { waitUntil: "networkidle" });
      await page.evaluate(() =>
        localStorage.setItem("lyx_token", "expired.invalid.token")
      );

      await page.goto(`${ADMIN_URL}/admin`, { waitUntil: "networkidle" });
      await page.waitForURL(/\/admin\/login/);
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

      await context.close();
    });
  });
});
