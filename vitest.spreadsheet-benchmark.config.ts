import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live/spreadsheet-benchmark.local.test.ts"],
    testTimeout: 1_140_000,
  },
});
