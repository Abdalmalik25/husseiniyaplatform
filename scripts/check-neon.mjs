import { neon } from "@neondatabase/serverless";

// Try both pooler and direct connections
const urls = [
  "postgresql://neondb_owner:npg_k5rAXbKsB7OF@ep-spring-forest-ay951mtx-pooler.c-5.us-east-2.aws.neon.tech/UANMAXDB?sslmode=require",
  "postgresql://neondb_owner:npg_k5rAXbKsB7OF@ep-spring-forest-ay951mtx.c-5.us-east-2.aws.neon.tech/UANMAXDB?sslmode=require",
];

for (const url of urls) {
  const host = url.split("@")[1].split("/")[0];
  console.log(`\nTrying: ${host}`);
  try {
    const sql = neon(url);
    const result = await sql`SELECT 1 as test`;
    console.log("  Connection OK:", result);
    
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log("  Tables:", tables.map(t => t.table_name).join(", ") || "(none)");
    
    for (const t of tables) {
      const cols = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ${t.table_name} AND table_schema = 'public' ORDER BY ordinal_position`;
      console.log(`\n  --- ${t.table_name} (${cols.length} cols) ---`);
      for (const c of cols) {
        const nullable = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
        const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
        console.log(`    ${c.column_name}: ${c.data_type} ${nullable}${def}`);
      }
    }
    break;
  } catch(e) {
    console.log("  FAILED:", e.cause?.message || e.message);
  }
}
