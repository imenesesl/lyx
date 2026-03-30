import { test, expect } from "@playwright/test";

const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const ACCOUNT_ID = "iml";
const APP_SLUG = "example-1";

test.describe("Shell API Proxy", () => {
  test.describe("Runtime API", () => {
    test("/api/runtime/:accountId/:slug/layout returns layout JSON", async ({
      request,
    }) => {
      const res = await request.get(
        `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      );
      expect(res.status()).toBe(200);

      const contentType = res.headers()["content-type"] ?? "";
      expect(contentType).toContain("application/json");

      const body = await res.json();
      expect(body).toHaveProperty("regions");
      expect(Array.isArray(body.regions)).toBe(true);
    });

    test("layout response includes assignedSlots array", async ({
      request,
    }) => {
      const res = await request.get(
        `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      );
      const body = await res.json();
      expect(body).toHaveProperty("assignedSlots");
      expect(Array.isArray(body.assignedSlots)).toBe(true);
    });

    test("/api/runtime/:accountId/:slug/mfes/slot/:slot returns MFE entry or 404", async ({
      request,
    }) => {
      const layoutRes = await request.get(
        `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      );
      const layout = await layoutRes.json();

      const assignedSlots: string[] = layout.assignedSlots ?? [];

      if (assignedSlots.length > 0) {
        const slot = assignedSlots[0];
        const res = await request.get(
          `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/mfes/slot/${slot}`,
        );
        expect(res.status()).toBe(200);

        const entry = await res.json();
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("remoteEntry");
      } else {
        const res = await request.get(
          `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/mfes/slot/main`,
        );
        expect([200, 404]).toContain(res.status());
      }
    });

    test("runtime API has short-lived cache headers", async ({ request }) => {
      const res = await request.get(
        `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      );
      const cacheControl = res.headers()["cache-control"] ?? "";
      expect(cacheControl).toContain("max-age=");
      expect(cacheControl).toContain("stale-while-revalidate");
    });

    test("non-runtime API has no-cache headers", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/api/health`);
      if (res.status() === 200) {
        const cacheControl = res.headers()["cache-control"] ?? "";
        expect(cacheControl).toContain("no-cache");
      }
    });
  });

  test.describe("Storage Proxy", () => {
    test("/storage/* proxies correctly and sets content-type", async ({
      request,
    }) => {
      const layoutRes = await request.get(
        `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/layout`,
      );
      if (layoutRes.status() !== 200) {
        test.skip();
        return;
      }

      const layout = await layoutRes.json();
      const assigned: string[] = layout.assignedSlots ?? [];
      if (assigned.length === 0) {
        test.skip();
        return;
      }

      const mfeRes = await request.get(
        `${SHELL_URL}/api/runtime/${ACCOUNT_ID}/${APP_SLUG}/mfes/slot/${assigned[0]}`,
      );
      if (mfeRes.status() !== 200) {
        test.skip();
        return;
      }

      const entry = await mfeRes.json();
      const remoteEntry: string = entry.remoteEntry;

      if (remoteEntry.startsWith("/storage/")) {
        const storageRes = await request.get(`${SHELL_URL}${remoteEntry}`);
        expect(storageRes.status()).toBe(200);

        const ct = storageRes.headers()["content-type"] ?? "";
        expect(ct).toContain("javascript");
      }
    });

    test("storage 404 for nonexistent bundle", async ({ request }) => {
      const res = await request.get(
        `${SHELL_URL}/storage/nonexistent-mfe/0.0.0/remoteEntry.js`,
      );
      expect([404, 502]).toContain(res.status());
    });
  });

  test.describe("Health", () => {
    test("/health returns JSON with ok status", async ({ request }) => {
      const res = await request.get(`${SHELL_URL}/health`);
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.service).toBe("lyx-ssr");
    });
  });
});
