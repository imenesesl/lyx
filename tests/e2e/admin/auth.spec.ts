import { test, expect } from "../fixtures/test-fixtures";
import { LoginPage } from "../pages/login.page";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test("login with valid credentials navigates to dashboard", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login("e2e@test.com", "Test1234!");

      await page.waitForURL("/");
      await expect(page.locator(".page-header h1")).toContainText("Overview");
    });

    test("login with invalid credentials shows error", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login("wrong@email.com", "WrongPassword!");

      await loginPage.expectError("Invalid");
      await expect(page).toHaveURL(/\/login/);
    });

    test("login with empty fields shows HTML validation", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.submitButton.click();

      const emailInput = loginPage.emailInput;
      const isInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );
      expect(isInvalid).toBe(true);
    });
  });

  test.describe("Registration", () => {
    test("register new account and redirect to dashboard", async ({ page }) => {
      await page.goto("/register");

      const uniqueEmail = `e2e-reg-${Date.now()}@test.com`;

      await page.getByLabel("Name").fill("New User");
      await page.getByLabel("Email").fill(uniqueEmail);
      await page.getByLabel("Password").fill("NewPass123!");
      await page.getByRole("button", { name: "Create Account" }).click();

      await page.waitForURL("/");
      await expect(page.locator(".page-header h1")).toContainText("Overview");
    });

    test("register with existing email shows error", async ({ page }) => {
      await page.goto("/register");

      await page.getByLabel("Name").fill("Duplicate User");
      await page.getByLabel("Email").fill("e2e@test.com");
      await page.getByLabel("Password").fill("Test1234!");
      await page.getByRole("button", { name: "Create Account" }).click();

      await expect(page.locator(".error-text")).toBeVisible();
    });
  });

  test.describe("Session", () => {
    test("unauthenticated access redirects to login", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(ADMIN_URL);

      await page.waitForURL(/\/login/);
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

      await context.close();
    });

    test("logout clears session and redirects to login", async ({ adminPage }) => {
      await adminPage.goto(ADMIN_URL);
      await expect(adminPage.locator(".page-header h1")).toContainText("Overview");

      await adminPage.getByRole("button", { name: "Log out" }).click();

      await adminPage.waitForURL(/\/login/);
      await expect(
        adminPage.getByRole("button", { name: "Sign In" })
      ).toBeVisible();
    });

    test("expired token redirects to login", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(ADMIN_URL);
      await page.evaluate(() =>
        localStorage.setItem("lyx_token", "expired.invalid.token")
      );

      await page.goto(ADMIN_URL);
      await page.waitForURL(/\/login/);
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

      await context.close();
    });
  });
});
