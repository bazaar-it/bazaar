import {
  getComponentsByStatus,
  getComponentStatusCounts,
  parseArgs,
  ensureAnalysisDirectories,
  closeConnection
} from './db-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Analyze error patterns in components
 */
async function analyzeErrors() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    const limit = parseInt(args.options.limit || '20', 10);
    
    console.log(`Analyzing error patterns in components (limit: ${limit})`);
    
    // Get error components
    const components = await getComponentsByStatus('error', limit);
    
    if (components.length === 0) {
      console.log('No components with errors found');
      return;
    }
    
    console.log(`Found ${components.length} components with errors`);
    
    // Create output directory
    const baseDir = await ensureAnalysisDirectories();
    const errorsDir = path.join(baseDir, 'errors');
    const outputPath = path.join(baseDir, 'error_pattern_report.md');
    
    // Start building the report
    let report = `# Component Error Pattern Analysis\n\n`;
    report += `*Generated on ${new Date().toISOString()}*\n\n`;
    report += `Analyzed ${components.length} components with errors\n\n`;
    
    // Get status counts for context
    const statusCounts = await getComponentStatusCounts();
    report += `## Status Distribution\n\n`;
    report += `| Status | Count |\n`;
    report += `|--------|------:|\n`;
    
    statusCounts.forEach(row => {
      report += `| ${row.status} | ${row.count} |\n`;
    });
    
    // Categorize errors
    const errorCategories = categorizeErrors(components);
    
    report += `\n## Error Categories\n\n`;
    report += `| Error Type | Count | Examples |\n`;
    report += `|------------|------:|---------|\n`;
    
    // Sort error categories by count
    const sortedCategories = Object.entries(errorCategories)
      .sort((a, b) => b[1].count - a[1].count);
    
    for (const [category, data] of sortedCategories) {
      const exampleIds = data.examples.map(comp => 
        `[${comp.id.substring(0, 8)}...](components/${comp.id}/analysis.md)`
      ).join(', ');
      
      report += `| ${category} | ${data.count} | ${exampleIds} |\n`;
      
      // Save sample error to file
      const sampleErrorPath = path.join(errorsDir, `sample_${category.replace(/[^a-z0-9]/gi, '_')}.txt`);
      const sampleComponent = data.examples[0];
      await fs.writeFile(sampleErrorPath, 
        `Error Type: ${category}\n` +
        `Component ID: ${sampleComponent.id}\n` +
        `Effect: ${sampleComponent.effect}\n` +
        `Created: ${sampleComponent.createdAt}\n` +
        `Error Message: ${sampleComponent.errorMessage}\n`
      );
    }
    
    // Code pattern analysis
    report += `\n## Common Code Issues\n\n`;
    
    const codeIssues = analyzeCodeIssues(components);
    
    for (const [issue, count] of Object.entries(codeIssues)) {
      report += `- **${issue}**: Found in ${count} components\n`;
    }
    
    // Save the report
    await fs.writeFile(outputPath, report);
    console.log(`\nDetailed analysis saved to ${outputPath}`);
    
  } catch (error) {
    console.error('Error analyzing error patterns:', error);
  } finally {
    await closeConnection();
  }
}

/**
 * Categorize errors by type
 */
function categorizeErrors(components) {
  const categories = {};
  
  for (const component of components) {
    if (!component.errorMessage) continue;
    
    let category = 'Unknown';
    
    // Build errors
    if (component.errorMessage.includes('Build error')) {
      if (component.errorMessage.includes('already been declared')) {
        category = 'Symbol Redeclaration';
      } else if (component.errorMessage.includes('Unexpected token')) {
        category = 'Syntax Error';
      } else if (component.errorMessage.includes('Cannot find name')) {
        category = 'Undefined Variable';
      } else if (component.errorMessage.includes('Property does not exist')) {
        category = 'Missing Property';
      } else {
        category = 'Build Error - Other';
      }
    }
    // Timeout errors
    else if (component.errorMessage.includes('timeout')) {
      category = 'Build Timeout';
    }
    // Network errors
    else if (component.errorMessage.includes('network') || component.errorMessage.includes('connection')) {
      category = 'Network Error';
    }
    // TSX code missing
    else if (component.errorMessage.includes('missing')) {
      category = 'Missing Code';
    }
    
    // Add category
    if (!categories[category]) {
      categories[category] = {
        count: 0,
        examples: []
      };
    }
    
    categories[category].count++;
    
    // Add as example if we have fewer than 3
    if (categories[category].examples.length < 3) {
      categories[category].examples.push(component);
    }
  }
  
  return categories;
}

/**
 * Analyze common code issues in components
 */
function analyzeCodeIssues(components) {
  const issues = {
    'Missing window.__REMOTION_COMPONENT': 0,
    'Destructured imports': 0,
    'Single-letter React variable': 0,
    'use client directive': 0,
    'Missing Remotion hooks imports': 0
  };
  
  for (const component of components) {
    if (!component.tsxCode) continue;
    
    // Check for issues
    if (!component.tsxCode.includes('window.__REMOTION_COMPONENT')) {
      issues['Missing window.__REMOTION_COMPONENT']++;
    }
    
    if (component.tsxCode.match(/import\s*{[^}]+}\s*from/)) {
      issues['Destructured imports']++;
    }
    
    if (component.tsxCode.match(/\b[a-z]\.createElement\b/)) {
      issues['Single-letter React variable']++;
    }
    
    if (component.tsxCode.includes('use client')) {
      issues['use client directive']++;
    }
    
    if ((component.tsxCode.includes('useVideoConfig') && !component.tsxCode.includes('import useVideoConfig')) ||
        (component.tsxCode.includes('useCurrentFrame') && !component.tsxCode.includes('import useCurrentFrame'))) {
      issues['Missing Remotion hooks imports']++;
    }
  }
  
  return issues;
}

analyzeErrors(); 