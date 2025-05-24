// @ts-nocheck
// src/scripts/lib/db/get-project-components.js
import {
  getProjectById,
  getComponentsByProject,
  parseArgs,
  ensureAnalysisDirectories,
  closeConnection
} from './db-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Get all components for a specific project
 */
async function getProjectComponentsById() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    const projectId = args.positional[0];
    
    if (!projectId) {
      console.error('Please provide a project ID');
      console.error('Usage: node get-project-components.js <projectId>');
      process.exit(1);
    }
    
    console.log(`Looking for components for project: ${projectId}`);
    
    // Get project details
    const project = await getProjectById(projectId);
    
    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      process.exit(1);
    }
    
    console.log(`Project: ${project.name} (Created: ${project.createdAt})`);
    
    // Get components for the project
    const components = await getComponentsByProject(projectId);
    
    if (components.length === 0) {
      console.log('No components found for this project');
      return;
    }
    
    console.log(`Found ${components.length} components:`);
    
    // Create output directory
    const baseDir = await ensureAnalysisDirectories();
    const projectDir = path.join(baseDir, 'projects', projectId);
    
    try {
      await fs.mkdir(projectDir, { recursive: true });
    } catch (err) {
      // Directory exists, ignore
    }
    
    // Output file
    const outputPath = path.join(projectDir, 'components.md');
    let report = `# Components for Project: ${project.name}\n\n`;
    report += `Project ID: ${project.id}\n`;
    report += `Created: ${project.createdAt}\n`;
    report += `Updated: ${project.updatedAt}\n\n`;
    report += `Total Components: ${components.length}\n\n`;
    
    // Status grouping
    const statusGroups = {};
    components.forEach(component => {
      statusGroups[component.status] = statusGroups[component.status] || [];
      statusGroups[component.status].push(component);
    });
    
    // Output status counts
    report += `## Status Summary\n\n`;
    report += `| Status | Count |\n`;
    report += `|--------|------:|\n`;
    
    for (const [status, comps] of Object.entries(statusGroups)) {
      console.log(`- ${status}: ${comps.length} components`);
      report += `| ${status} | ${comps.length} |\n`;
    }
    
    // List components by status
    for (const [status, comps] of Object.entries(statusGroups)) {
      console.log(`\n=== ${status.toUpperCase()} Components ===`);
      report += `\n## ${status.toUpperCase()} Components\n\n`;
      
      if (comps.length > 0) {
        report += `| ID | Effect | Created | Output URL | Error |\n`;
        report += `|----|--------|---------|------------|-------|\n`;
        
        for (const comp of comps) {
          console.log(`- ${comp.id} (${comp.effect ? comp.effect.substring(0, 30) + '...' : 'No effect'})`);
          
          const effect = comp.effect ? comp.effect.substring(0, 40) + (comp.effect.length > 40 ? '...' : '') : '-';
          const outputUrl = comp.outputUrl || '-';
          const error = comp.errorMessage
            ? (comp.errorMessage.substring(0, 40) + (comp.errorMessage.length > 40 ? '...' : '')).replace(/\|/g, '\\|')
            : '-';
          
          report += `| ${comp.id} | ${effect} | ${comp.createdAt} | ${outputUrl} | ${error} |\n`;
        }
      } else {
        report += `No components with status "${status}"\n\n`;
      }
    }
    
    // Save output
    await fs.writeFile(outputPath, report);
    console.log(`\nDetailed report saved to ${outputPath}`);
    
  } catch (error) {
    console.error('Error getting project components:', error);
  } finally {
    await closeConnection();
  }
}

getProjectComponentsById(); 