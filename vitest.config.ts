import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.spec.ts",
    ],
    // Load .env so the DB-backed integration tests (guarded by
    // `!process.env.DATABASE_URL`) actually execute against the live database.
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["server/**/*.ts", "client/src/**/*.ts"],
      exclude: [
        "server/**/*.test.ts",
        "server/**/*.spec.ts",
        "client/src/**/*.test.ts",
        "client/src/**/*.spec.ts",
        "server/_core/index.ts",
        "server/serverless/**",
        "client/src/main.tsx",
        "client/src/components/ui/**",
      ],
      thresholds: {
        // Baseline (measured 2026-09-12, DB-gated tests offline): 39% lines,
        // 37% funcs, 73% branches. Floors grow as coverage improves.
        statements: 35,
        branches: 70,
        functions: 30,
        lines: 35,
      },
    },
  },
});
