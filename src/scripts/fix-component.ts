import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';

/**
 * Component fix tool to automatically correct common issues in component TSX code
 * and update the database
 * 
 * Run with: npx tsx src/scripts/fix-component.ts <componentId> [--apply]
 */

async function main() {
  // Get component ID from command line
  const componentId = process.argv[2];
  const shouldApply = process.argv.includes('--apply');
  
  if (!componentId) {
    console.error('Error: Missing component ID');
    console.log('Usage: npx tsx src/scripts/fix-component.ts <componentId> [--apply]');
    console.log('  --apply    Apply the fixes (otherwise just show what would be fixed)');
    process.exit(1);
  }
  
  try {
    await fixComponent(componentId, shouldApply);
  } catch (error) {
    console.error('Error fixing component:', error);
  }
}

async function fixComponent(componentId: string, shouldApply: boolean) {
  console.log(chalk.blue('🔧 Component Fix Tool'));
  console.log(chalk.blue('===================\n'));
  console.log(`Mode: ${shouldApply ? chalk.green('APPLY') : chalk.yellow('DRY RUN')}\n`);

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
  
  if (!component.tsxCode) {
    console.log(chalk.red('\nNo TSX code available to fix'));
    return;
  }
  
  // Analyze and fix the code
  let tsxCode = component.tsxCode;
  const fixes = [];
  let fixedCode = tsxCode;
  
  // Fix 1: Remove "use client" directive
  if (fixedCode.includes('"use client"') || fixedCode.includes("'use client'")) {
    fixedCode = fixedCode.replace(/^\s*["']use client["'];?\s*/m, '// "use client" directive removed\n');
    fixes.push('Removed "use client" directive');
  }
  
  // Fix 2: Fix import statements
  // Replace React imports
  if (fixedCode.match(/import\s+([a-z])\s+from\s*["']react["']/)) {
    fixedCode = fixedCode.replace(/import\s+([a-z])\s+from\s*["']react["']/g, 'import React from "react"');
    fixes.push('Replaced single-letter React import with standard name');
  }
  
  // Replace destructuring imports
  if (fixedCode.match(/import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react["']/)) {
    fixedCode = fixedCode.replace(
      /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react["']/g, 
      'import React, {$1} from "react"'
    );
    fixes.push('Fixed naked destructuring imports by adding React import');
  }
  
  // Fix 3: Ensure window.__REMOTION_COMPONENT assignment exists
  if (!fixedCode.includes('window.__REMOTION_COMPONENT')) {
    // Extract the component name by looking for const/function declarations
    let componentName = extractComponentName(fixedCode);
    
    if (componentName) {
      // Add IIFE at the end of the file to register the component
      fixedCode += `\n\n;(function() {
  try {
    window.__REMOTION_COMPONENT = ${componentName};
    console.log("Successfully registered component: ${component.effect}");
  } catch (err) {
    console.error("Error registering component:", err);
  }
})();
`;
      fixes.push(`Added IIFE to assign ${componentName} to window.__REMOTION_COMPONENT`);
    } else {
      fixes.push('WARNING: Could not identify component name to add window.__REMOTION_COMPONENT assignment');
    }
  }
  
  // Fix 4: Fix multiple default exports
  if ((fixedCode.match(/export default/g) || []).length > 1) {
    fixedCode = removeDuplicateDefaultExports(fixedCode);
    fixes.push('Removed duplicate default exports');
  }
  
  // Display fixes
  if (fixes.length === 0) {
    console.log(chalk.green('\n✓ No fixes needed for this component'));
  } else {
    console.log(chalk.yellow(`\n🔧 ${fixes.length} fixes identified:\n`));
    fixes.forEach((fix, i) => {
      console.log(`${i + 1}. ${fix}`);
    });
    
    // Show diff
    console.log(chalk.bold('\nChanges:'));
    console.log('--------');
    
    // Simple diff output - can be enhanced with a proper diff library
    const originalLines = tsxCode.split('\n');
    const fixedLines = fixedCode.split('\n');
    
    if (originalLines.length <= 15) {
      // For small files, show everything
      console.log(chalk.red('--- Original'));
      console.log(tsxCode);
      console.log(chalk.green('+++ Fixed'));
      console.log(fixedCode);
    } else {
      // For larger files, just show the first 10 lines and indication of more
      console.log(chalk.red('--- Original (first 10 lines)'));
      console.log(originalLines.slice(0, 10).join('\n'));
      console.log('... more lines ...');
      
      console.log(chalk.green('+++ Fixed (first 10 lines)'));
      console.log(fixedLines.slice(0, 10).join('\n'));
      console.log('... more lines ...');
    }
    
    // Apply changes if requested
    if (shouldApply) {
      await db.update(customComponentJobs)
        .set({
          tsxCode: fixedCode,
          status: 'pending', // Reset to pending to trigger rebuild
          errorMessage: null,
          outputUrl: null,
          retryCount: 0,
        })
        .where(eq(customComponentJobs.id, componentId));
      
      console.log(chalk.green('\n✓ Successfully applied fixes and reset component to pending'));
    } else {
      console.log(chalk.yellow('\nℹ️ This was a dry run. Use --apply to apply these fixes'));
    }
  }
}

// Helper function to extract component name from code
function extractComponentName(code: string): string | null {
  // Try to find component definition patterns
  
  // Pattern 1: const ComponentName = (props) => { ... }
  const constMatch = code.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=/);
  if (constMatch && constMatch[1]) {
    return constMatch[1];
  }
  
  // Pattern 2: function ComponentName(props) { ... }
  const funcMatch = code.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  if (funcMatch && funcMatch[1]) {
    return funcMatch[1];
  }
  
  // Pattern 3: class ComponentName extends React.Component { ... }
  const classMatch = code.match(/class\s+([A-Z][A-Za-z0-9_]*)\s+extends/);
  if (classMatch && classMatch[1]) {
    return classMatch[1];
  }
  
  // Pattern 4: export { ComponentName as X }
  const exportMatch = code.match(/export\s*{\s*([A-Z][A-Za-z0-9_]*)\s+as/);
  if (exportMatch && exportMatch[1]) {
    return exportMatch[1];
  }
  
  // Pattern 5: export default X
  const defaultMatch = code.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)/);
  if (defaultMatch && defaultMatch[1]) {
    return defaultMatch[1];
  }
  
  return null;
}

// Helper function to remove duplicate default exports
function removeDuplicateDefaultExports(code: string): string {
  const lines = code.split('\n');
  let foundFirstDefault = false;
  
  return lines.map(line => {
    if (line.includes('export default')) {
      if (foundFirstDefault) {
        // Comment out additional default exports
        return '// ' + line + ' // Duplicate default export removed';
      }
      foundFirstDefault = true;
    }
    return line;
  }).join('\n');
}

// Helper function for status formatting
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

// Run the script
main(); 