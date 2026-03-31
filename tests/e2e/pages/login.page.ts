import { type Locator, type Page, expect } from "@playwright/test";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorText: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder("you@example.com");
    this.passwordInput = page.getByPlaceholder("Your password");
    this.submitButton = page.getByRole("button", { name: "Sign In" });
    this.errorText = page.locator(".error-text");
    this.registerLink = page.getByRole("link", { name: "Create one" });
  }

  async goto() {
    await this.page.goto(`${ADMIN_URL}/admin/login`, { waitUntil: "networkidle" });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorText).toContainText(message);
  }
}
