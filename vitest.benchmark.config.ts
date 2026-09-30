import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live/external-markdown-benchmark-001.live.test.ts"],
    testTimeout: 1_140_000,
  },
});
