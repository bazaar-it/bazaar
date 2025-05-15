/**
 * Script to find and fix inconsistent custom components
 * 
 * This script identifies components that have "ready" or "complete" status
 * but are missing their outputUrl. It resets these components to "pending"
 * status to trigger a rebuild.
 * 
 * Usage:
 *   npx tsx src/scripts/fix-inconsistent-components.ts --dry-run  # Show issues without fixing
 *   npx tsx src/scripts/fix-inconsistent-components.ts --fix       # Fix inconsistent components
 */

import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');
const FIX_MODE = process.argv.includes('--fix');

if (!DRY_RUN && !FIX_MODE) {
  console.error('Please specify either --dry-run or --fix');
  process.exit(1);
}

async function main() {
  try {
    console.log('Finding inconsistent components...');
    
    // Find components that are marked as "ready"/"complete" but have null outputUrl
    const inconsistentComponents = await db.query.customComponentJobs.findMany({
      where: and(
        isNull(customComponentJobs.outputUrl),
        or(
          eq(customComponentJobs.status, 'ready'),
          eq(customComponentJobs.status, 'complete')
        )
      ),
    });
    
    if (inconsistentComponents.length === 0) {
      console.log('✅ No inconsistent components found. All good!');
      process.exit(0);
    }
    
    console.log(`Found ${inconsistentComponents.length} inconsistent components:`);
    
    // Display all inconsistent components
    for (const component of inconsistentComponents) {
      console.log(`- ${component.id} | ${component.effect} | Status: ${component.status} | outputUrl: ${component.outputUrl}`);
    }
    
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN: No components were fixed. Run with --fix to apply changes.');
      process.exit(0);
    }
    
    if (FIX_MODE) {
      console.log('\n🔧 Starting to fix components...');
      
      // Reset each component to "pending" status
      for (const component of inconsistentComponents) {
        console.log(`Fixing ${component.id} (${component.effect})...`);
        
        await db.update(customComponentJobs)
          .set({
            status: 'pending',
            outputUrl: null,
            errorMessage: null,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, component.id));
          
        console.log(`✅ Reset ${component.id} to pending status.`);
      }
      
      console.log('\n✅ Fixed all inconsistent components. They will be rebuilt on the next job processing cycle.');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 