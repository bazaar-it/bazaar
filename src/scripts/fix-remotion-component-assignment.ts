/**
 * Script to find components missing the required window.__REMOTION_COMPONENT assignment
 * and fix them by adding it correctly based on component name detection
 * 
 * Usage:
 * npx tsx src/scripts/fix-remotion-component-assignment.ts [project-id]
 */

import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Get project ID from command line args (optional)
const projectId = process.argv[2];

// Pattern to detect window.__REMOTION_COMPONENT assignment
const MISSING_REMOTION_COMPONENT = /window\.__REMOTION_COMPONENT\s*=/;

// Template for the assignment to add
const REMOTION_COMPONENT_ASSIGNMENT = 
  '\n// IMPORTANT: This is required for Remotion to find the component\nwindow.__REMOTION_COMPONENT = ';

async function fixRemotionComponentAssignment() {
  try {
    console.log('Finding components missing window.__REMOTION_COMPONENT assignment...');
    
    // Build the base query to get all components
    let query = db.query.customComponentJobs.findMany({});
    
    // Add project ID filter if provided
    if (projectId) {
      query = db.query.customComponentJobs.findMany({
        where: eq(customComponentJobs.projectId, projectId as string)
      });
    }
    
    // Execute the query
    const allComponents = await query;
    
    if (allComponents.length === 0) {
      console.log('No components found.');
      return;
    }
    
    console.log(`Found ${allComponents.length} components total.`);
    
    // Create a tmp directory for backups
    const backupDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Find components missing the assignment
    const componentsNeedingFix = allComponents.filter(comp => {
      if (!comp.tsxCode) return false;
      return !MISSING_REMOTION_COMPONENT.test(comp.tsxCode);
    });
    
    if (componentsNeedingFix.length === 0) {
      console.log('✅ No components found missing window.__REMOTION_COMPONENT assignment.');
      return;
    }
    
    console.log(`Found ${componentsNeedingFix.length} components missing window.__REMOTION_COMPONENT assignment:`);
    
    // Process each component
    let fixedCount = 0;
    for (const component of componentsNeedingFix) {
      console.log(`\nFixing component: ${component.id} (${component.effect})`);
      
      if (!component.tsxCode) {
        console.log(`❌ Component has no TSX code, skipping`);
        continue;
      }
      
      // Backup the original code
      const backupFile = path.join(backupDir, `${component.id}-original.tsx`);
      fs.writeFileSync(backupFile, component.tsxCode);
      console.log(`Original code backed up to ${backupFile}`);
      
      // Try to find the component name
      let componentName = null;
      
      // Try to match a component definition like 'const MyComponent = ...'
      const componentNameMatch = component.tsxCode.match(/const\s+(\w+)\s*=\s*[\(\{]/);
      if (componentNameMatch) {
        componentName = componentNameMatch[1];
      }
      
      // If not found, try to find an exported function component
      if (!componentName) {
        const exportedComponentMatch = component.tsxCode.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
        if (exportedComponentMatch) {
          componentName = exportedComponentMatch[1];
        }
      }
      
      // If we still don't have a name, try to infer from the effect name
      if (!componentName && component.effect) {
        // Convert the effect name to a valid component name (PascalCase)
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
      const fixedCode = component.tsxCode + `${REMOTION_COMPONENT_ASSIGNMENT}${componentName};`;
      
      // Save the fixed code
      const fixedFile = path.join(backupDir, `${component.id}-fixed.tsx`);
      fs.writeFileSync(fixedFile, fixedCode);
      console.log(`Fixed code saved to ${fixedFile}`);
      
      // Update the component in the database
      try {
        await db.update(customComponentJobs)
          .set({
            tsxCode: fixedCode,
            status: 'pending', // Reset to pending to trigger rebuild
            outputUrl: null,   // Clear output URL to ensure rebuild
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id));
        
        console.log(`✅ Component ${component.id} updated and queued for rebuild`);
        fixedCount++;
      } catch (error) {
        console.error(`Error updating component ${component.id}:`, error);
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} of ${componentsNeedingFix.length} components.`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixRemotionComponentAssignment(); 