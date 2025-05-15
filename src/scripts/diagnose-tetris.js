// src/scripts/diagnose-tetris.js
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const exec = promisify(execCallback);

// Component IDs from the Tetris project
const COMPONENT_IDS = [
  '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3', // AnimateVariousTetrominoScene
  '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a'  // OnceARowScene
];

async function main() {
  try {
    // Create SQL file for diagnosis
    let sql = `-- Diagnose Tetris components
SELECT 
  id, 
  status, 
  "projectId",
  effect as component_name,
  "errorMessage",
  LENGTH("tsxCode") as code_length,
  "tsxCode" 
FROM "bazaar-vid_custom_component_job"
WHERE id IN ('${COMPONENT_IDS[0]}', '${COMPONENT_IDS[1]}');
`;

    // Write SQL to file
    await fs.writeFile('diagnose-components.sql', sql);
    console.log('Created SQL file: diagnose-components.sql');
    
    // Run the SQL using environment variable for database URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL environment variable not found');
      process.exit(1);
    }
    
    console.log('Executing SQL to diagnose components...');
    try {
      const { stdout, stderr } = await exec(`psql "${dbUrl}" -f diagnose-components.sql`);
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.error(`SQL stderr: ${stderr}`);
      }
      
      console.log('Components diagnosis:');
      console.log(stdout || '');
      
      // Extract the code from the output to inspect the JSX issue
      const codeMatch = stdout.match(/tsxcode\s*\|\s*(\/\/ src\/remotion[\s\S]+?)(?=\(|$)/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].trim();
        
        // Find specific syntax issues
        if (code.includes('</AbsoluteFill>;')) {
          console.log('\nIssue found: Invalid JSX syntax - semicolon after closing JSX tag: </AbsoluteFill>;');
          console.log('Fix: Remove the semicolon after the closing tag');
        }
        
        // Look for other potential JSX syntax issues
        const lines = code.split('\n');
        lines.forEach((line, i) => {
          if (line.match(/>\s*;/) || line.match(/>\s*,/)) {
            console.log(`\nIssue found on line ${i+1}: Invalid JSX syntax: ${line.trim()}`);
          }
        });
      }
    } catch (/** @type {any} */ error) {
      console.error(`Error executing SQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (/** @type {any} */ error) {
    console.error('Error diagnosing components:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main();
