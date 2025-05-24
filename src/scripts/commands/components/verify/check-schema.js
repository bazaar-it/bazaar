// @ts-nocheck
// src/scripts/commands/components/verify/check-schema.js
// Check the schema of the custom components table

import pg from 'pg';
const { Pool } = pg;

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Checking database schema...');
    
    // Get schema for custom component job table
    const tableSchema = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bazaar-vid_custom_component_job'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nSchema for bazaar-vid_custom_component_job table:');
    console.table(tableSchema);
    
    // Check if there are any rows with null tsxCode but some other content
    const nullTsxWithOtherContent = await query(`
      SELECT id, effect, status, "errorMessage", "originalTsxCode", metadata::text
      FROM "bazaar-vid_custom_component_job"
      WHERE "tsxCode" IS NULL 
        AND ("originalTsxCode" IS NOT NULL OR metadata IS NOT NULL)
      LIMIT 5;
    `);
    
    console.log('\nComponents with NULL tsxCode but other content:');
    console.log(nullTsxWithOtherContent);
    
    // Look for specific component
    const componentId = process.argv[2] || '8d478778-d937-4677-af65-f613da8aee6b';
    
    console.log(`\nLooking at specific component: ${componentId}`);
    const component = await query(`
      SELECT id, effect, status, "tsxCode", "originalTsxCode", "errorMessage", metadata::text
      FROM "bazaar-vid_custom_component_job"
      WHERE id = $1
    `, [componentId]);
    
    if (component.length === 0) {
      console.log(`Component with ID ${componentId} not found`);
    } else {
      console.log('Component found:');
      console.log(JSON.stringify(component[0], null, 2));
      
      // If there's metadata, check the prompt
      if (component[0].metadata) {
        try {
          const metadata = JSON.parse(component[0].metadata);
          if (metadata.prompt) {
            console.log('\nComponent Prompt:');
            console.log(metadata.prompt.substring(0, 500) + '...');
          }
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
