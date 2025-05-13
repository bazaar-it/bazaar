import {
  listTables,
  getTableSchema,
  getTableCount,
  ensureAnalysisDirectories,
  closeConnection
} from './db-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Explore the database and print detailed information
 */
async function exploreDatabase() {
  try {
    console.log('Connecting to Neon database...');
    
    // Create output directory
    const baseDir = await ensureAnalysisDirectories();
    const outputPath = path.join(baseDir, 'database_structure.md');
    
    let report = `# Database Structure Analysis\n\n`;
    report += `*Generated on ${new Date().toISOString()}*\n\n`;
    
    // List all tables
    console.log('\n=== Database Tables ===');
    report += `## Tables\n\n`;
    
    const tables = await listTables();
    
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    report += `| # | Table Name | Row Count |\n`;
    report += `|---|------------|----------:|\n`;
    
    // Output row counts for all tables
    console.log('\n=== Table Row Counts ===');
    
    for (const [index, table] of tables.entries()) {
      try {
        const count = await getTableCount(table.table_name);
        console.log(`${table.table_name}: ${count} rows`);
        report += `| ${index + 1} | ${table.table_name} | ${count} |\n`;
      } catch (err) {
        console.log(`${table.table_name}: Error getting count - ${err.message}`);
        report += `| ${index + 1} | ${table.table_name} | Error |\n`;
      }
    }
    
    // Look for component-related tables
    console.log('\n=== Component-Related Tables ===');
    report += `\n## Component-Related Tables\n\n`;
    
    const componentTables = tables.filter(t => 
      t.table_name.includes('component') || 
      t.table_name.includes('custom')
    );
    
    if (componentTables.length > 0) {
      console.log('Found component-related tables:');
      report += `Found ${componentTables.length} component-related tables:\n\n`;
      
      for (const table of componentTables) {
        console.log(`- ${table.table_name}`);
        report += `### ${table.table_name}\n\n`;
        
        // Get schema
        const schema = await getTableSchema(table.table_name);
        console.log(`\n=== ${table.table_name} Schema ===`);
        
        report += `| Column | Type | Nullable | Default |\n`;
        report += `|--------|------|----------|--------|\n`;
        
        schema.forEach(column => {
          const nullable = column.is_nullable === 'YES' ? 'Yes' : 'No';
          const defaultVal = column.column_default || '-';
          
          console.log(`${column.column_name} (${column.data_type})${column.is_nullable === 'YES' ? ', nullable' : ''}${column.column_default ? `, default: ${column.column_default}` : ''}`);
          report += `| ${column.column_name} | ${column.data_type} | ${nullable} | ${defaultVal} |\n`;
        });
        
        report += `\n`;
        
        // Sample data
        try {
          console.log(`\n=== ${table.table_name} Sample Data ===`);
          report += `#### Sample Data\n\n`;
          
          const sampleSql = `SELECT * FROM "${table.table_name}" LIMIT 3`;
          const sampleData = await query(sampleSql);
          
          if (sampleData.length > 0) {
            // Get column names for the table header
            const columns = Object.keys(sampleData[0]);
            
            report += `| ${columns.join(' | ')} |\n`;
            report += `| ${columns.map(() => '---').join(' | ')} |\n`;
            
            // Add each row of data
            for (const row of sampleData) {
              const rowValues = columns.map(col => {
                const val = row[col];
                if (val === null || val === undefined) return '-';
                if (typeof val === 'object') return JSON.stringify(val).substring(0, 30) + '...';
                return String(val).substring(0, 30);
              });
              
              report += `| ${rowValues.join(' | ')} |\n`;
            }
          } else {
            report += `No sample data available\n\n`;
          }
        } catch (err) {
          console.error(`Error getting sample data for ${table.table_name}:`, err.message);
          report += `Error retrieving sample data: ${err.message}\n\n`;
        }
        
        report += `\n`;
      }
    } else {
      console.log('No component-related tables found.');
      report += `No component-related tables found.\n\n`;
    }
    
    // Check for custom_component_job table specifically
    const customComponentJobTable = tables.find(t => t.table_name === 'bazaar-vid_custom_component_job');
    
    if (customComponentJobTable) {
      console.log('\n=== Custom Component Job Table Analysis ===');
      report += `## Custom Component Job Table Analysis\n\n`;
      
      // Get status counts
      const statusSql = `
        SELECT status, COUNT(*) as count
        FROM "bazaar-vid_custom_component_job"
        GROUP BY status
        ORDER BY count DESC
      `;
      
      const statusCounts = await query(statusSql);
      
      console.log('Status breakdown:');
      report += `### Status Breakdown\n\n`;
      report += `| Status | Count |\n`;
      report += `|--------|------:|\n`;
      
      statusCounts.forEach(row => {
        console.log(`- ${row.status}: ${row.count} components`);
        report += `| ${row.status} | ${row.count} |\n`;
      });
      
      // Recent components by status
      report += `\n### Recent Components by Status\n\n`;
      
      for (const statusRow of statusCounts) {
        const status = statusRow.status;
        
        report += `#### ${status} Components (Recent 5)\n\n`;
        
        const recentSql = `
          SELECT id, effect, "createdAt", "errorMessage"
          FROM "bazaar-vid_custom_component_job"
          WHERE status = $1
          ORDER BY "createdAt" DESC
          LIMIT 5
        `;
        
        const recentComponents = await query(recentSql, [status]);
        
        if (recentComponents.length > 0) {
          report += `| ID | Effect | Created At | Error |\n`;
          report += `|----|--------|------------|-------|\n`;
          
          for (const comp of recentComponents) {
            const effect = comp.effect ? comp.effect.substring(0, 50) + (comp.effect.length > 50 ? '...' : '') : '-';
            const error = comp.errorMessage 
              ? (comp.errorMessage.substring(0, 50) + (comp.errorMessage.length > 50 ? '...' : '')).replace(/\|/g, '\\|') 
              : '-';
            
            report += `| ${comp.id} | ${effect} | ${comp.createdAt} | ${error} |\n`;
          }
        } else {
          report += `No components with status "${status}" found.\n\n`;
        }
        
        report += `\n`;
      }
    }
    
    // Save the report
    await fs.writeFile(outputPath, report);
    console.log(`\nDetailed report saved to ${outputPath}`);
    
  } catch (error) {
    console.error('Error exploring database:', error);
  } finally {
    await closeConnection();
  }
}

exploreDatabase();

// Local helper function to avoid importing the entire db-utils
import { query } from './db-utils.js'; 