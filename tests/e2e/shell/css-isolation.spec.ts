import { test, expect } from "@playwright/test";

const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const ACCOUNT_ID = "iml";
const APP_SLUG = "example-1";

/**
 * Waits for MFEs to finish loading (skeletons disappear) and returns
 * whether the deployed Shell version includes Shadow DOM isolation.
 */
async function waitForShellAndDetectShadow(page: import("@playwright/test").Page) {
  await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
    waitUntil: "networkidle",
  });

  await page.waitForFunction(
    () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
    { timeout: 20_000 },
  );

  const shadowHostCount = await page.locator("[data-lyx-shadow-host]").count();
  return shadowHostCount > 0;
}

test.describe("CSS Style Isolation (Shadow DOM)", () => {
  test("each loaded MFE slot is wrapped in a shadow DOM host", async ({ page }) => {
    const hasShadow = await waitForShellAndDetectShadow(page);
    test.skip(!hasShadow, "Shell not yet redeployed with Shadow DOM isolation");

    const shadowHosts = await page.locator("[data-lyx-shadow-host]").count();
    const slots = await page.locator("[data-lyx-slot]").count();

    expect(shadowHosts).toBeGreaterThan(0);
    expect(shadowHosts).toBeLessThanOrEqual(slots);
  });

  test("shadow hosts contain a shadow root with a mount point", async ({ page }) => {
    const hasShadow = await waitForShellAndDetectShadow(page);
    test.skip(!hasShadow, "Shell not yet redeployed with Shadow DOM isolation");

    const allValid = await page.evaluate(() => {
      const hosts = document.querySelectorAll("[data-lyx-shadow-host]");
      return Array.from(hosts).every((host) => {
        const shadow = host.shadowRoot;
        return shadow !== null && shadow.querySelector("[data-lyx-shadow-mount]") !== null;
      });
    });

    expect(allValid).toBe(true);
  });

  test("MFE rendered content is inside shadow root, not light DOM", async ({ page }) => {
    const hasShadow = await waitForShellAndDetectShadow(page);
    test.skip(!hasShadow, "Shell not yet redeployed with Shadow DOM isolation");

    const results = await page.evaluate(() => {
      const hosts = document.querySelectorAll("[data-lyx-shadow-host]");
      return Array.from(hosts).map((host) => {
        const shadow = host.shadowRoot;
        if (!shadow) return false;
        const mount = shadow.querySelector("[data-lyx-shadow-mount]");
        return mount !== null && mount.childNodes.length > 0;
      });
    });

    expect(results.length).toBeGreaterThan(0);
    for (const hasContent of results) {
      expect(hasContent).toBe(true);
    }
  });

  test("MFE styles do not leak into the light DOM document.head", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const headStyles = await page.evaluate(() => {
      const styles = document.head.querySelectorAll("style");
      return Array.from(styles).map((s) => s.textContent ?? "");
    });

    for (const css of headStyles) {
      expect(css).not.toMatch(/mfe-header|mfe-footer|mfe-1/i);
    }
  });

  test("CSS custom properties (design tokens) inherit into shadow DOM", async ({ page }) => {
    const hasShadow = await waitForShellAndDetectShadow(page);
    test.skip(!hasShadow, "Shell not yet redeployed with Shadow DOM isolation");

    const value = await page.evaluate(() => {
      document.documentElement.style.setProperty("--lyx-test-token", "#ff0000");

      const host = document.querySelector("[data-lyx-shadow-host]");
      const shadow = host?.shadowRoot;
      const mount = shadow?.querySelector("[data-lyx-shadow-mount]");
      if (!mount) return null;

      const result = getComputedStyle(mount as Element)
        .getPropertyValue("--lyx-test-token")
        .trim();

      document.documentElement.style.removeProperty("--lyx-test-token");
      return result;
    });

    expect(value).toBe("#ff0000");
  });

  test("shell layout structure is preserved with shadow isolation", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const regions = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-lyx-region]")).map((r) => ({
        region: r.getAttribute("data-lyx-region"),
        slot: r.getAttribute("data-lyx-slot"),
      })),
    );

    expect(regions.length).toBeGreaterThan(0);
    for (const r of regions) {
      expect(r.region).toBeTruthy();
      expect(r.slot).toBeTruthy();
    }
  });
});
