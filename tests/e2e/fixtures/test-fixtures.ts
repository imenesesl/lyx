import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";
const AUTH_FILE = path.join(__dirname, "..", ".auth", "admin.json");

function readToken(): string {
  const raw = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
  for (const o of raw.origins ?? []) {
    for (const entry of o.localStorage ?? []) {
      if (entry.name === "lyx_token") return entry.value;
    }
  }
  throw new Error("lyx_token not found in storage state — run global setup first");
}

interface TestApp {
  _id: string;
  name: string;
  slug: string;
}

interface TestMfe {
  _id: string;
  name: string;
}

type Fixtures = {
  adminPage: Page;
  apiContext: APIRequestContext;
  testApp: TestApp;
  testMfe: TestMfe;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  apiContext: async ({ playwright }, use) => {
    const token = readToken();
    const ctx = await playwright.request.newContext({
      baseURL: ADMIN_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(ctx);
    await ctx.dispose();
  },

  testApp: async ({ apiContext }, use) => {
    const layoutsRes = await apiContext.get("/api/layouts");
    expect(layoutsRes.ok()).toBe(true);
    const layouts = await layoutsRes.json();
    expect(layouts.length).toBeGreaterThan(0);

    const name = `e2e-app-${Date.now()}`;
    const createRes = await apiContext.post("/api/apps", {
      data: { name, layoutTemplateId: layouts[0]._id },
    });
    expect(createRes.ok()).toBe(true);
    const app: TestApp = await createRes.json();

    await use(app);

    await apiContext.delete(`/api/apps/${app._id}`);
  },

  testMfe: async ({ apiContext }, use) => {
    const name = `e2e-mfe-${Date.now()}`;
    const createRes = await apiContext.post("/api/mfes", {
      data: { name },
    });
    expect(createRes.ok()).toBe(true);
    const mfe: TestMfe = await createRes.json();

    await use(mfe);

    await apiContext.delete(`/api/mfes/${mfe._id}`);
  },
});

export { expect };
