import pg from 'pg';
const { Pool } = pg;

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

/**
 * Execute a SQL query and return the results
 */
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * List all tables in the database
 */
async function listTables() {
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  
  return await query(sql);
}

/**
 * Get table schema
 */
async function getTableSchema(tableName) {
  const sql = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  return await query(sql, [tableName]);
}

/**
 * Get count of rows in a table
 */
async function getTableCount(tableName) {
  const sql = `SELECT COUNT(*) as count FROM "${tableName}";`;
  const result = await query(sql);
  return parseInt(result[0].count);
}

/**
 * Explore the database and print information
 */
async function exploreDatabase() {
  try {
    console.log('Connecting to Neon database...');
    
    // List all tables
    console.log('\n=== Database Tables ===');
    const tables = await listTables();
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Output row counts for all tables
    console.log('\n=== Table Row Counts ===');
    for (const table of tables) {
      try {
        const count = await getTableCount(table.table_name);
        console.log(`${table.table_name}: ${count} rows`);
      } catch (err) {
        console.log(`${table.table_name}: Error getting count - ${err.message}`);
      }
    }
    
    // Look for component-related tables
    console.log('\n=== Looking for component-related tables ===');
    const potentialComponentTables = tables.filter(t => 
      t.table_name.includes('component') || 
      t.table_name.includes('custom')
    );
    
    if (potentialComponentTables.length > 0) {
      console.log('Found potential component tables:');
      potentialComponentTables.forEach(t => console.log(`- ${t.table_name}`));
      
      // Check schema of first potential component table
      const firstTable = potentialComponentTables[0].table_name;
      console.log(`\n=== ${firstTable} Schema ===`);
      const schema = await getTableSchema(firstTable);
      schema.forEach(column => {
        console.log(`${column.column_name} (${column.data_type})${column.is_nullable === 'YES' ? ', nullable' : ''}${column.column_default ? `, default: ${column.column_default}` : ''}`);
      });
      
      // Sample data from first potential component table
      console.log(`\n=== ${firstTable} Sample Data ===`);
      const sampleData = await query(`SELECT * FROM "${firstTable}" LIMIT 3`);
      console.log(JSON.stringify(sampleData, null, 2));
    } else {
      console.log('No component-related tables found.');
    }
    
    // Check specifically for custom_component_job table
    const customComponentJobTable = tables.find(t => t.table_name === 'bazaar-vid_custom_component_job');
    if (customComponentJobTable) {
      console.log('\n=== custom_component_job Table ===');
      const count = await getTableCount('bazaar-vid_custom_component_job');
      console.log(`Total rows: ${count}`);
      
      // Get status counts
      const statusCounts = await query(`
        SELECT status, COUNT(*) as count
        FROM "bazaar-vid_custom_component_job"
        GROUP BY status
        ORDER BY count DESC
      `);
      
      console.log('Status breakdown:');
      statusCounts.forEach(row => {
        console.log(`- ${row.status}: ${row.count} components`);
      });
      
      // Sample of successful components
      console.log('\n=== Successful Component Sample ===');
      const successfulComponents = await query(`
        SELECT id, status, "tsxCode" as code, "outputUrl", "errorMessage"
        FROM "bazaar-vid_custom_component_job"
        WHERE status = 'success'
        LIMIT 1
      `);
      
      if (successfulComponents.length > 0) {
        const component = successfulComponents[0];
        console.log(`Component ID: ${component.id}`);
        console.log(`Output URL: ${component.outputUrl}`);
        console.log('Code snippet:');
        if (component.code) {
          console.log(component.code.substring(0, 500) + '...');
        } else {
          console.log('No code available');
        }
      } else {
        console.log('No successful components found');
      }
      
      // Sample of error components
      console.log('\n=== Error Component Sample ===');
      const errorComponents = await query(`
        SELECT id, status, "errorMessage"
        FROM "bazaar-vid_custom_component_job"
        WHERE status = 'error'
        LIMIT 1
      `);
      
      if (errorComponents.length > 0) {
        const component = errorComponents[0];
        console.log(`Component ID: ${component.id}`);
        console.log(`Error: ${component.errorMessage}`);
      } else {
        console.log('No error components found');
      }
    }
  } catch (error) {
    console.error('Error exploring database:', error);
  } finally {
    await pool.end();
  }
}

exploreDatabase(); 