import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // e2e/ belongs to Playwright.
  test: { include: ["src/**/*.test.ts"] },
});
