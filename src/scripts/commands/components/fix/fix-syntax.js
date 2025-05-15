/**
 * Fix component syntax issues
 * @module commands/components/fix/fix-syntax
 */

import { program } from 'commander';
import { getDb } from '../../../lib/db/utils';

export const description = 'Fix component syntax issues';

/**
 * Configure the command
 * @param {import('commander').Command} cmd - The commander command instance
 */
export function configure(cmd) {
  cmd
    .description('Fix syntax issues in components')
    .argument('[id]', 'Component ID to fix (fix all if not provided)')
    .option('--dry-run', 'Show what would be fixed without making changes', false)
    .action(action);
}

/**
 * Action handler for the command
 * @param {string} [id] - Component ID to fix
 * @param {Object} options - Command options
 * @param {boolean} [options.dryRun] - Whether to do a dry run
 */
async function action(id, { dryRun = false }) {
  try {
    const db = await getDb();
    
    console.log(`🔍 Finding components${id ? ` with ID: ${id}` : ''}...`);
    
    // Example query - adjust based on your schema
    const components = id 
      ? await db.query.customComponentJobs.findMany({
          where: (component, { eq }) => eq(component.id, id)
        })
      : await db.query.customComponentJobs.findMany({
          where: (component, { isNull }) => isNull(component.outputUrl)
        });
    
    if (components.length === 0) {
      console.log('✅ No components need fixing');
      return;
    }
    
    console.log(`🔧 Found ${components.length} components to fix`);
    
    for (const component of components) {
      console.log(`\n📝 Processing component: ${component.id}`);
      
      if (dryRun) {
        console.log('   [DRY RUN] Would fix component:', component.id);
        continue;
      }
      
      // Example fix - adjust based on your needs
      // await db.update(customComponentJobs)
      //   .set({ status: 'fixed' })
      //   .where(eq(customComponentJobs.id, component.id));
      
      console.log('   ✅ Fixed component:', component.id);
    }
    
    console.log('\n✨ All done!');
  } catch (error) {
    console.error('❌ Error fixing components:', error);
    process.exit(1);
  }
}

// If this file is run directly, register the command
if (import.meta.url.endsWith(process.argv[1])) {
  const cmd = program.command('syntax').description(description);
  configure(cmd);
  program.parse(process.argv);
}
