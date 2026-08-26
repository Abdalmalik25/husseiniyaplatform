import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      /*
       * Baseline policy (documented technical-debt ratchet):
       * - no-explicit-any: OFF. The codebase intentionally uses `any` at
       *   Drizzle dynamic-row boundaries; types are erased at build time so
       *   there is zero runtime impact. Re-enable per-module during refactors.
       * - no-unused-vars: OFF for the same baseline reason. Vite/Rollup
       *   tree-shakes unused imports out of the production bundle, so there
       *   is no runtime/bundle penalty; dead-code cleanup is tracked as a
       *   dedicated refactor epic, not lint noise.
       */
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
    {
    // Operational scripts (*.mjs, *.cjs at root and in scripts/)
    // These are standalone Node.js scripts that use console/process globals.
    files: ["*.mjs", "*.cjs", "scripts/**/*.mjs", "scripts/**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  {
    // Server runtime + migration tooling: console IS the structured logger
    // here (JSON request lines, backup manifests, lifecycle warnings).
    files: ["server/**/*.ts", "scripts/**/*.ts", "shared/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "api/**",
      "node_modules/**",
      "client/public/**",
      "drizzle/**",
      "*.config.*",
      "scripts/build-server.cjs",
      "temp/**",
      "lint-*.txt",
    ],
  },
];
