import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function checkTables() {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('biometric_templates', 'translations', 'sync_metadata', 'custom_field_defs', 'custom_field_values', 'users', 'tenants', 'accounts', 'transactions', 'sales_invoices', 'purchase_invoices', 'journal_entries')`;
    console.log('Tables found:', tables.map(t => t.table_name));
    
    // Check users table columns
    const usersCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('GlobalId', 'serverVersion', 'lastSyncAt', 'conflictState', 'aggregateId')`;
    console.log('Users new columns:', usersCols.map(c => c.column_name));
    
    // Check tenants table columns
    const tenantsCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND column_name IN ('GlobalId', 'serverVersion', 'lastSyncAt', 'conflictState', 'aggregateId')`;
    console.log('Tenants new columns:', tenantsCols.map(c => c.column_name));
    
    // Check accounts table columns
    const accountsCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' AND column_name IN ('GlobalId', 'serverVersion', 'lastSyncAt', 'conflictState', 'aggregateId')`;
    console.log('Accounts new columns:', accountsCols.map(c => c.column_name));
    
    // Check transactions table columns
    const transCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name IN ('GlobalId', 'serverVersion', 'lastSyncAt', 'conflictState', 'aggregateId', 'currencyId', 'exchangeRate', 'baseAmount')`;
    console.log('Transactions new columns:', transCols.map(c => c.column_name));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkTables();