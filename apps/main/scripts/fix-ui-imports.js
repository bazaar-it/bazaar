#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// UI components that need to be updated
const uiComponents = [
  'accordion',
  'alert',
  'badge',
  'button',
  'calendar',
  'card',
  'checkbox',
  'dialog',
  'dropdown-menu',
  'icons',
  'input',
  'label',
  'popover',
  'progress',
  'select',
  'separator',
  'sheet',
  'skeleton',
  'slider',
  'spinner',
  'switch',
  'tabs',
  'textarea',
  'tooltip',
  'FeedbackButton',
  'FeedbackModal',
  'Footer',
  'SidebarFeedbackButton',
  'ThinkingAnimation'
];

// Find all TypeScript and TypeScript React files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${files.length} TypeScript files to process`);

let totalUpdated = 0;
let filesUpdated = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileUpdated = false;
  
  // Process each UI component
  uiComponents.forEach(component => {
    // Create regex to match imports from @bazaar/ui/component
    const regex = new RegExp(`from\\s+["']@bazaar/ui/${component}["']`, 'g');
    
    if (regex.test(content)) {
      fileUpdated = true;
      totalUpdated++;
      
      // Find all named imports from this component
      const importRegex = new RegExp(`import\\s+{([^}]+)}\\s+from\\s+["']@bazaar/ui/${component}["']`, 'g');
      let match;
      
      while ((match = importRegex.exec(originalContent)) !== null) {
        const imports = match[1].trim();
        console.log(`  Updating: import { ${imports} } from "@bazaar/ui/${component}" → from "@bazaar/ui"`);
      }
      
      // Replace the import
      content = content.replace(regex, 'from "@bazaar/ui"');
    }
  });
  
  // Check if file was updated and write it back
  if (fileUpdated) {
    fs.writeFileSync(file, content, 'utf8');
    filesUpdated++;
    console.log(`Updated: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\nSummary:`);
console.log(`- Files updated: ${filesUpdated}`);
console.log(`- Total imports updated: ${totalUpdated}`);

// Now let's consolidate imports where possible
console.log('\nConsolidating imports...');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Find all imports from @bazaar/ui
  const importRegex = /import\s+{\s*([^}]+)\s*}\s+from\s+["']@bazaar\/ui["'];?\s*\n?/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importedItems = match[1].split(',').map(item => item.trim()).filter(Boolean);
    imports.push(...importedItems);
  }
  
  if (imports.length > 1) {
    // Remove all individual imports
    content = content.replace(importRegex, '');
    
    // Add consolidated import at the first import position
    const firstImportMatch = /^((?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*(?:"use client";\n)?(?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*)(import[\s\S]*?$)/m;
    const uniqueImports = [...new Set(imports)].sort();
    const consolidatedImport = `import { ${uniqueImports.join(', ')} } from "@bazaar/ui";\n`;
    
    if (firstImportMatch.test(content)) {
      content = content.replace(firstImportMatch, `$1${consolidatedImport}$2`);
    } else {
      // If no imports found, add at the beginning after any comments/directives
      const directiveMatch = /^((?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*(?:"use client";\n)?(?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*)/;
      content = content.replace(directiveMatch, `$1${consolidatedImport}`);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Consolidated imports in: ${path.relative(process.cwd(), file)}`);
    }
  }
});

console.log('\nImport fix complete!');