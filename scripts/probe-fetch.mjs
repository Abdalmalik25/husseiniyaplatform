import { config } from "dotenv";
config();
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL || "");
(async () => {
  // Try sql.query(raw, [])
  await sql.query('CREATE TABLE IF NOT EXISTS "_probe_q1" (id int)', []);
  const r1 = await sql`SELECT to_regclass('public."_probe_q1"') AS reg`;
  console.log("after sql.query CREATE:", JSON.stringify(r1[0]?.reg));

  // Try template embedding unsafe
  await sql`${sql.unsafe('CREATE TABLE IF NOT EXISTS "_probe_q2" (id int)')}`;
  const r2 = await sql`SELECT to_regclass('public."_probe_q2"') AS reg`;
  console.log("after template unsafe CREATE:", JSON.stringify(r2[0]?.reg));

  // cleanup
  await sql.query('DROP TABLE IF EXISTS "_probe_q1", "_probe_q2"', []);
  const r3 = await sql`SELECT to_regclass('public."_probe_q1"') AS r1, to_regclass('public."_probe_q2"') AS r2`;
  console.log("after cleanup:", JSON.stringify(r3[0]));
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});