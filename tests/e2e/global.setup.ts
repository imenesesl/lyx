import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";
const AUTH_FILE = path.join(__dirname, ".auth", "admin.json");

const TEST_USER = {
  email: "e2e@test.com",
  password: "Test1234!",
  name: "E2E Tester",
};

setup("authenticate", async ({ page }) => {
  let token: string;

  const registerRes = await page.request.post(`${ADMIN_URL}/api/auth/register`, {
    data: TEST_USER,
  });

  if (registerRes.ok()) {
    const body = await registerRes.json();
    token = body.token;
  } else if (registerRes.status() === 409) {
    const loginRes = await page.request.post(`${ADMIN_URL}/api/auth/login`, {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    });
    expect(loginRes.ok()).toBe(true);
    const body = await loginRes.json();
    token = body.token;
  } else {
    throw new Error(
      `Registration failed with status ${registerRes.status()}: ${await registerRes.text()}`
    );
  }

  await page.goto(ADMIN_URL);
  await page.evaluate((t) => localStorage.setItem("lyx_token", t), token);

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  const meRes = await page.request.get(`${ADMIN_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(meRes.ok()).toBe(true);
});
