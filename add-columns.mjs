import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

const tablesWithGlobalId = [
  'users', 'tenants', 'accounts', 'transactions', 'sales_invoices', 
  'purchase_invoices', 'journal_entries', 'branches', 'budgets', 'categories',
  'currencies', 'customers', 'departments', 'devices', 'documents', 'employees',
  'exchange_rates', 'feature_flags', 'file_uploads', 'inventory_movements',
  'login_attempts', 'notifications', 'opening_balances', 'orders', 'payment_history',
  'payments', 'payroll_items', 'payroll_runs', 'permissions', 'pos_orders',
  'pos_sessions', 'procurement_approvals', 'procurements', 'products', 'project_members',
  'project_tasks', 'projects', 'quality_inspections', 'roles', 'sales_invoices',
  'settings', 'stock_adjustments', 'subscription_plans', 'suppliers', 'team_invitations',
  'tenant_subscriptions', 'tickets', 'units', 'user_branch_permissions', 'user_roles',
  'webhook_deliveries', 'webhooks', 'work_sites', 'warehouse_transfers', 'warehouses',
  'work_sites'
];

async function addGlobalIdAndSyncColumns() {
  console.log('Adding GlobalId and sync columns to tables...\n');
  
  for (const table of tablesWithGlobalId) {
    try {
      // Add GlobalId column
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL`);
      
      // Add sync columns
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "serverVersion" integer DEFAULT 1 NOT NULL`);
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamp`);
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "conflictState" varchar(20) DEFAULT 'none'`);
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "aggregateId" uuid`);
      
      console.log(`✓ ${table}`);
    } catch (e) {
      console.log(`✗ ${table}: ${e.message}`);
    }
  }
  
  // Add currencyId and financial columns to specific tables
  const currencyTables = [
    'transactions', 'opening_balances', 'budgets', 'sales_invoices', 'purchase_invoices',
    'payments', 'orders', 'customers', 'suppliers', 'employees', 'payroll_runs',
    'payroll_items', 'projects', 'pos_orders', 'pos_sessions', 'procurements',
    'sales_reps', 'journal_entries', 'scheduled_journal_entries', 'billing_invoices',
    'payment_history', 'tenant_subscriptions'
  ];
  
  console.log('\nAdding currency and financial columns...\n');
  
  for (const table of currencyTables) {
    try {
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "currencyId" integer`);
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "exchangeRate" numeric(18, 8) DEFAULT '1' NOT NULL`);
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "baseAmount" numeric(15, 2) DEFAULT '0' NOT NULL`);
      console.log(`✓ ${table} (currency)`);
    } catch (e) {
      console.log(`✗ ${table} (currency): ${e.message}`);
    }
  }
  
  // Add FK constraints
  console.log('\nAdding FK constraints...\n');
  for (const table of currencyTables) {
    try {
      await sql.unsafe(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_currencyId_fk" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL`);
      console.log(`✓ ${table} FK`);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`⊘ ${table} FK (exists)`);
      } else {
        console.log(`✗ ${table} FK: ${e.message}`);
      }
    }
  }
  
  console.log('\nDone!');
  process.exit(0);
}

addGlobalIdAndSyncColumns().catch(console.error);