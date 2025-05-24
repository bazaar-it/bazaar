// @ts-nocheck
// src/scripts/lib/db/list-all-components.js
import {
  getAllComponents,
  getComponentStatusCounts,
  parseArgs,
  ensureAnalysisDirectories,
  closeConnection
} from './db-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * List all components in the database with optional filtering
 */
async function listComponents() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    const status = args.options.status || null;
    const limit = parseInt(args.options.limit || '50', 10);
    
    console.log(`Listing components${status ? ` with status: ${status}` : ''} (limit: ${limit})`);
    
    // Get status counts
    const statusCounts = await getComponentStatusCounts();
    
    console.log('\n=== Status Counts ===');
    statusCounts.forEach(row => {
      console.log(`- ${row.status}: ${row.count} components`);
    });
    
    // Get components
    const components = await getAllComponents(status, limit);
    
    if (components.length === 0) {
      console.log(`\nNo components found${status ? ` with status: ${status}` : ''}`);
      return;
    }
    
    console.log(`\nFound ${components.length} components:`);
    
    // Create output directory and file
    const baseDir = await ensureAnalysisDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(baseDir, `component_list_${status || 'all'}_${timestamp}.md`);
    
    let report = `# Component List\n\n`;
    report += `*Generated on ${new Date().toISOString()}*\n\n`;
    
    if (status) {
      report += `Filtered by status: ${status}\n\n`;
    }
    
    report += `## Status Summary\n\n`;
    report += `| Status | Count |\n`;
    report += `|--------|------:|\n`;
    
    statusCounts.forEach(row => {
      report += `| ${row.status} | ${row.count} |\n`;
    });
    
    // List components
    report += `\n## Components (${components.length})\n\n`;
    report += `| ID | Project ID | Effect | Status | Created | URL |\n`;
    report += `|----|------------|--------|--------|---------|-----|\n`;
    
    for (const comp of components) {
      // Console output - simplified
      console.log(`- ${comp.id} (${comp.status}): ${comp.effect ? comp.effect.substring(0, 30) + '...' : 'No effect'}`);
      
      // Report output - more detailed
      const effect = comp.effect 
        ? (comp.effect.substring(0, 40) + (comp.effect.length > 40 ? '...' : '')).replace(/\|/g, '\\|') 
        : '-';
      const url = comp.outputUrl || '-';
      
      report += `| ${comp.id} | ${comp.projectId} | ${effect} | ${comp.status} | ${comp.createdAt} | ${url} |\n`;
    }
    
    // Save the report
    await fs.writeFile(outputPath, report);
    console.log(`\nDetailed report saved to ${outputPath}`);
    console.log(`\nTo analyze a specific component: node src/scripts/db-tools/analyze-component.js <componentId>`);
    
  } catch (error) {
    console.error('Error listing components:', error);
  } finally {
    await closeConnection();
  }
}

listComponents(); 