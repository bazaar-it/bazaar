// src/scripts/fix-preprocessor.js
import * as fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function fixPreprocessor() {
  console.log('Fixing JSX semicolon issue in TSX preprocessor...');

  // Path to the preprocessor file
  const preprocessorPath = path.resolve(
    process.cwd(), 
    'src/server/utils/tsxPreprocessor.ts'
  );

  try {
    // Read the current file
    const content = await fs.readFile(preprocessorPath, 'utf8');
    console.log(`Found preprocessor file: ${preprocessorPath}`);

    // Find the fixJsxStructure function
    if (!content.includes('function fixJsxStructure')) {
      console.error('Could not find fixJsxStructure function in the preprocessor');
      return;
    }

    // Create regex to remove semicolons after JSX tags
    // This pattern specifically targets semicolons after JSX closing tags
    const newFix = `
  // Pattern 0 (NEW): Remove semicolons after JSX closing tags - this causes errors in esbuild
  const jsxSemicolonPattern = /(<\\/\\w+>);\\s*(\\)|,|{|$)/g;
  if (jsxSemicolonPattern.test(result)) {
    result = result.replace(jsxSemicolonPattern, '$1 $2');
    issues.push('Removed semicolons after JSX closing tags');
    fixed = true;
    logger.debug('[ESBUILD-FIX] Removed semicolons after JSX closing tags');
  }
`;

    // Add our new fix at the beginning of the fixJsxStructure function
    const updatedContent = content.replace(
      /(function fixJsxStructure.*?\{[\r\n]+)([\s\S]+?)(\s+\/\/ Pattern 1)/,
      `$1${newFix}$3`
    );

    // Save the fixed file
    if (updatedContent === content) {
      console.log('No changes needed - patterns already corrected');
      return;
    }

    // Create a backup
    await fs.writeFile(`${preprocessorPath}.bak`, content);
    console.log(`Created backup: ${preprocessorPath}.bak`);

    // Write the updated file
    await fs.writeFile(preprocessorPath, updatedContent);
    console.log(`Updated preprocessor with JSX semicolon fix!`);

    console.log('\nNext steps:');
    console.log('1. Restart the build worker service');
    console.log('2. Update component statuses back to "building"');
    console.log('3. Check logs to confirm fixes are working');

  } catch (error) {
    console.error('Error fixing preprocessor:', error);
  }
}

// Also create a script to set components back to "building" status after the preprocessor fix
async function resetComponentStatuses() {
  console.log('Creating script to reset component statuses...');

  const resetScript = `#!/bin/bash
# Run this after fixing the preprocessor and restarting the build worker

# Environment from .env.local
source .env.local

# Component IDs
TETRIS_COMPONENT_ID="69ecccb5-862c-43a7-b5a5-ddd7cf7776f3"
ROW_COMPONENT_ID="46a6e2c8-8e1f-408a-b4a8-a131ec82e48a"

# Update status to "building" to trigger rebuild
psql $DATABASE_URL <<SQL
UPDATE "bazaar-vid_custom_component_job"
SET "status" = 'building',
    "updatedAt" = NOW()
WHERE id IN ('$TETRIS_COMPONENT_ID', '$ROW_COMPONENT_ID');
SQL

echo "Components reset to 'building' status"
`;

  await fs.writeFile('reset-components.sh', resetScript);
  await fs.chmod('reset-components.sh', 0o755);
  console.log('Created reset-components.sh script');
}

// Run both functions
async function main() {
  await fixPreprocessor();
  await resetComponentStatuses();
}

main();
