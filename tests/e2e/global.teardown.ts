import { test as teardown } from "@playwright/test";

teardown("cleanup", async () => {
  console.log("[teardown] E2E test suite completed");
});
