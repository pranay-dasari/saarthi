import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,      // 30s per test (network calls)
    hookTimeout: 15000,
    setupFiles: ["./tests/setup.ts"],
    reporters: ["verbose"],
    sequence: {
      concurrent: false,     // run tests in order, not parallel
    },
  },
});
