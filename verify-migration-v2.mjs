import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function verifyMigration() {
  console.log('=== Verifying Migration ===\n');
  
  // Check new tables exist
  const newTables = [
    'biometric_templates',
    'translations', 
    'sync_metadata',
    'custom_field_defs',
    'custom_field_values'
  ];
  
  for (const table of newTables) {
    try {
      const result = await sql.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✓ ${table}: ${result.rows[0].count} rows`);
    } catch (e) {
      console.log(`✗ ${table}: ERROR - ${e.message}`);
    }
  }
  
  // Check GlobalId columns on key tables
  const keyTables = ['users', 'tenants', 'accounts', 'transactions', 'sales_invoices', 'purchase_invoices', 'journal_entries'];
  
  console.log('\n=== Checking GlobalId columns ===');
  for (const table of keyTables) {
    try {
      const result = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'GlobalId'`, [table]);
      if (result.rows.length > 0) {
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
      const result = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'serverVersion'`, [table]);
      if (result.rows.length > 0) {
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
    const result = await sql.query(`SELECT conname FROM pg_constraint WHERE contype = 'c' AND conname LIKE 'chk_%'`);
    console.log(`Total CHECK constraints: ${result.rows.length}`);
    for (const c of result.rows.slice(0, 20)) {
      console.log(`  - ${c.conname}`);
    }
    if (result.rows.length > 20) console.log(`  ... and ${result.rows.length - 20} more`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  // Check indexes
  console.log('\n=== Checking key indexes ===');
  try {
    const result = await sql.query(`SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' AND tablename IN ('transactions', 'accounts', 'sales_invoices', 'purchase_invoices', 'audit_logs', 'activity_logs')`);
    console.log(`Total indexes: ${result.rows.length}`);
    for (const idx of result.rows) {
      console.log(`  - ${idx.indexname}`);
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  // Check foreign keys to currencies
  console.log('\n=== Checking FK to currencies ===');
  try {
    const result = await sql.query(`
      SELECT tc.table_name, kcu.column_name 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND kcu.column_name = 'currencyId'
      AND tc.table_name IN ('transactions', 'opening_balances', 'budgets', 'sales_invoices', 'purchase_invoices', 'payments', 'orders', 'customers', 'suppliers', 'employees', 'payroll_runs', 'payroll_items', 'projects', 'pos_orders', 'pos_sessions', 'procurements', 'sales_reps', 'journal_entries', 'scheduled_journal_entries', 'billing_invoices', 'payment_history', 'tenant_subscriptions')
    `);
    console.log(`FK to currencies: ${result.rows.length}`);
    for (const fk of result.rows) {
      console.log(`  - ${fk.table_name}.${fk.column_name}`);
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  console.log('\n=== Verification Complete ===');
  process.exit(0);
}

verifyMigration().catch(console.error);