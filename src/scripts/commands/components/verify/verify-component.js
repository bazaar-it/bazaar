// @ts-nocheck
// src/scripts/commands/components/verify/verify-component.js
import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import { fileURLToPath } from 'url';
import { ComponentManager } from '../../../lib/components/component-manager.js';
import { logger } from '../../../lib/logger.js';
import fetch from 'node-fetch';
import { getDb } from '../../../lib/db/utils.js';

export const description = 'Verify component integrity and R2 storage';

/**
 * Configure the command
 * @param {import('commander').Command} cmd - Commander command
 */
export function configure(cmd) {
  cmd
    .description(description)
    .argument('[componentId]', 'Component ID to verify')
    .option('-p, --project <id>', 'Verify components for a specific project')
    .option('-a, --all', 'Verify all components')
    .option('-o, --output <dir>', 'Output directory for reports', './component-reports')
    .option('--check-r2', 'Verify component exists in R2 storage')
    .option('--fix', 'Attempt to fix issues')
    .action(action);
}

/**
 * Action handler for the command
 */
/**
 * Action handler for the command
 * @param {string} [componentId] - Component ID to verify
 * @param {Object} options - Command options
 * @param {boolean} [options.all] - Whether to verify all components
 * @param {string} [options.project] - Project ID to verify components for
 * @param {string} [options.output] - Output directory for reports
 * @param {boolean} [options.checkR2] - Whether to check component existence in R2
 * @param {boolean} [options.fix] - Whether to fix issues
 */
async function action(componentId, options = {}) {
  try {
    const componentManager = new ComponentManager({ dryRun: !options.fix });
    
    logger.info('Starting component verification...');
    
    // Determine which components to verify
    let components = [];
    
    if (componentId) {
      logger.info(`Verifying specific component: ${componentId}`);
      const component = await componentManager.getComponentById(componentId);
      if (!component) {
        logger.error(`Component not found: ${componentId}`);
        process.exit(1);
      }
      components = [component];
    } else if (options.project) {
      logger.info(`Verifying components for project: ${options.project}`);
      // Adjust based on your schema - this is a placeholder
      const db = await getDb();
      components = await db.query(
        `SELECT * FROM "bazaar-vid_custom_component_job" WHERE "projectId" = $1`,
        [options.project]
      );
      components = components.rows;
    } else if (options.all) {
      logger.info('Verifying all components');
      // Get all components - adjust based on your schema
      const db = await getDb();
      components = await db.query(`SELECT * FROM "bazaar-vid_custom_component_job"`);
      components = components.rows;
    } else {
      logger.error('Please specify a component ID, project ID, or use --all');
      process.exit(1);
    }
    
    logger.info(`Found ${components.length} components to verify`);
    
    // Ensure output directory exists
    const outputDir = options.output || './component-reports';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Process each component
    const results = {
      verified: 0,
      failed: 0,
      fixed: 0,
      r2Missing: 0,
      issues: []
    };
    
    for (const component of components) {
      logger.info(`Verifying component: ${component.id}`);
      
      // Check component data integrity
      const issues = [];
      
      // Check required fields
      if (!component.code) {
        issues.push('Missing code');
      }
      
      if (!component.effect) {
        issues.push('Missing effect name');
      }
      
      // Check component status consistency
      if (component.status === 'complete' && !component.outputUrl) {
        issues.push('Component marked complete but missing outputUrl');
      }
      
      // Check R2 storage if requested
      if (options.checkR2 && component.outputUrl) {
        try {
          logger.info(`Checking R2 storage: ${component.outputUrl}`);
          const response = await fetch(component.outputUrl, { method: 'HEAD' });
          
          if (!response.ok) {
            issues.push(`R2 storage check failed: ${response.status} ${response.statusText}`);
            results.r2Missing++;
          }
        } catch (error) {
          issues.push(`R2 storage check error: ${error.message}`);
          results.r2Missing++;
        }
      }
      
      // Try to fix issues if requested
      if (issues.length > 0 && options.fix) {
        try {
          logger.info(`Attempting to fix issues for component ${component.id}`);
          
          if (issues.includes('Component marked complete but missing outputUrl')) {
            await componentManager.updateComponentStatus(component.id, 'failed', {
              error: 'Marked as failed due to missing outputUrl'
            });
            results.fixed++;
          }
          
          // Add more fixes as needed
          
        } catch (fixError) {
          logger.error(`Failed to fix component ${component.id}:`, fixError);
        }
      }
      
      // Record results
      if (issues.length > 0) {
        results.failed++;
        results.issues.push({
          id: component.id,
          issues,
          component: {
            id: component.id,
            status: component.status,
            outputUrl: component.outputUrl,
            effect: component.effect
          }
        });
      } else {
        results.verified++;
      }
    }
    
    // Write report
    const reportPath = path.join(outputDir, `verification-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    
    // Summary
    logger.info('Verification complete:');
    logger.info(`- Verified: ${results.verified}`);
    logger.info(`- Failed: ${results.failed}`);
    logger.info(`- Fixed: ${results.fixed}`);
    logger.info(`- R2 Missing: ${results.r2Missing}`);
    logger.info(`Report saved to: ${reportPath}`);
    
  } catch (error) {
    logger.error('Verification failed:', error);
    process.exit(1);
  }
}

// If this file is run directly, register the command
if (import.meta.url.endsWith(process.argv[1])) {
  const cmd = program.command('verify').description(description);
  configure(cmd);
  program.parse(process.argv);
}
