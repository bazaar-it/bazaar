require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Get database URL from environment
const DB_URL = process.env.DATABASE_URL;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: DB_URL,
});

async function listTables() {
  try {
    console.log('Connecting to database...');
    
    // Query to list all tables in the public schema
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    
    console.log('\n=== DATABASE TABLES ===');
    
    if (result.rows.length === 0) {
      console.log('No tables found in the public schema');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
      console.log(`\nTotal tables: ${result.rows.length}`);
    }
    
    // Now let's try to query the specific tables mentioned in the schema
    console.log('\n=== CHECKING SPECIFIC TABLES ===');
    
    const tablesToCheck = [
      'bazaar-vid_custom_component_job',
      'bazaar_vid_custom_component_job',
      'custom_component_job',
      'custom_component_jobs',
      'components'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const checkQuery = `
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `;
        
        const checkResult = await pool.query(checkQuery, [tableName]);
        const exists = checkResult.rows[0].exists;
        
        console.log(`Table "${tableName}": ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
      } catch (err) {
        console.error(`Error checking table "${tableName}":`, err.message);
      }
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
listTables().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 