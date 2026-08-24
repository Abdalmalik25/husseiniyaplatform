import { readFileSync } from "fs";
import { Pool } from "@neondatabase/serverless";

try {
  const envRaw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of envRaw.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch (e) {
  console.warn("[offers] could not read .env:", e.message);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const sql = readFileSync(new URL("./offers.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(sql);
  console.log("[offers] migration applied successfully.");
} catch (e) {
  console.error("[offers] migration failed:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
