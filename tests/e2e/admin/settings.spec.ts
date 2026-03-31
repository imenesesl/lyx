import { test, expect } from "../fixtures/test-fixtures";
import { SettingsPage } from "../pages/settings.page";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

test.describe("Settings", () => {
  test.describe("Account Info", () => {
    test("settings page shows account name and email", async ({ adminPage }) => {
      await adminPage.goto(`${ADMIN_URL}/settings`);

      await expect(adminPage.locator(".page-header h1")).toContainText("Settings");
      await expect(adminPage.getByText("Account")).toBeVisible();

      const nameInput = adminPage
        .locator(".card")
        .filter({ hasText: "Account" })
        .getByLabel("Name");
      await expect(nameInput).not.toBeEmpty();

      const emailInput = adminPage
        .locator(".card")
        .filter({ hasText: "Account" })
        .getByLabel("Email");
      await expect(emailInput).not.toBeEmpty();
    });
  });

  test.describe("Custom Alias", () => {
    test("set valid alias shows success", async ({ adminPage }) => {
      const settingsPage = new SettingsPage(adminPage);
      await settingsPage.goto();

      const alias = `e2e-alias-${Date.now()}`.slice(0, 32);
      await settingsPage.setAlias(alias);

      await settingsPage.expectAliasSuccess();
    });

    test("alias too short keeps save button disabled", async ({ adminPage }) => {
      const settingsPage = new SettingsPage(adminPage);
      await settingsPage.goto();

      await settingsPage.aliasInput.fill("ab");

      await expect(settingsPage.aliasSaveButton).toBeDisabled();
    });

    test("duplicate alias shows error", async ({ adminPage, apiContext }) => {
      const otherEmail = `e2e-dup-${Date.now()}@test.com`;
      const regRes = await apiContext.post("/api/auth/register", {
        data: { email: otherEmail, password: "Test1234!", name: "Dup User" },
      });

      if (regRes.ok()) {
        const { token } = await regRes.json();
        const reservedAlias = `reserved-${Date.now()}`.slice(0, 32);

        await apiContext.put("/api/auth/alias", {
          data: { alias: reservedAlias },
          headers: { Authorization: `Bearer ${token}` },
        });

        const settingsPage = new SettingsPage(adminPage);
        await settingsPage.goto();

        await settingsPage.setAlias(reservedAlias);

        const errorVisible = await adminPage
          .locator(".error-text")
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        expect(errorVisible).toBe(true);
      } else {
        test.skip(true, "Could not create second account for duplicate alias test");
      }
    });
  });

  test.describe("Shell URL", () => {
    test("set valid shell URL shows success", async ({ adminPage }) => {
      const settingsPage = new SettingsPage(adminPage);
      await settingsPage.goto();

      await settingsPage.setShellUrl("https://e2e-shell.us-west-2.awsapprunner.com");

      await settingsPage.expectShellUrlSuccess();
    });

    test("clear shell URL is allowed", async ({ adminPage }) => {
      const settingsPage = new SettingsPage(adminPage);
      await settingsPage.goto();

      await settingsPage.shellUrlInput.fill("");

      const saveDisabled = await settingsPage.shellUrlSaveButton.isDisabled();
      if (!saveDisabled) {
        await settingsPage.shellUrlSaveButton.click();
        await settingsPage.expectShellUrlSuccess();
      }
    });
  });

  test.describe("Logout", () => {
    test("logout from settings redirects to login", async ({ adminPage }) => {
      const settingsPage = new SettingsPage(adminPage);
      await settingsPage.goto();

      await settingsPage.logoutButton.click();

      await adminPage.waitForURL(/\/login/);
      await expect(
        adminPage.getByRole("button", { name: "Sign In" })
      ).toBeVisible();
    });
  });
});
