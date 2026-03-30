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
    await this.page.goto("/apps");
  }

  async createApp(name: string, layoutIndex = 0) {
    await this.newAppButton.click();
    await expect(this.createModal).toBeVisible();

    await this.createModal.getByLabel("Name").fill(name);

    const layoutCards = this.createModal.locator(".grid .card");
    await layoutCards.nth(layoutIndex).click();

    await this.createModal.getByRole("button", { name: "Create" }).click();
    await expect(this.createModal).toBeHidden();
  }

  async expectAppExists(name: string) {
    await expect(this.page.getByText(name, { exact: false })).toBeVisible();
  }

  getAppCard(name: string): Locator {
    return this.appCards.filter({ hasText: name });
  }
}
