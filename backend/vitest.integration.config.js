import { defineConfig } from "vitest/config";

// Integration tests run against a real PostgreSQL database.
// DATABASE_URL must point at a throwaway database: tables are wiped.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.js"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
