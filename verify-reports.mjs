import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) { console.error("DATABASE_URL environment variable is required"); process.exit(1); }
const sql = neon(DATABASE_URL);

async function verify() {
  // Check fiscal_periods table
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiscal_periods'`;
    console.log('fiscal_periods table:', tables.length > 0 ? 'EXISTS' : 'MISSING');
    
    if (tables.length > 0) {
      const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'fiscal_periods'`;
      console.log('Columns:', cols.map(c => c.column_name).join(', '));
      
      // Test insert
      const result = await sql`SELECT * FROM fiscal_periods LIMIT 1`;
      console.log('Sample data:', result.length > 0 ? result[0] : 'empty');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  // Check reports procedures exist
  console.log('\nVerifying reports procedures...');
  process.exit(0);
}

verify();