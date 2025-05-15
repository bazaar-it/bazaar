import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);

async function main() {
  try {
    console.log('Fixing Tetris components...');
    
    // Create SQL script with proper quoting for table name with hyphen
    const sql = `
-- Fix JSX syntax errors in Tetris components and set to building status
-- This properly escapes the table name with double quotes

-- First fix AnimateVariousTetrominoScene component (ID: 69ecccb5-862c-43a7-b5a5-ddd7cf7776f3)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = REPLACE("tsxCode", E'</AbsoluteFill>;', E'</AbsoluteFill>'),
    status = 'building',
    "errorMessage" = NULL -- Clear previous error message
WHERE id = '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3';

-- Then fix OnceARowScene component (ID: 46a6e2c8-8e1f-408a-b4a8-a131ec82e48a)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = REPLACE("tsxCode", E'</AbsoluteFill>;', E'</AbsoluteFill>'),
    status = 'building',
    "errorMessage" = NULL -- Clear previous error message
WHERE id = '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a';

-- Get status after fixes
SELECT id, effect AS component_name, status, 
       LEFT("tsxCode", 50) as code_preview,
       "tsxCode" NOT LIKE '%</AbsoluteFill>;%' as syntax_fixed
FROM "bazaar-vid_custom_component_job"
WHERE id IN ('69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a');
    `;
    
    // Write SQL to file for debugging
    await fs.writeFile('fix-tetris-final.sql', sql);
    console.log('Created SQL file: fix-tetris-final.sql');
    
    // Execute SQL with proper quoting of table name that contains hyphen
    const dbUrl = process.env.DATABASE_URL;
    
    const { stdout, stderr } = await execAsync(`psql "${dbUrl}" -f fix-tetris-final.sql`);
    
    if (stderr && !stderr.toLowerCase().includes('notice') && !stderr.toLowerCase().includes('update 0')) {
      // Allow stderr for NOTICES or if no rows updated (already fixed)
      console.error(`SQL errors: ${stderr}`);
    }
    
    console.log('Fix results:');
    console.log(stdout);
    
    console.log('Components updated and set to building status (if they existed and had the error).');
    console.log('They should now be picked up by the build worker.');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

main(); 