import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function applyMigration() {
  const fs = await import('fs');
  const migrationSQL = fs.readFileSync('drizzle/0003_silly_scalphunter.sql', 'utf8');
  
  // Split by statement-breakpoint
  const statements = migrationSQL.split('--> statement-breakpoint\n').map(s => s.trim()).filter(s => s.length > 0);
  
  console.log(`Total statements: ${statements.length}`);
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt.trim()) continue;
    
    try {
      // Use sql.unsafe for DDL statements
      await sql.unsafe(stmt);
      success++;
      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${statements.length} (✓${success} ✗${failed} ⊘${skipped})`);
      }
    } catch (error) {
      // Ignore duplicate index/key errors
      if (error.message && (error.message.includes('already exists') || error.message.includes('42P07') || error.message.includes('23505'))) {
        skipped++;
        continue;
      }
      // Ignore "column already exists" errors
      if (error.message && error.message.includes('already exists')) {
        skipped++;
        continue;
      }
      // Ignore "constraint already exists" errors
      if (error.message && error.message.includes('constraint') && error.message.includes('already exists')) {
        skipped++;
        continue;
      }
      failed++;
      console.error(`FAILED [${i + 1}]: ${error.message}`);
      console.error('Statement:', stmt.substring(0, 300));
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Total: ${success + failed + skipped}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

applyMigration().catch(console.error);