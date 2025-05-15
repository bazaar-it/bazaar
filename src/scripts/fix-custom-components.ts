/**
 * Comprehensive component fixer for Bazaar-vid
 * 
 * This script identifies and fixes multiple issues with custom components:
 * 1. Components marked as "ready"/"complete" but missing outputUrl values
 * 2. Components with syntax errors (extra semicolons after JSX tags)
 * 3. Components missing window.__REMOTION_COMPONENT assignment
 * 
 * Usage:
 * npx tsx src/scripts/fix-custom-components.ts [project-id] [options]
 * 
 * Options:
 *   --verbose   Show detailed logs
 *   --check     Only check for issues, don't fix
 *   --component=<id>  Fix a specific component by ID
 */

import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq, and, isNull, or, not } from 'drizzle-orm';
import { env } from '~/env';
import fs from 'fs';
import path from 'path';

// Get command line arguments
const args = process.argv.slice(2);
const projectId = args.find(arg => !arg.startsWith('--'));
const verbose = args.includes('--verbose');
const checkOnly = args.includes('--check');
const componentIdArg = args.find(arg => arg.startsWith('--component='));
const specificComponentId = componentIdArg ? componentIdArg.split('=')[1] : null;

// Patterns for syntax fixes
const PATTERNS = {
  EXTRA_SEMICOLONS: /(<\/\w+>);(\s*[);])/g,
  MISSING_REMOTION_COMPONENT: /window\.__REMOTION_COMPONENT\s*=/,
  IMPROPER_REACT_REFERENCE: /const\s+React\s*=\s*window\.React/,
  IMPROPER_REMOTION_REFERENCE: /const\s*{\s*AbsoluteFill\s*}\s*=\s*window\.Remotion/,
};

// Templates for fixes
const TEMPLATES = {
  REACT_REFERENCE: 'const React = window.React;',
  REMOTION_REFERENCE: 'const { AbsoluteFill } = window.Remotion;',
  REMOTION_COMPONENT_ASSIGNMENT: '\n// IMPORTANT: This is required for Remotion to find the component\nwindow.__REMOTION_COMPONENT = '
};

// Create backup directory
const backupDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function logVerbose(message: string) {
  if (verbose) {
    console.log(message);
  }
}

async function fixAllComponents() {
  console.log('Starting comprehensive component fixes...');
  
  // Part 1: Fix missing outputUrl values
  await fixMissingOutputUrls();
  
  // Part 2: Fix syntax issues and component assignments
  await fixComponentSyntaxIssues();
  
  console.log('\n✅ All fixes completed!');
}

