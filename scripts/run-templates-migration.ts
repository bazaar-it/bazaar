import { sql } from '@neondatabase/serverless';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

async function runTemplatesMigration() {
  const client = sql(process.env.DATABASE_URL!);
  
  try {
    // Check if templates table already exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bazaar-vid_templates'
      ) as exists
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ Templates table already exists!');
      return;
    }
    
    // Read our migration file
    const migrationPath = path.join(__dirname, '../drizzle/migrations/0008_add_templates_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Running templates migration...');
    
    // Split the migration into individual statements and run them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      try {
        await client(statement + ';');
      } catch (error: any) {
        // Skip if it's a column rename error (columns might not exist)
        if (error.code === '42703' && statement.includes('RENAME COLUMN')) {
          console.log(`⚠️  Skipping column rename (column might not exist): ${error.message}`);
        } else {
          throw error;
        }
      }
    }
    
    // Record the migration
    await client`
      INSERT INTO __drizzle_migrations (hash, created_at) 
      VALUES (${'0008_add_templates_table'}, NOW())
      ON CONFLICT (hash) DO NOTHING
    `;
    
    console.log('✅ Templates migration completed successfully!');
    
    // Verify the table was created
    const verifyTable = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bazaar-vid_templates'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Templates table structure:');
    verifyTable.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

runTemplatesMigration().catch(console.error);