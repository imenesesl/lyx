import { type Locator, type Page, expect } from "@playwright/test";

export class AppListPage {
  readonly page: Page;
  readonly newAppButton: Locator;
  readonly appCards: Locator;
  readonly createModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newAppButton = page.getByRole("button", { name: "New Application" });
    this.appCards = page.locator(".card.card-hover");
    this.createModal = page.locator(".modal-content");
  }

  async goto() {
    const adminUrl = process.env.ADMIN_URL ?? "http://localhost:4001";
    await this.page.goto(`${adminUrl}/admin/apps`);
  }

  async createApp(name: string, layoutIndex = 0) {
    await this.newAppButton.click();
    await expect(this.createModal).toBeVisible();

    await this.createModal.getByPlaceholder("My Awesome App").fill(name);

    const layoutCards = this.createModal.locator(".grid .card");
    await layoutCards.nth(layoutIndex).click();

    await this.createModal.getByRole("button", { name: "Create" }).click();
    await expect(this.createModal).toBeHidden();
  }

  async expectAppExists(name: string) {
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  getAppCard(name: string): Locator {
    return this.appCards.filter({ hasText: name });
  }
}
