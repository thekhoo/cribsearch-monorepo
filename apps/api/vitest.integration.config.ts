import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/__tests__/integration/setup.ts"],
    fileParallelism: false, // serialize: all suites share one Postgres DB + TRUNCATE
  },
});
