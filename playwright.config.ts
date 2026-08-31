import { defineConfig } from "@playwright/test";

/**
 * E2E — production-grade guard rails.
 *
 * Assumes the dev server (`pnpm dev`) is already running on localhost:3000
 * (start it separately; Playwright will wait for it).
 *
 * These tests are VALUE-PRESERVING ONLY: they never create, modify or delete
 * business data. Login flows are exercised against client-side Zod validation
 * only (wrong-format input never reaches the server), and every public page is
 * asserted for load + render + key interactive behavior.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    // Use the system Chrome — no browser download needed (CI/offline-safe)
    channel: "chrome",
    trace: "retain-on-failure",
    locale: "ar-YE",
    viewport: { width: 1280, height: 720 },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
