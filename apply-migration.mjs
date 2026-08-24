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
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt.trim()) continue;
    
    try {
      await sql.unsafe(stmt);
      if (i % 50 === 0) {
        console.log(`Applied statement ${i + 1}/${statements.length}`);
      }
    } catch (error) {
      // Ignore duplicate index/key errors
      if (error.message && (error.message.includes('already exists') || error.message.includes('42P07') || error.message.includes('23505'))) {
        console.log(`Skipped (already exists): statement ${i + 1}`);
        continue;
      }
      console.error(`Error at statement ${i + 1}:`, error.message);
      console.error('Statement:', stmt.substring(0, 200));
      // Don't exit, continue with next statement
    }
  }
  
  console.log('Migration completed!');
  process.exit(0);
}

applyMigration().catch(console.error);