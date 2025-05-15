// src/scripts/fix-tetris-jsx.js
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
 * Main function to run the fix
 * @returns {Promise<void>}
 */
async function main() {
  try {
    // Create SQL file
    let sql = '-- Fix stuck Tetris components JSX syntax\n';
    
    sql += `
-- First, fetch the current TSX code for each component
WITH component_code AS (
  SELECT id, "tsxCode" 
  FROM "bazaar-vid_custom_component_job"
  WHERE id IN ('69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a')
)

-- Then update the components, replacing the semicolon after </AbsoluteFill>;
UPDATE "bazaar-vid_custom_component_job"
SET 
  "tsxCode" = REPLACE(cc."tsxCode", '</AbsoluteFill>;', '</AbsoluteFill>'),
  "status" = 'building'
FROM component_code cc
WHERE "bazaar-vid_custom_component_job".id = cc.id
  AND cc."tsxCode" LIKE '%</AbsoluteFill>;%';
`;

    // Write SQL to file
    await fs.writeFile('fix-components-jsx.sql', sql);
    console.log('Created SQL file: fix-components-jsx.sql');
    
    // Run the SQL using environment variable for database URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL environment variable not found');
      process.exit(1);
    }
    
    console.log('Executing SQL to fix components...');
    try {
      const { stdout, stderr } = await exec(`psql "${dbUrl}" -f fix-components-jsx.sql`);
      
      if (stderr) {
        console.error(`SQL stderr: ${stderr}`);
      }
      
      console.log(`SQL executed successfully: ${stdout || ''}`);
      console.log('Components JSX syntax fixed and set to "building" status - ready for the build worker.');
    } catch (/** @type {any} */ error) {
      console.error(`Error executing SQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (/** @type {any} */ error) {
    console.error('Error fixing components:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();
