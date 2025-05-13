import { db } from '~/server/db';
import { customComponentJobs, animationDesignBriefs } from '~/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import logger from '~/lib/logger';

/**
 * Debug utility for inspecting custom component jobs and related data
 * Run with: npx tsx src/scripts/debug-db.ts
 */

async function main() {
  console.log('🔍 Database Debugging Tool');
  console.log('=======================\n');

  // Get command line args
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const param = args[1];

  try {
    switch (command) {
      case 'failed-components':
        await listFailedComponents();
        break;
        
      case 'component-details':
        if (!param) {
          console.error('Error: Missing component ID. Usage: npx tsx src/scripts/debug-db.ts component-details <componentId>');
          process.exit(1);
        }
        await getComponentDetails(param);
        break;
        
      case 'fix-component':
        if (!param) {
          console.error('Error: Missing component ID. Usage: npx tsx src/scripts/debug-db.ts fix-component <componentId>');
          process.exit(1);
        }
        await fixComponentStatus(param);
        break;
        
      case 'reset-builds':
        await resetFailedBuilds();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error executing command:', error);
  } finally {
    process.exit(0);
  }
}

/**
 * List all failed component builds with basic details
 */
async function listFailedComponents() {
  const failedComponents = await db.query.customComponentJobs.findMany({
    where: eq(customComponentJobs.status, 'error'),
    orderBy: [desc(customComponentJobs.updatedAt)],
    limit: 50,
  });

  console.log(`Found ${failedComponents.length} failed components:\n`);
  
  failedComponents.forEach((comp, i) => {
    console.log(`${i + 1}. ID: ${comp.id}`);
    console.log(`   Name: ${comp.effect}`);
    console.log(`   Error: ${comp.errorMessage}`);
    console.log(`   TSX: ${comp.tsxCode ? comp.tsxCode.substring(0, 100) + '...' : 'No code available'}`);
    console.log(`   Updated: ${comp.updatedAt}\n`);
  });
}

/**
 * Get detailed information about a specific component
 */
async function getComponentDetails(componentId: string) {
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, componentId),
  });

  if (!component) {
    console.log(`Component with ID ${componentId} not found`);
    return;
  }

  console.log('Component Details:');
  console.log('=================');
  console.log(`ID: ${component.id}`);
  console.log(`Name: ${component.effect}`);
  console.log(`Status: ${component.status}`);
  console.log(`Error: ${component.errorMessage || 'None'}`);
  console.log(`Retry Count: ${component.retryCount}`);
  console.log(`Created: ${component.createdAt}`);
  console.log(`Updated: ${component.updatedAt}`);
  console.log(`Output URL: ${component.outputUrl || 'None'}`);
  
  console.log('\nTSX Code:');
  console.log('=========');
  console.log(component.tsxCode);
  
  // Check for associated ADBs
  const relatedBriefs = await db.query.animationDesignBriefs.findMany({
    where: eq(animationDesignBriefs.componentJobId, componentId),
  });
  
  console.log(`\nRelated Animation Design Briefs: ${relatedBriefs.length}`);
  relatedBriefs.forEach((brief, i) => {
    console.log(`${i + 1}. ADB ID: ${brief.id}`);
    console.log(`   Project: ${brief.projectId}`);
    console.log(`   Scene: ${brief.sceneId || 'None'}`);
  });
}

/**
 * Fix a component's status to let it be rebuilt
 */
async function fixComponentStatus(componentId: string) {
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, componentId),
  });

  if (!component) {
    console.log(`Component with ID ${componentId} not found`);
    return;
  }

  // Reset to pending to allow rebuild
  await db.update(customComponentJobs)
    .set({
      status: 'pending',
      errorMessage: null,
      outputUrl: null,
      retryCount: 0,
    })
    .where(eq(customComponentJobs.id, componentId));

  console.log(`Component ${componentId} (${component.effect}) status reset to 'pending'`);
}

/**
 * Reset all failed builds to pending
 */
async function resetFailedBuilds() {
  const result = await db.update(customComponentJobs)
    .set({
      status: 'pending',
      errorMessage: null,
      outputUrl: null,
      retryCount: 0,
    })
    .where(eq(customComponentJobs.status, 'error'));

  console.log(`Reset ${result.rowCount} failed component builds to 'pending'`);
}

/**
 * Show usage help
 */
function showHelp() {
  console.log('Database Debugging Tool Commands:');
  console.log('===============================');
  console.log('npx tsx src/scripts/debug-db.ts failed-components   - List all failed component builds');
  console.log('npx tsx src/scripts/debug-db.ts component-details <id> - Show details for a specific component');
  console.log('npx tsx src/scripts/debug-db.ts fix-component <id>  - Reset a component to pending status');
  console.log('npx tsx src/scripts/debug-db.ts reset-builds        - Reset all failed builds to pending');
  console.log('npx tsx src/scripts/debug-db.ts help                - Show this help message');
}

// Run the script
main(); 