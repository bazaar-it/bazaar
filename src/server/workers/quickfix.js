// src/server/workers/quickfix.js
/**
 * Quick fix for component generation issues that's safe for production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixComponentTemplate() {
  try {
    const templatePath = path.join(__dirname, 'componentTemplate.ts');
    console.log(`Fixing component template at: ${templatePath}`);
    
    // Read the template file
    let templateContent = fs.readFileSync(templatePath, 'utf8');
    const originalContent = templateContent;
    
    // Fix #1: Make sure frame is conditionally declared in the component template
    // This prevents "frame already declared" errors if the implementation code also declares frame
    if (templateContent.includes('const frame = useCurrentFrame()')) {
      templateContent = templateContent.replace(
        'const frame = useCurrentFrame()',
        '// Frame is commonly used in implementation, remove this declaration if needed\n  // const frame = useCurrentFrame()'
      );
      console.log('- Fixed: Commented out the frame declaration to prevent redeclaration errors');
    }
    
    // Check if we made any changes
    if (templateContent !== originalContent) {
      fs.writeFileSync(templatePath, templateContent, 'utf8');
      console.log('Successfully updated component template to prevent common errors');
    } else {
      console.log('No changes needed to the component template');
    }
    
    return true;
    
  } catch (error) {
    console.error(`Error fixing component template: ${error.message}`);
    return false;
  }
}

// Run the fix
fixComponentTemplate().then(() => {
  console.log('Template fix complete. Restart your application for changes to take effect.');
});
