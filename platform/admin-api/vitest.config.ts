import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
