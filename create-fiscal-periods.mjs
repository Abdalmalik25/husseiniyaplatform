import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }
const sql = neon(DATABASE_URL);

async function createFiscalPeriodsTable() {
  console.log('Creating fiscal_periods table...');
  
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "fiscal_periods" (
        "id" serial PRIMARY KEY NOT NULL,
        "GlobalId" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "tenantId" integer NOT NULL,
        "name" varchar(50) NOT NULL,
        "label" varchar(100),
        "startDate" timestamp NOT NULL,
        "endDate" timestamp NOT NULL,
        "status" varchar(20) DEFAULT 'open' NOT NULL,
        "closedAt" timestamp,
        "closedById" integer,
        "reopenedAt" timestamp,
        "reopenedById" integer,
        "reopenReason" varchar(255),
        "closingEntryId" integer,
        "retainedEarningsAccountId" integer,
        "notes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL,
        "serverVersion" integer DEFAULT 1 NOT NULL,
        "lastSyncAt" timestamp,
        "conflictState" varchar(20) DEFAULT 'none',
        "aggregateId" uuid
      );
    `);
    console.log('✓ Table created');
    
    // Add indexes
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_tenant" ON "fiscal_periods" USING btree ("tenantId");`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_status" ON "fiscal_periods" USING btree ("status");`);
    await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_periods_tenant_name_unique" ON "fiscal_periods" ("tenantId", "name");`);
    
    // Add check constraints
    await sql.unsafe(`ALTER TABLE "fiscal_periods" ADD CONSTRAINT IF NOT EXISTS "chk_fiscal_period_dates" CHECK ("startDate" <= "endDate");`);
    await sql.unsafe(`ALTER TABLE "fiscal_periods" ADD CONSTRAINT IF NOT EXISTS "chk_fiscal_period_tenant_not_null" CHECK ("tenantId" IS NOT NULL);`);
    
    console.log('✓ Indexes and constraints added');
    
    // Verify
    const result = await sql`SELECT * FROM fiscal_periods LIMIT 1`;
    console.log('\nVerification:', result.length >= 0 ? 'SUCCESS - Table exists' : 'FAILED');
    console.log('Columns:', result.length > 0 ? Object.keys(result[0]).join(', ') : 'empty');
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

createFiscalPeriodsTable();