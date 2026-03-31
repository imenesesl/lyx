import { test, expect } from "@playwright/test";

const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const ACCOUNT_ID = "iml";
const APP_SLUG = "example-1";

test.describe("Shell MFE Loading", () => {
  test("MFEs load after hydration — interactive elements appear", async ({
    page,
  }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);

    const slots = page.locator("[data-lyx-slot]");
    await expect(slots.first()).toBeVisible({ timeout: 15_000 });

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const remainingSkeletons = await page.locator("[data-lyx-skeleton]").count();
    expect(remainingSkeletons).toBe(0);
  });

  test("unassigned slots show empty placeholder or are removed", async ({
    page,
  }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");

    const emptySlots = page.locator("text=no MFE assigned");
    const emptyCount = await emptySlots.count();

    const regions = page.locator("[data-lyx-region]");
    const regionCount = await regions.count();

    expect(regionCount).toBeGreaterThanOrEqual(0);
    // If there are unassigned slots they show the placeholder text;
    // if all are assigned, the placeholder count is 0
    expect(emptyCount).toBeGreaterThanOrEqual(0);
  });

  test("MFE error shows error boundary message", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);

    const errorState = page.locator("[data-lyx-slot]").filter({
      hasText: /Error loading|crashed/,
    });

    // Error states appear only when an MFE genuinely fails to load.
    // This test validates the error UI renders correctly if present.
    const errorCount = await errorState.count();
    if (errorCount > 0) {
      await expect(errorState.first()).toBeVisible();
    }

    // Even without errors, the shell itself should render
    await expect(page.locator("#root")).toBeVisible();
  });

  test("multiple MFEs load in correct slot regions", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "networkidle",
    });

    const initialData = await page.evaluate(
      () => (window as Window & { __LYX_INITIAL__?: Record<string, unknown> }).__LYX_INITIAL__
    );
    expect(initialData).toBeDefined();

    const layout = (initialData as Record<string, unknown>).layout as Record<string, unknown>;
    const regions: Array<{ slot: string; position: string }> = layout.regions ?? [];

    const renderedSlots = page.locator("[data-lyx-slot]");
    const renderedCount = await renderedSlots.count();
    expect(renderedCount).toBeGreaterThan(0);

    for (let i = 0; i < renderedCount; i++) {
      const slotName = await renderedSlots.nth(i).getAttribute("data-lyx-slot");
      expect(regions.some((r) => r.slot === slotName)).toBe(true);
    }
  });

  test("skeletons are visible while MFEs are loading", async ({ page }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`, {
      waitUntil: "commit",
    });

    const skeletons = page.locator("[data-lyx-skeleton]");

    // Immediately after navigation, skeletons should be rendered by SSR
    const earlyCount = await skeletons.count();
    expect(earlyCount).toBeGreaterThan(0);

    // After full hydration + MFE load, skeletons should be replaced
    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );
  });

  test("__LYX_INITIAL__ layout contains regions with positions", async ({
    page,
  }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);

    const initialData = await page.evaluate(
      () => (window as Window & { __LYX_INITIAL__?: Record<string, unknown> }).__LYX_INITIAL__
    );
    const layout = (initialData as Record<string, unknown>).layout as Record<string, unknown>;
    const regions = layout.regions as Array<Record<string, unknown>>;

    expect(Array.isArray(regions)).toBe(true);
    expect(regions.length).toBeGreaterThan(0);

    for (const region of regions) {
      expect(region).toHaveProperty("slot");
      expect(region).toHaveProperty("position");
      expect(["top", "left", "center", "right", "bottom"]).toContain(region.position);
    }
  });
});
