//scripts/commands/components/analyze/diagnose-component.ts
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';

/**
 * Component diagnostic tool to identify common issues in component TSX code
 * Run with: npx tsx src/scripts/diagnose-component.ts <componentId>
 */

async function main() {
  // Get component ID from command line
  const componentId = process.argv[2];
  
  if (!componentId) {
    console.error('Error: Missing component ID');
    console.log('Usage: npx tsx src/scripts/diagnose-component.ts <componentId>');
    process.exit(1);
  }
  
  try {
    await diagnoseComponent(componentId);
  } catch (error) {
    console.error('Error diagnosing component:', error);
  }
}

async function diagnoseComponent(componentId: string) {
  console.log(chalk.blue('🔍 Component Diagnostic Tool'));
  console.log(chalk.blue('==========================\n'));

  // Fetch the component
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, componentId),
  });

  if (!component) {
    console.log(chalk.red(`Component with ID ${componentId} not found`));
    return;
  }

  console.log(chalk.bold(`Component: ${component.effect} (${component.id})`));
  console.log(`Status: ${formatStatus(component.status)}`);
  console.log(`Error: ${component.errorMessage || 'None'}`);
  
  if (!component.tsxCode) {
    console.log(chalk.red('\nNo TSX code available to diagnose'));
    return;
  }
  
  // Run diagnostics
  console.log(chalk.bold('\nRunning diagnostics...\n'));
  
  const tsxCode = component.tsxCode;
  const issues = [];
  
  // Check 1: Use client directive
  if (tsxCode.includes('"use client"') || tsxCode.includes("'use client'")) {
    issues.push({
      issue: '"use client" directive present',
      severity: 'High',
      explanation: 'This directive causes syntax errors when directly loaded in browser scripts',
      suggestion: 'Remove the directive before building the component'
    });
  }
  
  // Check 2: Import statements syntax
  const importRegex = /import\s+{[^}]*}\s+from\s+['"]react['"]/g;
  if (importRegex.test(tsxCode)) {
    issues.push({
      issue: 'Destructured import statements',
      severity: 'High',
      explanation: 'Naked destructuring imports cause syntax errors in direct browser execution',
      suggestion: 'Use "const { useState, useEffect } = React;" instead of import statements'
    });
  }
  
  // Check 3: Single character variable names for React
  const singleCharReactRegex = /import\s+([a-z])\s+from\s+['"]react['"]/;
  const match = tsxCode.match(singleCharReactRegex);
  if (match) {
    issues.push({
      issue: `Single-letter React import alias "${match[1]}"`,
      severity: 'Medium',
      explanation: 'Using single-letter variables for React can cause conflicts',
      suggestion: 'Use "React" instead of single-letter variables'
    });
  }
  
  // Check 4: Missing React.createElement
  if (!tsxCode.includes('React.createElement') && 
      !tsxCode.includes('.createElement')) {
    issues.push({
      issue: 'No React.createElement calls found',
      severity: 'Medium',
      explanation: 'JSX might not be properly transformed to React.createElement calls',
      suggestion: 'Ensure the component returns JSX that transforms to React.createElement'
    });
  }
  
  // Check 5: Default export pattern
  if (!tsxCode.includes('export default') && 
      !tsxCode.includes('export {') && 
      !tsxCode.includes('module.exports')) {
    issues.push({
      issue: 'No component export found',
      severity: 'High',
      explanation: 'Component must be exported to be accessed',
      suggestion: 'Add "export default ComponentName;" at the end of the file'
    });
  }
  
  // Check 6: window.__REMOTION_COMPONENT assignment
  if (!tsxCode.includes('window.__REMOTION_COMPONENT')) {
    issues.push({
      issue: 'Missing window.__REMOTION_COMPONENT assignment',
      severity: 'Critical',
      explanation: 'Remotion requires the component to be assigned to window.__REMOTION_COMPONENT',
      suggestion: 'Add an IIFE to assign the component to window.__REMOTION_COMPONENT'
    });
  }
  
  // Check 7: Syntax errors (basic check)
  try {
    // Simple syntax check - just trying to parse the code
    new Function(tsxCode);
  } catch (error: unknown) {
    const syntaxError = error instanceof Error ? error : new Error(String(error));
    issues.push({
      issue: `Syntax error: ${syntaxError.message}`,
      severity: 'Critical',
      explanation: 'JavaScript syntax error would prevent execution',
      suggestion: 'Fix the syntax error indicated'
    });
  }
  
  // Display issues
  if (issues.length === 0) {
    console.log(chalk.green('✅ No common issues detected in the component code'));
  } else {
    console.log(chalk.yellow(`⚠️ Found ${issues.length} potential issues:\n`));
    
    issues.forEach((issue, i) => {
      console.log(chalk.bold(`Issue ${i + 1}: ${issue.issue}`));
      console.log(`Severity: ${formatSeverity(issue.severity)}`);
      console.log(`Explanation: ${issue.explanation}`);
      console.log(`Suggestion: ${issue.suggestion}\n`);
    });
  }
  
  // Show full code with highlights if requested
  if (process.argv.includes('--show-code')) {
    console.log(chalk.bold('\nComponent Code:'));
    console.log('---------------');
    console.log(tsxCode);
  } else {
    console.log('Tip: Run with --show-code to see the full component code');
  }
}

// Helper functions
function formatStatus(status: string | null): string {
  if (!status) return chalk.gray('Unknown');
  
  switch (status) {
    case 'complete':
      return chalk.green(status);
    case 'error':
      return chalk.red(status);
    case 'pending':
      return chalk.yellow(status);
    default:
      return status;
  }
}

function formatSeverity(severity: string): string {
  switch (severity) {
    case 'Critical':
      return chalk.red.bold(severity);
    case 'High':
      return chalk.red(severity);
    case 'Medium':
      return chalk.yellow(severity);
    case 'Low':
      return chalk.blue(severity);
    default:
      return severity;
  }
}

// Run the script
main(); 