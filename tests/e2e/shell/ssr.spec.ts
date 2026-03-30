import { test, expect } from "@playwright/test";

const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const ACCOUNT_ID = "iml";
const APP_SLUG = "example-1";

test.describe("Shell SSR", () => {
  test.describe("Health", () => {
    test("health endpoint returns 200 with JSON status", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/health`);
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("status", "ok");
      expect(body).toHaveProperty("service", "lyx-ssr");
    });
  });

  test.describe("SSR rendering", () => {
    test("renders valid HTML for a known app", async ({ page }) => {
      await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
      await expect(page).toHaveTitle(/Lyx/);
      expect(await page.content()).toContain("<!DOCTYPE html>");
    });

    test("includes __LYX_INITIAL__ script with layout data", async ({
      page,
    }) => {
      await page.goto(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);

      const initialData = await page.evaluate(() => (window as any).__LYX_INITIAL__);
      expect(initialData).toBeDefined();
      expect(initialData).toHaveProperty("layout");
      expect(initialData).toHaveProperty("registryBase");
      expect(initialData).toHaveProperty("slug", APP_SLUG);
      expect(initialData.registryBase).toContain(`/api/runtime/${ACCOUNT_ID}/${APP_SLUG}`);
    });

    test("renders skeleton placeholders during SSR", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
      expect(res.status()).toBe(200);

      const html = await res.text();
      expect(html).toContain("data-lyx-skeleton");
      expect(html).toContain("lyx-skeleton-line");
      expect(html).toContain("aria-busy=\"true\"");
    });

    test("HTML includes title with app slug", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
      const html = await res.text();

      expect(html).toContain(`<title>Lyx`);
      expect(html).toContain(APP_SLUG);
    });

    test("HTML includes client JS bundles from /_assets/", async ({
      request,
    }) => {
      const res = await request.get(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
      const html = await res.text();

      expect(html).toMatch(/<script type="module" src="\/_assets\/.+\.js"><\/script>/);
    });
  });

  test.describe("Error handling", () => {
    test("unknown app returns 404 error page", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/${ACCOUNT_ID}/nonexistent-app-xyz`);
      expect(res.status()).toBe(404);

      const html = await res.text();
      expect(html).toContain("not found");
    });

    test("invalid accountId returns error or 404", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/invalid-account-999/invalid-slug-999`);
      const status = res.status();
      expect([404, 500]).toContain(status);
    });

    test("reserved paths do not match SSR route", async ({ request }) => {
      const paths = ["health", "api", "storage", "_assets", "admin"];
      for (const reserved of paths) {
        const res = await request.get(`${SHELL_URL}/${reserved}/test`);
        expect(res.status()).not.toBe(200);
      }
    });
  });

  test.describe("Cache headers", () => {
    test("SSR HTML response has no-cache headers", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
      expect(res.status()).toBe(200);

      const cacheControl = res.headers()["cache-control"] ?? "";
      expect(cacheControl).toContain("no-cache");
    });

    test("static assets have immutable cache headers", async ({
      page,
      request,
    }) => {
      const res = await request.get(`${SHELL_URL}/${ACCOUNT_ID}/${APP_SLUG}`);
      const html = await res.text();

      const jsMatch = html.match(/\/_assets\/[^\s"]+\.js/);
      if (!jsMatch) {
        test.skip();
        return;
      }

      const assetRes = await request.get(`${SHELL_URL}${jsMatch[0]}`);
      if (assetRes.status() === 200) {
        const assetCache = assetRes.headers()["cache-control"] ?? "";
        expect(assetCache).toContain("immutable");
      }
    });
  });
});
