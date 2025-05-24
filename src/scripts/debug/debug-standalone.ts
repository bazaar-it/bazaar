// @ts-nocheck
// src/scripts/debug/debug-standalone.ts

/**
 * Standalone component debugging tool that uses direct database access
 * This version works even without environment variables in the project
 * 
 * Usage: 
 * 1. Create a .env.local.debug file with the DATABASE_URL
 * 2. Run: npx tsx src/scripts/debug-standalone.ts <command> [params]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';
import chalk from 'chalk';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env file
const envPath = path.resolve(process.cwd(), '.env.local.debug');
const envContent = fs.existsSync(envPath) 
  ? fs.readFileSync(envPath, 'utf8') 
  : '';

// Parse env vars
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = /^([^=]+)=(.*)$/.exec(line);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

// Required env vars
if (!env.DATABASE_URL) {
  console.error(chalk.red('Error: DATABASE_URL not found in .env.local.debug file'));
  console.log('Create a .env.local.debug file with DATABASE_URL=postgres://...');
  process.exit(1);
}

// Set up the database client
const client = postgres(env.DATABASE_URL);
const db = drizzle(client);

// Define Schema
const customComponentJobs = {
  id: { name: 'id', notNull: true },
  effect: { name: 'effect', notNull: false },
  tsxCode: { name: 'tsx_code', notNull: false },
  status: { name: 'status', notNull: false },
  outputUrl: { name: 'output_url', notNull: false },
  errorMessage: { name: 'error_message', notNull: false },
  retryCount: { name: 'retry_count', notNull: false },
  createdAt: { name: 'created_at', notNull: false },
  updatedAt: { name: 'updated_at', notNull: false },
};

// Define table
const customComponentJobsTable = { name: 'custom_component_jobs', schema: 'public', columns: customComponentJobs };

// Define schema for Animation Design Briefs
const animationDesignBriefs = {
  id: { name: 'id', notNull: true },
  componentJobId: { name: 'component_job_id', notNull: false },
  // Add other fields as needed
};

// Define table
const animationDesignBriefsTable = { name: 'animation_design_briefs', schema: 'public', columns: animationDesignBriefs };

/**
 * Main function
 */
async function main() {
  console.log(chalk.blue('🔍 Standalone Database Debugging Tool'));
  console.log(chalk.blue('=================================\n'));

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
          console.error('Error: Missing component ID. Usage: npx tsx src/scripts/debug-standalone.ts component-details <componentId>');
          process.exit(1);
        }
        await getComponentDetails(param);
        break;
        
      case 'fix-component':
        if (!param) {
          console.error('Error: Missing component ID. Usage: npx tsx src/scripts/debug-standalone.ts fix-component <componentId>');
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
    // Close the DB connection
    await client.end();
    process.exit(0);
  }
}

/**
 * List all failed component builds with basic details
 */
async function listFailedComponents() {
  const query = `
    SELECT id, effect, error_message, tsx_code, updated_at
    FROM custom_component_jobs
    WHERE status = 'error'
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  
  const failedComponents = await client.unsafe(query);

  console.log(`Found ${failedComponents.length} failed components:\n`);
  
  failedComponents.forEach((comp, i) => {
    console.log(`${i + 1}. ID: ${comp.id}`);
    console.log(`   Name: ${comp.effect}`);
    console.log(`   Error: ${comp.error_message}`);
    console.log(`   TSX: ${comp.tsx_code ? comp.tsx_code.substring(0, 100) + '...' : 'No code available'}`);
    console.log(`   Updated: ${comp.updated_at}\n`);
  });
}

/**
 * Get detailed information about a specific component
 */
async function getComponentDetails(componentId: string) {
  const query = `
    SELECT * FROM custom_component_jobs
    WHERE id = $1
  `;
  
  const components = await client.unsafe(query, [componentId]);
  const component = components[0];

  if (!component) {
    console.log(`Component with ID ${componentId} not found`);
    return;
  }

  console.log('Component Details:');
  console.log('=================');
  console.log(`ID: ${component.id}`);
  console.log(`Name: ${component.effect}`);
  console.log(`Status: ${formatStatus(component.status)}`);
  console.log(`Error: ${component.error_message || 'None'}`);
  console.log(`Retry Count: ${component.retry_count}`);
  console.log(`Created: ${component.created_at}`);
  console.log(`Updated: ${component.updated_at}`);
  console.log(`Output URL: ${component.output_url || 'None'}`);
  
  console.log('\nTSX Code:');
  console.log('=========');
  console.log(component.tsx_code);
  
  // Check for associated ADBs
  const adbQuery = `
    SELECT * FROM animation_design_briefs
    WHERE component_job_id = $1
  `;
  
  const relatedBriefs = await client.unsafe(adbQuery, [componentId]);
  
  console.log(`\nRelated Animation Design Briefs: ${relatedBriefs.length}`);
  relatedBriefs.forEach((brief, i) => {
    console.log(`${i + 1}. ADB ID: ${brief.id}`);
    console.log(`   Project: ${brief.project_id}`);
    console.log(`   Scene: ${brief.scene_id || 'None'}`);
  });
}

/**
 * Fix a component's status to let it be rebuilt
 */
async function fixComponentStatus(componentId: string) {
  const query = `
    SELECT * FROM custom_component_jobs
    WHERE id = $1
  `;
  
  const components = await client.unsafe(query, [componentId]);
  const component = components[0];

  if (!component) {
    console.log(`Component with ID ${componentId} not found`);
    return;
  }

  // Reset to pending to allow rebuild
  const updateQuery = `
    UPDATE custom_component_jobs
    SET status = 'pending',
        error_message = NULL,
        output_url = NULL,
        retry_count = 0
    WHERE id = $1
  `;
  
  await client.unsafe(updateQuery, [componentId]);

  console.log(`Component ${componentId} (${component.effect}) status reset to 'pending'`);
}

/**
 * Reset all failed builds to pending
 */
async function resetFailedBuilds() {
  const updateQuery = `
    UPDATE custom_component_jobs
    SET status = 'pending',
        error_message = NULL,
        output_url = NULL,
        retry_count = 0
    WHERE status = 'error'
  `;
  
  const result = await client.unsafe(updateQuery);

  console.log(`Reset ${result.count} failed component builds to 'pending'`);
}

/**
 * Show usage help
 */
function showHelp() {
  console.log('Standalone Database Debugging Tool Commands:');
  console.log('========================================');
  console.log('npx tsx src/scripts/debug-standalone.ts failed-components   - List all failed component builds');
  console.log('npx tsx src/scripts/debug-standalone.ts component-details <id> - Show details for a specific component');
  console.log('npx tsx src/scripts/debug-standalone.ts fix-component <id>  - Reset a component to pending status');
  console.log('npx tsx src/scripts/debug-standalone.ts reset-builds        - Reset all failed builds to pending');
  console.log('npx tsx src/scripts/debug-standalone.ts help                - Show this help message');
  console.log('\nNOTE: You need to create a .env.local.debug file with your DATABASE_URL');
}

// Helper function for status formatting
function formatStatus(status: string | null): string {
  if (!status) return chalk.gray('Unknown');
  
  switch (status) {
    case 'complete':
      return chalk.green(status);
    case 'error':
      return chalk.red(status);
    case 'pending':
      return chalk.yellow(status);
    default:
      return status;
  }
}

// Run the script
main().catch(console.error); 