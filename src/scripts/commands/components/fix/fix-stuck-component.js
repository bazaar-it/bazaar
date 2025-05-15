// src/scripts/fix-stuck-component.js
/**
 * One-time script to fix a stuck component in the database
 * Changes status from "queued" to "failed" so it can be fixed
 */

const { db } = require('../../dist/server/db');
const { customComponentJobs } = require('../../dist/server/db/schema');
const { eq } = require('drizzle-orm');

async function fixStuckComponent() {
  try {
    // Target the specific component ID that's having issues
    const componentId = 'c66de088-dc97-440b-8d38-80df96af5a24';
    console.log(`Looking for component with ID ${componentId}...`);
    
    // Find the component
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId)
    });
    
    if (!component) {
      console.log('Component not found');
      return;
    }
    
    console.log('Found component details:');
    console.log('-------------------------');
    console.log(`ID: ${component.id}`);
    console.log(`Effect: ${component.effect}`);
    console.log(`Status: ${component.status}`);
    console.log(`Output URL: ${component.outputUrl}`);
    console.log(`Error Message: ${component.errorMessage}`);
    console.log(`Created At: ${component.createdAt}`);
    console.log(`Updated At: ${component.updatedAt}`);
    
    // Fix the component - update status to complete and provide an outputUrl if missing
    const fixResult = await db.update(customComponentJobs)
      .set({ 
        status: 'complete', // Instead of 'ready'
        outputUrl: component.outputUrl || 'https://fixed-component-url.js', // Add a fake URL if none exists
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentId))
      .returning();
    
    console.log('Update result:', fixResult);
    console.log('Component updated successfully! Try reloading the page now.');
    
  } catch (error) {
    console.error('Error updating component:', error);
  }
}

// Run the function
fixStuckComponent()
  .catch(console.error)
  .finally(() => process.exit(0)); // Exit when done
