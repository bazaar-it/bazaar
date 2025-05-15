// src/scripts/fix-ready-components.ts
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Fix components that are marked as "ready" but missing outputUrl
 * by resetting them to "pending" status to trigger a rebuild
 */
async function fixReadyComponents() {
  console.log('🔧 Finding components with "ready" status but missing outputUrl...');
  
  try {
    // Find all affected components
    const componentsToFix = await db.query.customComponentJobs.findMany({
      where: and(
        eq(customComponentJobs.status, 'ready'),
        isNull(customComponentJobs.outputUrl)
      )
    });
    
    if (componentsToFix.length === 0) {
      console.log('✅ No affected components found. Everything looks good!');
      return;
    }
    
    console.log(`Found ${componentsToFix.length} components with "ready" status but missing outputUrl:`);
    
    for (const component of componentsToFix) {
      console.log(`- ID: ${component.id}`);
      console.log(`  Effect: ${component.effect}`);
      console.log(`  Created: ${component.createdAt?.toISOString()}`);
      console.log('---');
    }
    
    console.log('\nResetting components to "pending" status to trigger a rebuild...');
    
    for (const component of componentsToFix) {
      // Reset component to "pending" status
      await db.update(customComponentJobs)
        .set({
          status: 'pending',
          errorMessage: 'Component was marked as ready but had no output URL. Rebuilding.',
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, component.id));
        
      console.log(`✅ Reset component ${component.id} (${component.effect}) to pending status`);
    }
    
    console.log('\n🎉 All affected components have been reset to "pending" status.');
    console.log('They will now be rebuilt when you refresh the component panel.');
    
  } catch (error) {
    console.error('Error fixing components:', error);
  }
}

// Execute the function
fixReadyComponents()
  .then(() => {
    console.log('Script completed. You can now return to the browser and refresh the page.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
