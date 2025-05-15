//scripts/commands/db/analyze/explore-db.ts
import { dbUtils } from './lib/db-direct';

/**
 * This script explores the database structure and outputs details
 * about available tables and their schema
 */
async function exploreDatabase() {
  try {
    console.log('Connecting to Neon database...');
    
    // List all tables
    console.log('\n=== Database Tables ===');
    const tables = await dbUtils.listTables();
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Output row counts for all tables
    console.log('\n=== Table Row Counts ===');
    for (const table of tables) {
      const count = await dbUtils.getTableCount(table.table_name);
      console.log(`${table.table_name}: ${count} rows`);
    }
    
    // Check if "components" table exists (literal name)
    const componentsTable = tables.find(t => t.table_name === 'components');
    if (componentsTable) {
      console.log('\n=== Components Table Schema ===');
      const schema = await dbUtils.getTableSchema('components');
      schema.forEach(column => {
        console.log(`${column.column_name} (${column.data_type})${column.is_nullable === 'YES' ? ', nullable' : ''}${column.column_default ? `, default: ${column.column_default}` : ''}`);
      });
      
      // Sample data from components
      console.log('\n=== Components Sample Data ===');
      const sampleData = await dbUtils.query('SELECT id, status FROM components LIMIT 3');
      console.log(sampleData);
    } else {
      // If no "components" table exists, look for tables that might contain component data
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
        const schema = await dbUtils.getTableSchema(firstTable);
        schema.forEach(column => {
          console.log(`${column.column_name} (${column.data_type})${column.is_nullable === 'YES' ? ', nullable' : ''}${column.column_default ? `, default: ${column.column_default}` : ''}`);
        });
        
        // Sample data from first potential component table
        console.log(`\n=== ${firstTable} Sample Data ===`);
        const sampleData = await dbUtils.query(`SELECT * FROM ${firstTable} LIMIT 3`);
        console.log(JSON.stringify(sampleData, null, 2));
      } else {
        console.log('No component-related tables found.');
      }
    }
  } catch (error) {
    console.error('Error exploring database:', error);
  } finally {
    await dbUtils.closeConnection();
  }
}

exploreDatabase(); 