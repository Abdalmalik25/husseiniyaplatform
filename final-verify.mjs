import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function verifyFinal() {
  try {
    // Check key tables have GlobalId
    const tables = ['users', 'tenants', 'accounts', 'transactions', 'sales_invoices', 'purchase_invoices', 'journal_entries'];
    
    for (const table of tables) {
      const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND column_name IN ('GlobalId', 'serverVersion', 'lastSyncAt', 'conflictState', 'aggregateId', 'currencyId', 'exchangeRate', 'baseAmount')`;
      console.log(`${table}: ${cols.map(c => c.column_name).join(', ') || 'NONE'}`);
    }
    
    // Check new tables
    const newTables = ['biometric_templates', 'translations', 'sync_metadata', 'custom_field_defs', 'custom_field_values'];
    for (const table of newTables) {
      try {
        const count = await sql`SELECT COUNT(*) as c FROM ${sql(table)}`;
        console.log(`${table}: ${count[0]?.c || 0} rows`);
      } catch (e) {
        console.log(`${table}: NOT FOUND`);
      }
    }
    
    // Check constraints
    const constraints = await sql`SELECT conname FROM pg_constraint WHERE contype = 'c' AND conname LIKE 'chk_%'`;
    console.log(`\nCHECK constraints: ${constraints.length}`);
    
    // Check indexes
    const indexes = await sql`SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' AND tablename IN ('transactions', 'accounts', 'sales_invoices', 'purchase_invoices')`;
    console.log(`Indexes on key tables: ${indexes.length}`);
    
    // Check FK to currencies
    const fks = await sql`SELECT tc.table_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'currencyId'`;
    console.log(`FK to currencies: ${fks.length} tables`);
    
    console.log('\n=== VERIFICATION COMPLETE ===');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

verifyFinal();