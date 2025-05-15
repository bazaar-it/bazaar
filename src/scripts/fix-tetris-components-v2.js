// src/scripts/fix-tetris-components-v2.js
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const exec = promisify(execCallback);

// Component IDs from the Tetris project
/** @type {string[]} */
const COMPONENT_IDS = [
  '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', // AnimateVariousTetrominoScene
  '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a'  // OnceARowScene
];

/**
 * Fix component JSX syntax errors and update database
 * @param {string} componentId - Component ID to fix
 * @returns {Promise<boolean>} - Success status
 */
async function fixComponent(componentId) {
  try {
    // Get the component code first
    const getCodeSql = `
SELECT "tsxCode" FROM "bazaar-vid_custom_component_job" WHERE id = '${componentId}';
`;

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not found');
    }
    
    // Get the current code
    const { stdout: codeResult } = await exec(`psql "${dbUrl}" -t -c "${getCodeSql}"`);
    
    if (!codeResult || !codeResult.trim()) {
      console.log(`Component ${componentId} has no code to fix`);
      return false;
    }
    
    // Extract the code and clean up whitespace/quotes
    let code = codeResult.trim();
    
    // Fix the specific esbuild error: '</AbsoluteFill>; ' -> '</AbsoluteFill>'
    const originalCode = code;
    code = code.replace(/(<\/\w+>);(\s+)/g, '$1$2');
    
    // Fix other common JSX syntax errors that might be present
    code = code.replace(/(<\/\w+>),(\s+)/g, '$1$2');  // Remove commas after closing tags
    
    if (code === originalCode) {
      console.log(`No syntax errors found in component ${componentId}`);
      
      // Even if no changes, set to building status to retry build
      const updateStatusSql = `
UPDATE "bazaar-vid_custom_component_job" SET status = 'building' WHERE id = '${componentId}';
`;
      await exec(`psql "${dbUrl}" -c "${updateStatusSql}"`);
      console.log(`Updated component ${componentId} status to 'building'`);
      return true;
    }
    
    // Escape single quotes for SQL
    const escapedCode = code.replace(/'/g, "''");
    
    // Update the component with fixed code
    const updateSql = `
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = '${escapedCode}', status = 'building'
WHERE id = '${componentId}';
`;

    await exec(`psql "${dbUrl}" -c "${updateSql}"`);
    console.log(`Fixed syntax errors and updated component ${componentId}`);
    return true;
  } catch (/** @type {any} */ error) {
    console.error(`Error fixing component ${componentId}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Main function to fix all components
 * @returns {Promise<void>}
 */
async function main() {
  try {
    console.log('Starting to fix Tetris components with JSX syntax errors...');
    
    let successCount = 0;
    for (const componentId of COMPONENT_IDS) {
      const success = await fixComponent(componentId);
      if (success) successCount++;
    }
    
    console.log(`Successfully fixed ${successCount} of ${COMPONENT_IDS.length} components`);
    console.log('Components are now in "building" status and will be picked up by the build worker.');

    // Show final status
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const statusSql = `
SELECT id, effect, status FROM "bazaar-vid_custom_component_job" 
WHERE id IN ('${COMPONENT_IDS.join("','")}');
`;
      const { stdout } = await exec(`psql "${dbUrl}" -c "${statusSql}"`);
      console.log('\nCurrent component status:');
      console.log(stdout);
    }
  } catch (/** @type {any} */ error) {
    console.error('Error in main process:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();
