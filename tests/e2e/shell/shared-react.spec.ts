import { test, expect } from "@playwright/test";

const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const ACCOUNT_ID = "iml";
const APP_SLUG = "example-1";

/**
 * These tests detect the "duplicate React instances" bug where MFEs bundle
 * their own React instead of using the host's shared copy. The symptoms are:
 *
 *   - TypeError: Cannot read properties of null (reading 'useState')
 *   - React error #418 (hydration mismatch from mismatched React trees)
 *   - [lyx] MFE crashed messages in console
 *
 * Root cause: Module Federation shared module negotiation failure between
 * host (Shell) and remotes (MFEs). The host must register React in the
 * shared scope via both init() and registerShared() at runtime.
 */
test.describe("Shared React — no duplicate instances", () => {
  test("no useState errors in console when MFEs load", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("useState") ||
        text.includes("useEffect") ||
        text.includes("useRef") ||
        text.includes("useContext")
      ) {
        errors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      if (err.message.includes("useState") || err.message.includes("null")) {
        errors.push(err.message);
      }
    });

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    expect(errors).toEqual([]);
  });

  test("no 'MFE crashed' messages in console", async ({ page }) => {
    const crashes: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[lyx] MFE crashed")) {
        crashes.push(text);
      }
    });

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    expect(crashes).toEqual([]);
  });

  test("no React error #418 (hydration mismatch from dual React) after MFE load", async ({
    page,
  }) => {
    const reactErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("Minified React error #418") && !text.includes("Hydration recovery")) {
        reactErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      if (err.message.includes("#418")) {
        reactErrors.push(err.message);
      }
    });

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    expect(reactErrors).toEqual([]);
  });

  test("MFE content is actually visible (not stuck on skeleton or error)", async ({
    page,
  }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);

    await page.waitForFunction(
      () => document.querySelectorAll("[data-lyx-skeleton]").length === 0,
      { timeout: 20_000 },
    );

    const crashedSlots = page.locator("text=crashed");
    expect(await crashedSlots.count()).toBe(0);

    const errorSlots = page.locator("[data-lyx-slot]").filter({
      hasText: /Error loading.*remoteEntry/,
    });
    expect(await errorSlots.count()).toBe(0);

    const useStateErrors = page.locator("[data-lyx-slot]").filter({
      hasText: /Error loading.*useState/,
    });
    expect(await useStateErrors.count()).toBe(0);
  });

  test("all assigned MFE slots render actual component content", async ({
    page,
  }) => {
    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const initialData = await page.evaluate(
      () => (window as Window & { __LYX_INITIAL__?: unknown }).__LYX_INITIAL__,
    );
    const regions: Array<{ slot: string; mfe?: string }> =
      initialData?.layout?.regions ?? [];

    for (const region of regions) {
      const slotEl = page.locator(`[data-lyx-slot="${region.slot}"]`);
      const count = await slotEl.count();
      if (count === 0) continue;

      const text = await slotEl.first().textContent();

      if (region.mfe) {
        expect(text).not.toContain("crashed");
        expect(text).not.toContain("Error loading");
        expect(text).not.toContain("useState");
      }
    }
  });

  test("MFE remoteEntry.js files load with correct MIME type", async ({
    page,
  }) => {
    const mimeErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("MIME type") && text.includes("text/html")) {
        mimeErrors.push(text);
      }
    });

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    expect(mimeErrors).toEqual([]);
  });

  test("no 'Failed to fetch dynamically imported module' errors", async ({
    page,
  }) => {
    const fetchErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("Failed to fetch dynamically imported module")) {
        fetchErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      if (err.message.includes("Failed to fetch dynamically imported module")) {
        fetchErrors.push(err.message);
      }
    });

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    expect(fetchErrors).toEqual([]);
  });

  test("no $m undefined reference error (shared module build bug)", async ({
    page,
  }) => {
    const buildErrors: string[] = [];

    page.on("pageerror", (err) => {
      if (err.message.includes("$m is not defined")) {
        buildErrors.push(err.message);
      }
    });

    page.on("console", (msg) => {
      if (msg.text().includes("$m is not defined")) {
        buildErrors.push(msg.text());
      }
    });

    await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    expect(buildErrors).toEqual([]);
  });
});
