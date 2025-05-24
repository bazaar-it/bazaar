// @ts-nocheck
// src/scripts/lib/db/analyze-component.js
import {
  getComponentById,
  getProjectById,
  getADBsForComponent,
  parseArgs,
  ensureAnalysisDirectories,
  closeConnection
} from './db-utils.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Analyze a specific component by ID
 */
async function analyzeComponent() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    const componentId = args.positional[0];
    
    if (!componentId) {
      console.error('Please provide a component ID');
      console.error('Usage: node analyze-component.js <componentId>');
      process.exit(1);
    }
    
    console.log(`Analyzing component: ${componentId}`);
    
    // Get component details
    const component = await getComponentById(componentId);
    
    if (!component) {
      console.error(`Component with ID ${componentId} not found`);
      process.exit(1);
    }
    
    // Create output directory
    const baseDir = await ensureAnalysisDirectories();
    const componentDir = path.join(baseDir, 'components', componentId);
    
    try {
      await fs.mkdir(componentDir, { recursive: true });
    } catch (err) {
      // Directory exists, ignore
    }
    
    // Start building the report
    let report = `# Component Analysis: ${componentId}\n\n`;
    
    // Basic details
    console.log('\n=== Basic Details ===');
    report += `## Basic Details\n\n`;
    report += `- **ID**: ${component.id}\n`;
    report += `- **Effect**: ${component.effect || 'None'}\n`;
    report += `- **Status**: ${component.status}\n`;
    report += `- **Created**: ${component.createdAt}\n`;
    report += `- **Updated**: ${component.updatedAt}\n`;
    report += `- **Project ID**: ${component.projectId}\n`;
    report += `- **Output URL**: ${component.outputUrl || 'None'}\n`;
    
    if (component.errorMessage) {
      report += `- **Error Message**: ${component.errorMessage}\n`;
    }
    
    // Get project details
    if (component.projectId) {
      const project = await getProjectById(component.projectId);
      if (project) {
        console.log(`Project: ${project.title}`);
        report += `- **Project Name**: ${project.title}\n`;
      }
    }
    
    // Get animation design briefs that use this component
    const adbs = await getADBsForComponent(componentId);
    
    console.log(`Related ADBs: ${adbs.length}`);
    report += `- **Related ADBs**: ${adbs.length}\n\n`;
    
    if (adbs.length > 0) {
      report += `## Animation Design Briefs\n\n`;
      report += `| ID | Project ID | Scene ID | Created |\n`;
      report += `|----|------------|----------|--------|\n`;
      
      for (const adb of adbs) {
        report += `| ${adb.id} | ${adb.projectId} | ${adb.sceneId || 'None'} | ${adb.createdAt} |\n`;
      }
      
      report += `\n`;
    }
    
    // Analyze the code
    if (component.tsxCode) {
      console.log('\n=== Code Analysis ===');
      report += `## Code Analysis\n\n`;
      
      // Save the code to a file
      const codePath = path.join(componentDir, 'code.tsx');
      await fs.writeFile(codePath, component.tsxCode);
      console.log(`Component code saved to ${codePath}`);
      
      // Look for common issues
      const issues = [];
      
      if (component.tsxCode.includes('use client')) {
        issues.push('Has "use client" directive');
      }
      
      if (component.tsxCode.match(/import\s*{[^}]+}\s*from/)) {
        issues.push('Has destructured imports');
      }
      
      if (component.tsxCode.match(/\b[a-z]\.createElement\b/)) {
        issues.push('Has single-letter React variable');
      }
      
      if (!component.tsxCode.includes('window.__REMOTION_COMPONENT')) {
        issues.push('Missing window.__REMOTION_COMPONENT assignment');
      }
      
      if (component.tsxCode.includes('useVideoConfig') && !component.tsxCode.includes('import useVideoConfig')) {
        issues.push('Uses useVideoConfig but does not import it');
      }
      
      // Output issues
      if (issues.length === 0) {
        console.log('✅ No common issues detected in the code');
        report += `✅ No common issues detected in the code\n\n`;
      } else {
        console.log(`❌ Found ${issues.length} potential issues:`);
        report += `❌ Found ${issues.length} potential issues:\n\n`;
        
        for (const issue of issues) {
          console.log(`- ${issue}`);
          report += `- ${issue}\n`;
        }
        
        report += `\n`;
      }
      
      // Code metrics
      const lineCount = component.tsxCode.split('\n').length;
      const importCount = (component.tsxCode.match(/import /g) || []).length;
      const reactImports = (component.tsxCode.match(/from ['"]react['"]/g) || []).length;
      const remotionImports = (component.tsxCode.match(/from ['"]remotion['"]/g) || []).length;
      
      report += `### Code Metrics\n\n`;
      report += `- **Line Count**: ${lineCount}\n`;
      report += `- **Import Statements**: ${importCount}\n`;
      report += `- **React Imports**: ${reactImports}\n`;
      report += `- **Remotion Imports**: ${remotionImports}\n\n`;
      
      // Code snippet
      report += `### Code Snippet\n\n`;
      report += "```tsx\n";
      report += component.tsxCode.substring(0, 1500);
      if (component.tsxCode.length > 1500) {
        report += "\n... (truncated) ...";
      }
      report += "\n```\n\n";
    } else {
      report += `❌ No code available for this component\n\n`;
    }
    
    // If there's JavaScript code
    if (component.jsCode) {
      const jsCodePath = path.join(componentDir, 'code.js');
      await fs.writeFile(jsCodePath, component.jsCode);
      console.log(`Component JavaScript code saved to ${jsCodePath}`);
      
      report += `### Generated JavaScript\n\n`;
      report += "```javascript\n";
      report += component.jsCode.substring(0, 1000);
      if (component.jsCode.length > 1000) {
        report += "\n... (truncated) ...";
      }
      report += "\n```\n\n";
    }
    
    // Save the report
    const reportPath = path.join(componentDir, 'analysis.md');
    await fs.writeFile(reportPath, report);
    console.log(`\nDetailed analysis saved to ${reportPath}`);
    
  } catch (error) {
    console.error('Error analyzing component:', error);
  } finally {
    await closeConnection();
  }
}

analyzeComponent(); 