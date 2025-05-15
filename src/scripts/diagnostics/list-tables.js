// src/scripts/diagnostics/list-tables.js
/**
 * Lists all tables in the connected database
 * Helps diagnose schema migration and structure issues
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

// Get database connection string from .env.local
const connectionString = process.env.DATABASE_URL;

async function listDatabaseTables() {
  console.log('\n========= DATABASE SCHEMA DIAGNOSTICS =========\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local file');
    return;
  }

  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // List all tables in the public schema
    console.log('📋 Fetching all tables from database...\n');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows;
    console.log(`Found ${tables.length} tables in database\n`);
    
    if (tables.length === 0) {
      console.log('No tables found. The database may be empty or misconfigured.');
      return;
    }
    
    // Display table list
    console.log('📊 Table List:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name}`);
    });
    console.log('\n');
    
    // Find component-related tables
    const componentTables = tables.filter(t => 
      t.table_name.toLowerCase().includes('component') || 
      t.table_name.toLowerCase().includes('remotion')
    );
    
    if (componentTables.length > 0) {
      console.log('🧩 Component-related Tables:');
      componentTables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.table_name}`);
      });
      console.log('\n');
      
      // For the first component table, show its structure
      if (componentTables.length > 0) {
        const firstTable = componentTables[0].table_name;
        console.log(`🔍 Structure of ${firstTable}:`);
        
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [firstTable]);
        
        columnsResult.rows.forEach(col => {
          console.log(`  ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        console.log('\n');
        
        // Show a sample of data
        console.log(`📝 Sample data from ${firstTable} (first 3 rows):`);
        const sampleDataResult = await client.query(`
          SELECT * FROM "${firstTable}" LIMIT 3
        `);
        
        if (sampleDataResult.rows.length > 0) {
          sampleDataResult.rows.forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        } else {
          console.log('  No data found in this table.');
        }
      }
    } else {
      console.log('⚠️ No component-related tables found in the database.');
    }
    
  } catch (error) {
    console.error('Error examining database schema:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the script
console.log('🔍 Starting database schema diagnostics...');
listDatabaseTables()
  .catch(console.error)
  .finally(() => {
    console.log('\n🏁 Database schema diagnostics complete.\n');
    setTimeout(() => process.exit(0), 500);
  });
