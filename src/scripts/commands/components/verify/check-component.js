// @ts-nocheck
// src/scripts/commands/components/verify/check-component.js
import { db } from '../server/db';
import { customComponentJobs } from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function checkComponent() {
  try {
    // Use command line argument or default to the BackgroundFadesFromScene component
    const componentId = process.argv[2] || '8d478778-d937-4677-af65-f613da8aee6b'; // BackgroundFadesFromScene component ID
    
    // Query the component
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId)
    });
    
    if (!component) {
      console.log('Component not found!');
      return;
    }
    
    // Print component info
    console.log('Component Info:');
    console.log('---------------');
    console.log(`ID: ${component.id}`);
    console.log(`Name: ${component.effect}`);
    console.log(`Status: ${component.status}`);
    console.log(`Error: ${component.errorMessage}`);
    console.log(`Has TSX Code: ${Boolean(component.tsxCode)}`);
    console.log(`TSX Code Length: ${component.tsxCode ? component.tsxCode.length : 0}`);
    console.log(`Has Original Code: ${Boolean(component.originalTsxCode)}`);
    console.log(`Created: ${component.createdAt}`);
    console.log(`Updated: ${component.updatedAt}`);
    
    // If there's no code, suggest solution
    if (!component.tsxCode) {
      console.log('\nPROBLEM: Component has no TSX code to fix!');
      console.log('SOLUTION: Need to either:');
      console.log('1. Regenerate the component entirely, or');
      console.log('2. Update the fixComponent endpoint to handle this case');
      
      // If it has errorMessage, show it
      if (component.errorMessage) {
        console.log(`\nError message: ${component.errorMessage}`);
      }
    } else {
      // We have code - check for import statements that might cause the issue
      console.log('\nChecking for problematic import statements...');
      const importStatements = component.tsxCode.match(/import\s+.*?from\s+['"].*?['"];?/g) || [];
      
      if (importStatements.length > 0) {
        console.log(`Found ${importStatements.length} import statements:`);
        importStatements.forEach(imp => console.log(`  ${imp}`));
      } else {
        console.log('No import statements found.');
      }
      
      // Look for 'use client' directive
      if(component.tsxCode.includes('use client')) {
        console.log("\nWARNING: Found 'use client' directive which may cause issues in Remotion components.");
      }
      
      // Show the full code
      console.log('\nFull Component Code:');
      console.log('---------------------------------');
      console.log(component.tsxCode);
      console.log('---------------------------------');
    }
    
  } catch (error) {
    console.error('Error checking component:', error);
  } finally {
    // Note: We don't need to close the db connection explicitly
    // as it's managed by the application lifecycle
  }
}

checkComponent();
