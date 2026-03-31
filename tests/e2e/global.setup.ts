import { test as setup, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";
const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";
const AUTH_FILE = path.join(__dirname, ".auth", "admin.json");

const TEST_USER = {
  email: "e2e@test.com",
  password: "Test1234!",
  name: "E2E Tester",
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function retryRequest(
  request: APIRequestContext,
  method: "get" | "post",
  url: string,
  opts?: Record<string, unknown>,
  retries = 4
) {
  for (let i = 0; i < retries; i++) {
    const res =
      method === "get"
        ? await request.get(url, opts)
        : await request.post(url, opts);
    if (res.status() !== 429) return res;
    await wait(2000 * (i + 1));
  }
  return method === "get"
    ? await request.get(url, opts)
    : await request.post(url, opts);
}

setup("health check", async ({ request }) => {
  const check = async (name: string, url: string) => {
    try {
      const res = await request.get(url, { timeout: 10_000 });
      if (!res.ok()) {
        throw new Error(`${name} responded with ${res.status()}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `${name} is unreachable at ${url} — cannot run E2E tests. ${msg}`
      );
    }
  };

  await check("Admin API", `${ADMIN_URL}/api/health`);
  await check("Shell", `${SHELL_URL}/health`);
});

setup("authenticate", async ({ page }) => {
  let token: string;

  const registerRes = await retryRequest(
    page.request,
    "post",
    `${ADMIN_URL}/api/auth/register`,
    { data: TEST_USER }
  );

  if (registerRes.ok()) {
    const body = await registerRes.json();
    token = body.token;
  } else if (registerRes.status() === 409) {
    const loginRes = await retryRequest(
      page.request,
      "post",
      `${ADMIN_URL}/api/auth/login`,
      { data: { email: TEST_USER.email, password: TEST_USER.password } }
    );
    expect(loginRes.ok()).toBe(true);
    const body = await loginRes.json();
    token = body.token;
  } else {
    throw new Error(
      `Registration failed with status ${registerRes.status()}: ${await registerRes.text()}`
    );
  }

  await page.goto(`${ADMIN_URL}/admin`);
  await page.evaluate((t: string) => localStorage.setItem("lyx_token", t), token);

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  const meRes = await retryRequest(
    page.request,
    "get",
    `${ADMIN_URL}/api/auth/me`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect(meRes.ok()).toBe(true);
});
