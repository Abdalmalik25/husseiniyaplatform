import { config } from "dotenv";
config();
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL || "");
(async () => {
  await sql.unsafe('DROP TABLE IF EXISTS "_probe2"');
  const core = [
    "settings",
    "accounts",
    "users",
    "transactions",
    "journal_entries",
  ];
  for (const t of core) {
    const cols =
      await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${t} ORDER BY ordinal_position`;
    const names = cols.map(c => c.column_name);
    const hasG = names.includes("GlobalId");
    const hasSync = [
      "serverVersion",
      "lastSyncAt",
      "conflictState",
      "aggregateId",
    ].every(x => names.includes(x));
    const hasDeleted = names.includes("deletedAt");
    console.log(
      `${t}: GlobalId=${hasG} sync4=${hasSync} deletedAt=${hasDeleted} (${names.length} cols)`
    );
  }
  const all =
    await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE 'pg_%' ORDER BY table_name`;
  console.log("PUBLIC TABLES:", all.map(t => t.table_name).join(", "));
})().catch(e => {
  console.error("ERR:", e.message);
  process.exit(1);
});
