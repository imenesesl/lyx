import { defineConfig, devices } from "@playwright/test";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:4001";
const SHELL_URL = process.env.SHELL_URL ?? "http://localhost:4002";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "off" : "on-first-retry",
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: "admin-chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: ADMIN_URL,
        storageState: "tests/e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /admin\/.+\.spec\.ts/,
    },
    {
      name: "shell-chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: SHELL_URL,
      },
      dependencies: ["setup"],
      testMatch: /shell\/.+\.spec\.ts/,
    },
    {
      name: "admin-mobile",
      use: {
        ...devices["iPhone 14"],
        baseURL: ADMIN_URL,
        storageState: "tests/e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /admin\/.*responsive.*\.spec\.ts/,
    },
  ],
});
