/**
 * Server bundle builder using esbuild Node.js API.
 * Replaces the `esbuild` CLI call in the build script so that the
 * `--alias` flag works reliably across platforms (the CLI `--alias:@shared`
 * syntax is broken on Windows).
 */
const { build } = require("esbuild");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const apiDir = path.join(projectRoot, "api");

// Ensure the output directory exists
fs.mkdirSync(apiDir, { recursive: true });

build({
  entryPoints: [path.join(projectRoot, "server", "prod-entry.ts")],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outfile: path.join(apiDir, "index.mjs"),
  alias: {
    "@shared": path.join(projectRoot, "shared"),
  },
  logLevel: "info",
  sourcemap: false,
})
  .then(() => {
    console.log("✓ Server bundle built: api/index.mjs");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Server bundle failed:", err);
    process.exit(1);
  });
