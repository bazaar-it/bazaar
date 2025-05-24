/**
 * Script to find components with 'ready'/'complete' status but missing outputUrl values
 * and fix them by generating proper R2 URLs and updating the database
 * 
 * Usage:
 * npx tsx src/scripts/fix-missing-outputUrl.ts [project-id]
 */

import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { env } from '~/env';

// Get project ID from command line args (optional)
const projectId = process.argv[2];

async function fixMissingOutputUrls() {
  try {
    console.log('Finding components with missing outputUrl values...');
    
    // Build the query
    let query = db.query.customComponentJobs.findMany({
      where: and(
        or(
          eq(customComponentJobs.status, 'ready'),
          eq(customComponentJobs.status, 'complete')
        ),
        isNull(customComponentJobs.outputUrl)
      ),
    });
    
    // Add project ID filter if provided
    if (projectId) {
      query = db.query.customComponentJobs.findMany({
        where: and(
          eq(customComponentJobs.projectId, projectId),
          or(
            eq(customComponentJobs.status, 'ready'),
            eq(customComponentJobs.status, 'complete')
          ),
          isNull(customComponentJobs.outputUrl)
        ),
      });
    }
    
    // Execute the query
    const componentsWithMissingUrls = await query;
    
    if (componentsWithMissingUrls.length === 0) {
      console.log('✅ No components found with missing outputUrl values.');
      return;
    }
    
    console.log(`Found ${componentsWithMissingUrls.length} components with missing outputUrl values:`);
    
    // Show the affected components
    componentsWithMissingUrls.forEach((comp, index) => {
      console.log(`${index + 1}. ID: ${comp.id}, Name: ${comp.effect}, Status: ${comp.status}`);
    });
    
    // Fix each component by generating proper R2 URL and updating the database
    for (const component of componentsWithMissingUrls) {
      console.log(`\nFixing component: ${component.id} (${component.effect})`);
      
      // Generate R2 URL based on component ID and R2 public URL
      const r2PublicUrl = env.R2_PUBLIC_URL.endsWith('/') ? env.R2_PUBLIC_URL : `${env.R2_PUBLIC_URL}/`;
      const generatedOutputUrl = `${r2PublicUrl}custom-components/${component.id}.js`;
      
      console.log(`Generated outputUrl: ${generatedOutputUrl}`);
      
      try {
        // Check if file exists in R2 (we can't do this directly from here)
        console.log('Assuming file exists in R2 (cannot verify directly)');
        
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
    process.exit(1);
  }
}

fixMissingOutputUrls(); 