// src/scripts/fix-specific-component.js
import { db } from '../server/db/index.js';
import { customComponentJobs } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Fix the specific component that's causing issues with missing outputUrl
 * This script directly targets the component from the error logs
 */
async function fixSpecificComponent() {
  // Target component ID from the error logs
  const componentId = 'c66de088-dc97-440b-8d38-80df96af5a24';
  
  try {
    console.log(`Looking for component with ID ${componentId}...`);
    
    // Find the component
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId)
    });
    
    if (!component) {
      console.log('Component not found');
      return;
    }
    
    console.log(`Found component details:`);
    console.log(`-------------------------`);
    console.log(`ID: ${component.id}`);
    console.log(`Name: ${component.effect}`);
    console.log(`Status: ${component.status}`);
    console.log(`Output URL: ${component.outputUrl || 'MISSING'}`);
    console.log(`Has TSX Code: ${Boolean(component.tsxCode)}`);
    console.log(`Error Message: ${component.errorMessage || 'None'}`);
    
    // Update the component to error state so it can be fixed
    await db.update(customComponentJobs)
      .set({
        status: 'error', // Change status to error so it shows the Fix button
        errorMessage: `Component was marked as ${component.status} but is missing output URL. Please rebuild.`,
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentId));
    
    console.log(`\nComponent updated successfully to 'error' status!`);
    console.log(`You can now click the "Fix" button in the UI to rebuild it.`);
    
    // Handle any other components with the same issue
    console.log(`\nLooking for other components with ready/complete status but missing outputUrl...`);
    
    const otherComponents = await db.query.customComponentJobs.findMany({
      where: eq(customComponentJobs.status, 'ready'),
      columns: {
        id: true,
        effect: true,
        status: true,
        outputUrl: true,
        errorMessage: true
      }
    });
    
    const problematicComponents = otherComponents.filter(c => !c.outputUrl);
    
    if (problematicComponents.length > 0) {
      console.log(`\nFound ${problematicComponents.length} other problematic components:`);
      
      for (const comp of problematicComponents) {
        console.log(`\n- Component: ${comp.id} (${comp.effect})`);
        console.log(`  Status: ${comp.status}`);
        console.log(`  Error: ${comp.errorMessage || 'None'}`);
        
        // Fix each component
        await db.update(customComponentJobs)
          .set({
            status: 'error',
            errorMessage: `Component was marked as ${comp.status} but is missing output URL. Please rebuild.`,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, comp.id));
        
        console.log(`  Updated to 'error' status for rebuilding`);
      }
    } else {
      console.log(`No other problematic components found.`);
    }
    
    console.log(`\nAll done! Refresh the UI and use the "Fix" buttons to rebuild components.`);
    
  } catch (error) {
    console.error('Error fixing component:', error);
  }
}

// Run the function
fixSpecificComponent()
  .catch(console.error)
  .finally(() => {
    console.log('\nScript execution completed.');
  });
