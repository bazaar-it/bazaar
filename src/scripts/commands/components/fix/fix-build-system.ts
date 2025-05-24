import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * Fix build system script to correct the buildCustomComponent.ts file structure
 * Run with: npx tsx src/scripts/fix-build-system.ts [--apply]
 */

const BUILD_COMPONENT_PATH = path.resolve(
  process.cwd(),
  'src/server/workers/buildCustomComponent.ts'
);

async function main() {
  const shouldApply = process.argv.includes('--apply');
  
  console.log(chalk.blue('🔧 Build System Fix Tool'));
  console.log(chalk.blue('=======================\n'));
  console.log(`Mode: ${shouldApply ? chalk.green('APPLY') : chalk.yellow('DRY RUN')}\n`);
  
  try {
    await fixBuildSystem(shouldApply);
  } catch (error) {
    console.error('Error fixing build system:', error);
  }
}

async function fixBuildSystem(shouldApply: boolean) {
  console.log(`Analyzing ${BUILD_COMPONENT_PATH}...`);
  
  // Read the file
  let fileContent: string;
  try {
    fileContent = await fs.readFile(BUILD_COMPONENT_PATH, 'utf8');
  } catch (error) {
    console.error(`Could not read file: ${error}`);
    return;
  }
  
  // Check for the nesting issue
  const linesArray = fileContent.split('\n');
  let braceCount = 0;
  let nestingIssueFound = false;
  let problemLine = -1;
  
  for (let i = 0; i < linesArray.length; i++) {
    const line = linesArray[i] || '';
    
    // Count braces - this is a simple approach and might not work for all cases
    // but should catch our specific issue
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    
    // Check for export function within another function
    if (braceCount > 0 && line.includes('export async function buildCustomComponent')) {
      nestingIssueFound = true;
      problemLine = i;
      break;
    }
  }
  
  if (!nestingIssueFound) {
    console.log(chalk.green('✓ No nesting issues found in buildCustomComponent.ts'));
    return;
  }
  
  console.log(chalk.yellow(`⚠️ Found issue at line ${problemLine + 1}: export function defined inside another block`));
  
  // Fix the nesting issue
  let fixedContent = fileContent;
  
  // Extract the buildCustomComponent function and place it at the correct level
  // This is a simple regex to extract the function, might need adjustment for complex cases
  const functionMatch = /export\s+async\s+function\s+buildCustomComponent\s*\([\s\S]*?\n\}\s*\n/.exec(fixedContent);
  
  if (!functionMatch) {
    console.log(chalk.red('Could not extract buildCustomComponent function for fixing'));
    return;
  }
  
  // Find the end of the function that contains buildCustomComponent
  const lastClosingBrace = fixedContent.lastIndexOf('}');
  if (lastClosingBrace === -1) {
    console.log(chalk.red('Could not find closing brace to fix nesting'));
    return;
  }
  
  // Construct the fixed content
  // Remove extra closing braces at the end if they're causing the nesting
  let extraBraces = '';
  let checkContent = fixedContent;
  while (checkContent.endsWith('}') || checkContent.trim().endsWith('}')) {
    checkContent = checkContent.trimEnd();
    if (checkContent.endsWith('}')) {
      extraBraces = '}' + extraBraces;
      checkContent = checkContent.slice(0, -1).trimEnd();
    }
  }
  
  // If we have more than one extra brace, we probably have nesting
  if (extraBraces.length > 1) {
    // Keep one closing brace and remove the rest
    const fixedClosing = extraBraces.slice(0, 1);
    
    // Create the fixed content by removing extra braces and moving the function
    fixedContent = fixedContent.slice(0, lastClosingBrace - extraBraces.length + 1) + '\n' + 
                  functionMatch[0] + '\n';
  } else {
    // Simple restructuring: remove the function from its current location and add it at the end
    fixedContent = fixedContent.replace(functionMatch[0], '') + '\n' + functionMatch[0];
  }
  
  // Display changes
  console.log(chalk.bold('\nChanges:'));
  console.log('--------');
  
  // For simplicity, just show the last 20 lines which should include the fix area
  const originalLines = fileContent.split('\n').slice(-20);
  const fixedLines = fixedContent.split('\n').slice(-20);
  
  console.log(chalk.red('--- Original (last 20 lines)'));
  console.log(originalLines.join('\n'));
  
  console.log(chalk.green('\n+++ Fixed (last 20 lines)'));
  console.log(fixedLines.join('\n'));
  
  // Apply changes if requested
  if (shouldApply) {
    try {
      // Backup the original file
      const backupPath = `${BUILD_COMPONENT_PATH}.bak`;
      await fs.writeFile(backupPath, fileContent);
      console.log(chalk.blue(`Original file backed up to ${backupPath}`));
      
      // Write the fixed content
      await fs.writeFile(BUILD_COMPONENT_PATH, fixedContent);
      console.log(chalk.green('\n✓ Successfully applied fixes to buildCustomComponent.ts'));
    } catch (error) {
      console.error(`Error saving fixed file: ${error}`);
    }
  } else {
    console.log(chalk.yellow('\nℹ️ This was a dry run. Use --apply to apply these fixes'));
  }
}

// Run the script
main(); 