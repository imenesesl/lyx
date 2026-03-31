import { type Locator, type Page, expect } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly aliasInput: Locator;
  readonly aliasSaveButton: Locator;
  readonly shellUrlInput: Locator;
  readonly shellUrlSaveButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    const aliasGroup = page.locator(".card").filter({ hasText: "Custom Alias" });
    this.aliasInput = aliasGroup.getByPlaceholder("my-company");
    this.aliasSaveButton = aliasGroup.getByRole("button", { name: "Save" });

    const shellGroup = page.locator(".card").filter({ hasText: "Shell Service URL" });
    this.shellUrlInput = shellGroup.getByPlaceholder(
      "https://abc123.us-west-2.awsapprunner.com"
    );
    this.shellUrlSaveButton = shellGroup.getByRole("button", { name: "Save" });

    this.logoutButton = page.getByRole("button", {
      name: "Log out of all sessions",
    });
  }

  async goto() {
    const adminUrl = process.env.ADMIN_URL ?? "http://localhost:4001";
    await this.page.goto(`${adminUrl}/admin/settings`);
  }

  async setAlias(alias: string) {
    await this.aliasInput.fill(alias);
    await this.aliasSaveButton.click();
  }

  async setShellUrl(url: string) {
    await this.shellUrlInput.fill(url);
    await this.shellUrlSaveButton.click();
  }

  async expectAliasSuccess() {
    await expect(
      this.page.getByText("Alias updated", { exact: false })
    ).toBeVisible();
  }

  async expectShellUrlSuccess() {
    await expect(
      this.page.getByText("Shell URL updated", { exact: false })
    ).toBeVisible();
  }
}
