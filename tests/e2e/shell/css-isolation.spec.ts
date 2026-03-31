import { test, expect } from "@playwright/test";

const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const ACCOUNT_ID = "iml";
const APP_SLUG = "example-1";

test.describe("CSS Style Isolation (Shadow DOM)", () => {
  test("each MFE slot is wrapped in a shadow DOM host", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const shadowHosts = await page.locator("[data-lyx-shadow-host]").count();
    const slots = await page.locator("[data-lyx-slot]").count();

    expect(shadowHosts).toBeGreaterThan(0);
    expect(shadowHosts).toBeLessThanOrEqual(slots);
  });

  test("shadow hosts contain a shadow root with a mount point", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const hasShadowRoots = await page.evaluate(() => {
      const hosts = document.querySelectorAll("[data-lyx-shadow-host]");
      if (hosts.length === 0) return false;
      return Array.from(hosts).every((host) => {
        const shadow = host.shadowRoot;
        return shadow !== null && shadow.querySelector("[data-lyx-shadow-mount]") !== null;
      });
    });

    expect(hasShadowRoots).toBe(true);
  });

  test("MFE rendered content is inside shadow root, not light DOM", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const shadowContentCheck = await page.evaluate(() => {
      const hosts = document.querySelectorAll("[data-lyx-shadow-host]");
      const results: boolean[] = [];

      for (const host of hosts) {
        const shadow = host.shadowRoot;
        if (!shadow) {
          results.push(false);
          continue;
        }
        const mount = shadow.querySelector("[data-lyx-shadow-mount]");
        const hasContent = mount !== null && mount.childNodes.length > 0;
        results.push(hasContent);
      }
      return results;
    });

    expect(shadowContentCheck.length).toBeGreaterThan(0);
    for (const hasContent of shadowContentCheck) {
      expect(hasContent).toBe(true);
    }
  });

  test("MFE styles do not leak into the light DOM document.head", async ({ page }) => {
    const headStylesBefore = await page.evaluate(() =>
      document.head.querySelectorAll("style").length,
    );

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const headStylesAfter = await page.evaluate(() => {
      const styles = document.head.querySelectorAll("style");
      return Array.from(styles).map((s) => s.textContent ?? "");
    });

    for (const css of headStylesAfter) {
      expect(css).not.toMatch(/mfe-header|mfe-footer|mfe-1/i);
    }
  });

  test("CSS custom properties (design tokens) inherit into shadow DOM", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const tokenInheritance = await page.evaluate(() => {
      document.documentElement.style.setProperty("--lyx-test-token", "#ff0000");

      const hosts = document.querySelectorAll("[data-lyx-shadow-host]");
      if (hosts.length === 0) return null;

      const shadow = hosts[0].shadowRoot;
      if (!shadow) return null;

      const mount = shadow.querySelector("[data-lyx-shadow-mount]");
      if (!mount) return null;

      const computed = getComputedStyle(mount as Element);
      const value = computed.getPropertyValue("--lyx-test-token").trim();

      document.documentElement.style.removeProperty("--lyx-test-token");
      return value;
    });

    expect(tokenInheritance).toBe("#ff0000");
  });

  test("shell layout structure is preserved with shadow isolation", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const layoutStructure = await page.evaluate(() => {
      const regions = document.querySelectorAll("[data-lyx-region]");
      return Array.from(regions).map((r) => ({
        region: r.getAttribute("data-lyx-region"),
        slot: r.getAttribute("data-lyx-slot"),
        hasShadowHost: r.querySelector("[data-lyx-shadow-host]") !== null,
      }));
    });

    expect(layoutStructure.length).toBeGreaterThan(0);

    for (const region of layoutStructure) {
      expect(region.region).toBeTruthy();
      expect(region.slot).toBeTruthy();
    }
  });
});
