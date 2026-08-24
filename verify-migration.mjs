import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function verifyMigration() {
  console.log('=== Verifying Migration ===\n');
  
  // Check new tables exist
  const tables = [
    'biometric_templates',
    'translations', 
    'sync_metadata',
    'custom_field_defs',
    'custom_field_values'
  ];
  
  for (const table of tables) {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
      console.log(`✓ ${table}: ${result[0].count} rows`);
    } catch (e) {
      console.log(`✗ ${table}: ERROR - ${e.message}`);
    }
  }
  
  // Check GlobalId columns on key tables
  const keyTables = ['users', 'tenants', 'accounts', 'transactions', 'sales_invoices', 'purchase_invoices', 'journal_entries'];
  
  console.log('\n=== Checking GlobalId columns ===');
  for (const table of keyTables) {
    try {
      const result = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND column_name = 'GlobalId'`;
      if (result.length > 0) {
        console.log(`✓ ${table}: GlobalId column exists`);
      } else {
        console.log(`✗ ${table}: GlobalId column MISSING`);
      }
    } catch (e) {
      console.log(`✗ ${table}: ERROR - ${e.message}`);
    }
  }
  
  // Check sync columns
  console.log('\n=== Checking sync columns (serverVersion) ===');
  for (const table of keyTables) {
    try {
      const result = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND column_name = 'serverVersion'`;
      if (result.length > 0) {
        console.log(`✓ ${table}: serverVersion column exists`);
      } else {
        console.log(`✗ ${table}: serverVersion column MISSING`);
      }
    } catch (e) {
      console.log(`✗ ${table}: ERROR - ${e.message}`);
    }
  }
  
  // Check CHECK constraints
  console.log('\n=== Checking CHECK constraints ===');
  try {
    const result = await sql`SELECT conname FROM pg_constraint WHERE contype = 'c' AND conname LIKE 'chk_%'`;
    console.log(`Total CHECK constraints: ${result.length}`);
    for (const c of result.slice(0, 20)) {
      console.log(`  - ${c.conname}`);
    }
    if (result.length > 20) console.log(`  ... and ${result.length - 20} more`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  // Check indexes
  console.log('\n=== Checking key indexes ===');
  try {
    const result = await sql`SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' AND tablename IN ('transactions', 'accounts', 'sales_invoices', 'purchase_invoices', 'audit_logs', 'activity_logs')`;
    console.log(`Total indexes: ${result.length}`);
    for (const idx of result) {
      console.log(`  - ${idx.indexname}`);
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  console.log('\n=== Verification Complete ===');
  process.exit(0);
}

verifyMigration().catch(console.error);