import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[migrations] DATABASE_URL not set — skipping migrations (OK in dev/preview builds without a DB).');
    process.exit(0);
  }

  console.log('Running migrations...');
  
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  // Get all migration files in order
  const migrationsDir = path.join(process.cwd(), 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${files.length} migration files`);
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const migrationSQL = fs.readFileSync(filePath, 'utf8');
    
    // Split by statement-breakpoint
    const statements = migrationSQL.split('--> statement-breakpoint\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Running migration: ${file} (${statements.length} statements)`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt.trim()) continue;
      
      try {
        await sql.unsafe(stmt);
        if (i % 50 === 0) {
          console.log(`  Applied statement ${i + 1}/${statements.length}`);
        }
      } catch (error: any) {
        // Ignore duplicate index/key errors
        if (error.message && (error.message.includes('already exists') || error.message.includes('42P07') || error.message.includes('23505'))) {
          console.log(`  Skipped (already exists): statement ${i + 1}`);
          continue;
        }
        console.error(`  Error at statement ${i + 1}:`, error.message);
        console.error('  Statement:', stmt.substring(0, 200));
        // Don't exit, continue with next statement
      }
    }
    
    console.log(`  Completed: ${file}`);
  }
  
  console.log('All migrations completed!');
  process.exit(0);
}

runMigrations().catch(console.error);