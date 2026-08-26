// vitest.setup.ts — runs before every test file.
//
// The repo's DB integration tests are guarded by `it.skipIf(!process.env.DATABASE_URL)`
// (see server/accounting.test.ts), so without a loaded .env they are silently
// skipped instead of executing against the live Neon database. Loading the
// environment here turns those skipped tests into real DB integration tests.
import "dotenv/config";

// Keep the test process on a non-production semantic so fail-closed guards
// (e.g. backup encryption key) behave exactly as they do in the local dev/CI
// environment rather than simulating production.
if (process.env.NODE_ENV === "production") {
  process.env.NODE_ENV = "test";
}