async function fixMissingOutputUrls() {
  try {
    console.log('\n📊 Checking for components with missing outputUrl values...');
    
    // Build the query 
    let whereClause;
    
    if (specificComponentId) {
      whereClause = eq(customComponentJobs.id, specificComponentId);
    } else {
      whereClause = and(
        or(
          eq(customComponentJobs.status, 'ready'),
          eq(customComponentJobs.status, 'complete')
        ),
        isNull(customComponentJobs.outputUrl)
      );
      
      if (projectId) {
        whereClause = and(
          eq(customComponentJobs.projectId, projectId),
          whereClause
        );
      }
    }
    
    const componentsWithMissingUrls = await db.query.customComponentJobs.findMany({
      where: whereClause
    });
    
    if (componentsWithMissingUrls.length === 0) {
      console.log('✅ No components found with missing outputUrl values.');
      return;
    }
    
    console.log(`Found ${componentsWithMissingUrls.length} components with missing outputUrl values:`);
    
    // Show the affected components
    componentsWithMissingUrls.forEach((comp, index) => {
      console.log(`${index + 1}. ID: ${comp.id}, Name: ${comp.effect || 'Unnamed'}, Status: ${comp.status || 'unknown'}`);
    });
    
    if (checkOnly) {
      console.log('Check only mode: Not fixing missing outputUrl values.');
      return;
    }
    
    // Fix each component by generating proper R2 URL and updating the database
    for (const component of componentsWithMissingUrls) {
      console.log(`\nFixing outputUrl for component: ${component.id} (${component.effect || 'Unnamed'})`);
      
      // Generate R2 URL based on component ID and R2 public URL
      const r2PublicUrl = env.R2_PUBLIC_URL.endsWith('/') ? env.R2_PUBLIC_URL : `${env.R2_PUBLIC_URL}/`;
      const generatedOutputUrl = `${r2PublicUrl}custom-components/${component.id}.js`;
      
      console.log(`Generated outputUrl: ${generatedOutputUrl}`);
      
      try {
        // Update the component in the database
        const updated = await db.update(customComponentJobs)
          .set({
            outputUrl: generatedOutputUrl,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id))
          .returning();
        
        if (updated.length > 0) {
          console.log(`✅ Successfully updated component ${component.id} with new outputUrl`);
        } else {
          console.log(`❌ Failed to update component ${component.id}`);
        }
      } catch (error) {
        console.error(`Error updating component ${component.id}:`, error);
      }
    }
    
    console.log('\n✅ All components with missing outputUrl values have been processed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function fixComponentSyntaxIssues() {
  try {
    console.log('\n🔧 Checking for components with syntax issues...');
    
    // Build the query
    let whereClause;
    
    if (specificComponentId) {
      whereClause = eq(customComponentJobs.id, specificComponentId);
    } else if (projectId) {
      whereClause = eq(customComponentJobs.projectId, projectId);
    } else {
      whereClause = not(isNull(customComponentJobs.tsxCode));
    }
    
    const components = await db.query.customComponentJobs.findMany({
      where: whereClause
    });
    
    if (components.length === 0) {
      console.log('No components found to check for syntax issues.');
      return;
    }
    
    console.log(`Found ${components.length} components to check for syntax issues.`);
    
    // Track components with issues
    const componentsWithIssues = [];
    
    // Check each component for syntax issues
    for (const component of components) {
      if (!component.tsxCode) {
        logVerbose(`Component ${component.id} has no TSX code, skipping.`);
        continue;
      }
      
      const issues = [];
      
      // Check for extra semicolons after JSX closing tags
      if (PATTERNS.EXTRA_SEMICOLONS.test(component.tsxCode)) {
        issues.push('Extra semicolons after JSX closing tags');
      }
      
      // Check for proper React reference
      if (!PATTERNS.IMPROPER_REACT_REFERENCE.test(component.tsxCode)) {
        issues.push('Missing proper React reference');
      }
      
      // Check for proper Remotion reference
      if (!PATTERNS.IMPROPER_REMOTION_REFERENCE.test(component.tsxCode)) {
        issues.push('Missing proper Remotion reference');
      }
      
      // Check for window.__REMOTION_COMPONENT assignment
      if (!PATTERNS.MISSING_REMOTION_COMPONENT.test(component.tsxCode)) {
        issues.push('Missing window.__REMOTION_COMPONENT assignment');
      }
      
      if (issues.length > 0) {
        componentsWithIssues.push({ component, issues });
      }
    }
    
    if (componentsWithIssues.length === 0) {
      console.log('✅ No components found with syntax issues.');
      return;
    }
    
    console.log(`Found ${componentsWithIssues.length} components with syntax issues:`);
    
    // Show the affected components
    componentsWithIssues.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.component.id}, Name: ${item.component.effect || 'Unnamed'}, Issues: ${item.issues.join(', ')}`);
    });
    
    if (checkOnly) {
      console.log('Check only mode: Not fixing syntax issues.');
      return;
    }
    
    // Fix each component with syntax issues
    for (const { component, issues } of componentsWithIssues) {
      console.log(`\nFixing syntax for component: ${component.id} (${component.effect || 'Unnamed'})`);
      
      // Backup the original code
      const backupFile = path.join(backupDir, `${component.id}-original.tsx`);
      fs.writeFileSync(backupFile, component.tsxCode!);
      logVerbose(`Original code backed up to ${backupFile}`);
      
      // Apply fixes
      let fixedCode = component.tsxCode!;
      
      // Fix: Remove extra semicolons after JSX closing tags
      if (issues.includes('Extra semicolons after JSX closing tags')) {
        logVerbose('Fixing extra semicolons after JSX closing tags');
        fixedCode = fixedCode.replace(PATTERNS.EXTRA_SEMICOLONS, '$1$2');
      }
      
      // Fix: Add proper React reference
      if (issues.includes('Missing proper React reference')) {
        logVerbose('Adding proper React reference');
        fixedCode = `${TEMPLATES.REACT_REFERENCE}\n${fixedCode}`;
      }
      
      // Fix: Add proper Remotion reference
      if (issues.includes('Missing proper Remotion reference')) {
        logVerbose('Adding proper Remotion reference');
        if (fixedCode.includes(TEMPLATES.REACT_REFERENCE)) {
          fixedCode = fixedCode.replace(
            TEMPLATES.REACT_REFERENCE,
            `${TEMPLATES.REACT_REFERENCE}\n${TEMPLATES.REMOTION_REFERENCE}`
          );
        } else {
          fixedCode = `${TEMPLATES.REMOTION_REFERENCE}\n${fixedCode}`;
        }
      }
      
      // Fix: Add window.__REMOTION_COMPONENT assignment
      if (issues.includes('Missing window.__REMOTION_COMPONENT assignment')) {
        logVerbose('Adding window.__REMOTION_COMPONENT assignment');
        
        // Try to find the component name
        let componentName = null;
        
        // Try different patterns to detect component name
        const patterns = [
          /const\s+(\w+)\s*=\s*[\(\{]/, // const MyComponent = () => {...
          /export\s+(?:default\s+)?(?:function|const)\s+(\w+)/, // export function MyComponent...
          /function\s+(\w+)\s*\(/ // function MyComponent(...
        ];
        
        for (const pattern of patterns) {
          const match = fixedCode.match(pattern);
          if (match) {
            componentName = match[1];
            break;
          }
        }
        
        // If we still don't have a name, try to infer from the effect name
        if (!componentName && component.effect) {
          componentName = component.effect
            .replace(/[^a-zA-Z0-9 ]/g, '') // Remove non-alphanumeric and space
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
            
          // Ensure it's a valid identifier
          if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(componentName)) {
            componentName = 'MyComponent';
          }
        } else if (!componentName) {
          // Default fallback
          componentName = 'MyComponent';
        }
        
        // Add the assignment at the end of the file
        fixedCode += `${TEMPLATES.REMOTION_COMPONENT_ASSIGNMENT}${componentName};`;
      }
      
      // Save the fixed code
      const fixedFile = path.join(backupDir, `${component.id}-fixed.tsx`);
      fs.writeFileSync(fixedFile, fixedCode);
      logVerbose(`Fixed code saved to ${fixedFile}`);
      
      // Update the component in the database
      try {
        const updated = await db.update(customComponentJobs)
          .set({
            tsxCode: fixedCode,
            status: 'pending', // Reset to pending to trigger rebuild
            outputUrl: null,   // Clear output URL to ensure rebuild
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id))
          .returning();
        
        if (updated.length > 0) {
          console.log(`✅ Component ${component.id} updated and queued for rebuild`);
        } else {
          console.log(`❌ Failed to update component ${component.id}`);
        }
      } catch (error) {
        console.error(`Error updating component ${component.id}:`, error);
      }
    }
    
    console.log('\n✅ All components with syntax issues have been processed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Main function
async function main() {
  try {
    console.log('🔍 Bazaar-vid Component Fixer');
    console.log('============================');
    console.log(`Mode: ${checkOnly ? 'Check Only' : 'Fix'}`);
    console.log(`Verbose: ${verbose ? 'Yes' : 'No'}`);
    
    if (projectId) {
      console.log(`Project ID: ${projectId}`);
    }
    
    if (specificComponentId) {
      console.log(`Component ID: ${specificComponentId}`);
    }
    
    console.log('============================\n');
    
    await fixAllComponents();
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main(); 