import { readFileSync } from "fs";
import { Pool } from "@neondatabase/serverless";

// Load .env into process.env (mirrors the runtime environment)
try {
  const envRaw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of envRaw.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch (e) {
  console.warn("[currencies] could not read .env:", e.message);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const sql = readFileSync(new URL("./currencies.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(sql);
  console.log("[currencies] migration applied successfully.");
} catch (e) {
  console.error("[currencies] migration failed:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
