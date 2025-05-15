// src/scripts/diagnostics/list-components.ts
/**
 * Diagnostic script to list all components in the database
 * Shows component status, storage details, and other critical information
 */

import { db } from "../../server/db";
import { customComponentJobs } from "../../server/db/schema";
import { eq } from "drizzle-orm";

async function listAllComponents() {
  console.log('\n========= COMPONENT DIAGNOSTICS =========\n');
  
  try {
    // Get all components from database
    console.log('Fetching all components from database...\n');
    const components = await db.query.customComponentJobs.findMany({
      orderBy: (columns, { desc }) => [desc(columns.createdAt)]
    });
    
    console.log(`Found ${components.length} components in database\n`);
    
    if (components.length === 0) {
      console.log('No components found. Try generating a component first.');
      return;
    }
    
    // Display component statistics
    const statusCounts: Record<string, number> = {};
    components.forEach(comp => {
      const status = comp.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Component Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} components`);
    });
    console.log('\n');
    
    // Display details for each component
    console.log('Component Details:');
    components.forEach((comp, index) => {
      const hasCode = comp.tsxCode ? '✓' : '✗';
      const hasOriginalCode = comp.originalTsxCode ? '✓' : '✗';
      const hasOutput = comp.outputUrl ? '✓' : '✗';
      
      console.log(`${index + 1}. ${comp.effect || 'Unnamed'} (${comp.id})`);
      console.log(`   Status: ${comp.status || 'unknown'}`);
      console.log(`   Project ID: ${comp.projectId}`);
      console.log(`   Created: ${new Date(comp.createdAt || '').toLocaleString()}`);
      console.log(`   Updated: ${new Date(comp.updatedAt || '').toLocaleString()}`);
      console.log(`   Code: ${hasCode}, Original: ${hasOriginalCode}, Output: ${hasOutput}`);
      
      if (comp.errorMessage) {
        console.log(`   Error: ${comp.errorMessage}`);
      }
      
      if (comp.fixIssues) {
        console.log(`   Fix Issues: ${comp.fixIssues}`);
      }
      
      console.log("");
    });
    
  } catch (error) {
    console.error('Error listing components:', error);
  }
}

// Run the script
console.log('Starting component diagnostic scan...');
listAllComponents()
  .catch(console.error)
  .finally(() => {
    console.log('\nDiagnostic scan complete.\n');
    setTimeout(() => process.exit(0), 500);
  });
