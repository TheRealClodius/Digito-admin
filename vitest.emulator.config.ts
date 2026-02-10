import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest config for Firestore emulator tests.
 * Run with: npx vitest run --config vitest.emulator.config.ts
 * Requires: firebase emulators:start --only firestore
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/firestore-rules.test.ts"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
