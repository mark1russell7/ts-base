import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // A test of the sample starts the compiler some hundred times.
    testTimeout: 300_000,
  },
});
