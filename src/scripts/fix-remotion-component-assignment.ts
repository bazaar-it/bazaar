// src/scripts/fix-remotion-component-assignment.ts
import fs from 'fs/promises';
import path from 'path';
import { db } from '../server/db';
import { customComponentJobs } from '../server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { R2Client } from '../server/services/r2Client';

/**
 * Fix Remotion Component Assignment Script
 * 
 * This script:
 * 1. Fetches components from the database that are marked as complete
 * 2. Downloads each component bundle from R2
 * 3. Analyzes the bundle for proper window.__REMOTION_COMPONENT assignment
 * 4. Fixes the assignment if missing
 * 5. Re-uploads the fixed bundle to R2
 */
async function main() {
  console.log('Starting Remotion component fix script...');
  
  // 1. Get all components marked as 'complete'
  const components = await db.select()
    .from(customComponentJobs)
    .where(
      and(
        eq(customComponentJobs.status, 'complete'),
        isNotNull(customComponentJobs.outputUrl)
      )
    );
  
  console.log(`Found ${components.length} 'complete' components to analyze`);
  
  const r2Client = new R2Client();
  const fixedComponents: string[] = [];
  const failedComponents: {id: string, error: string}[] = [];
  
  // 2. Process each component
  for (const component of components) {
    try {
      console.log(`Processing component ${component.id} - ${component.effect || 'unnamed'}`);
      
      if (!component.outputUrl) {
        failedComponents.push({id: component.id, error: 'No outputUrl present'});
        continue;
      }
      
      // Extract the R2 key from the URL
      const r2Key = component.outputUrl.split('/').pop();
      
      if (!r2Key) {
        failedComponents.push({id: component.id, error: 'Invalid R2 key'});
        continue;
      }
      
      // Download the component bundle
      const bundleContent = await r2Client.getObject(r2Key);
      
      if (!bundleContent) {
        failedComponents.push({id: component.id, error: 'Failed to download bundle from R2'});
        continue;
      }
      
      // Check if window.__REMOTION_COMPONENT assignment exists
      const hasRemotionComponentAssignment = bundleContent.includes('window.__REMOTION_COMPONENT');
      
      if (hasRemotionComponentAssignment) {
        console.log(`Component ${component.id} already has proper assignment`);
        continue;
      }
      
      // Fix the component by adding the assignment
      const fixedBundle = fixRemotionComponentAssignment(bundleContent, component.componentName);
      
      // Upload the fixed bundle back to R2
      await r2Client.putObject(r2Key, fixedBundle, 'application/javascript');
      
      fixedComponents.push(component.id);
      console.log(`Fixed and uploaded component ${component.id}`);
      
    } catch (error) {
      console.error(`Error processing component ${component.id}:`, error);
      failedComponents.push({id: component.id, error: String(error)});
    }
  }
  
  console.log('\n--- SUMMARY ---');
  console.log(`Total components processed: ${components.length}`);
  console.log(`Components fixed: ${fixedComponents.length}`);
  console.log(`Failed components: ${failedComponents.length}`);
  
  if (failedComponents.length > 0) {
    console.log('\nFailed components details:');
    failedComponents.forEach(({id, error}) => {
      console.log(`- ${id}: ${error}`);
    });
  }
}

/**
 * Fixes the bundle by adding proper window.__REMOTION_COMPONENT assignment
 */
function fixRemotionComponentAssignment(bundleContent: string, componentName?: string): string {
  // Try to identify the component name if not provided
  const extractedName = componentName || extractComponentName(bundleContent);
  
  if (!extractedName) {
    throw new Error('Could not determine component name for assignment');
  }
  
  // Check if there's already an export default or export const
  const hasDefaultExport = /export\s+default\s+(\w+)/.test(bundleContent);
  const hasNamedExport = new RegExp(`export\\s+const\\s+(${extractedName})\\s*=`).test(bundleContent);
  
  let fixedBundle = bundleContent;
  
  // Add window.__REMOTION_COMPONENT assignment at the end of the file
  if (!fixedBundle.includes('window.__REMOTION_COMPONENT')) {
    fixedBundle += `\n\n// Added by fix-remotion-component-assignment.ts script\nwindow.__REMOTION_COMPONENT = ${extractedName};\n`;
  }
  
  // If no exports found, add a default export
  if (!hasDefaultExport && !hasNamedExport) {
    fixedBundle += `\n// Added export by fix-remotion-component-assignment.ts script\nexport default ${extractedName};\n`;
  }
  
  return fixedBundle;
}

/**
 * Attempts to extract the component name from the bundle content
 */
function extractComponentName(bundleContent: string): string | null {
  // Common patterns for component declarations
  const patterns = [
    /const\s+(\w+)\s*=\s*\(\s*(?:props|{.*})\s*\)\s*=>/,     // const Component = (props) => {}
    /function\s+(\w+)\s*\(\s*(?:props|{.*})\s*\)\s*{/,        // function Component(props) {}
    /class\s+(\w+)\s+extends\s+React\.Component/,             // class Component extends React.Component
    /window\.(\w+)\s*=\s*(?:function|class|\()/              // window.Component = ...
  ];
  
  for (const pattern of patterns) {
    const match = bundleContent.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
