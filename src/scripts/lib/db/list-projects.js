// @ts-nocheck
// src/scripts/lib/db/list-projects.js
import {
  getProjects,
  parseArgs,
  ensureAnalysisDirectories,
  closeConnection
} from './db-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * List all projects in the database
 */
async function listProjects() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    const limit = parseInt(args.options.limit || '20', 10);
    
    console.log(`Listing projects (limit: ${limit})`);
    
    // Get projects
    const projects = await getProjects(limit);
    
    if (projects.length === 0) {
      console.log('No projects found');
      return;
    }
    
    console.log(`\nFound ${projects.length} projects:`);
    
    // Create output directory and file
    const baseDir = await ensureAnalysisDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(baseDir, `projects_list_${timestamp}.md`);
    
    let report = `# Projects List\n\n`;
    report += `*Generated on ${new Date().toISOString()}*\n\n`;
    report += `Total projects: ${projects.length}\n\n`;
    
    // Create table for report
    report += `| # | ID | Name | Created | Updated |\n`;
    report += `|---|-----|------|---------|--------|\n`;
    
    // Output projects
    projects.forEach((project, index) => {
      // Console output
      console.log(`${index + 1}. ${project.id} - ${project.name || 'Unnamed Project'} (Created: ${project.createdAt})`);
      
      // Report output
      const name = project.name || 'Unnamed Project';
      report += `| ${index + 1} | ${project.id} | ${name} | ${project.createdAt} | ${project.updatedAt} |\n`;
    });
    
    // Save the report
    await fs.writeFile(outputPath, report);
    console.log(`\nDetailed report saved to ${outputPath}`);
    console.log(`\nTo see components for a specific project:`);
    console.log(`node src/scripts/db-tools/get-project-components.js <projectId>`);
    
  } catch (error) {
    console.error('Error listing projects:', error);
  } finally {
    await closeConnection();
  }
}

listProjects(); 