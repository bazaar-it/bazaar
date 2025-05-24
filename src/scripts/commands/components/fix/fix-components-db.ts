// @ts-nocheck
// src/scripts/commands/components/fix/fix-components-db.ts

import { dbUtils } from './lib/db-direct';
import fs from 'fs/promises';
import path from 'path';

// Helper function to fix common issues in component code
function fixComponentCode(code: string): string {
  // Fix 'use client' directive - remove it
  code = code.replace(/'use client';\n/g, '');
  code = code.replace(/"use client";\n/g, '');
  code = code.replace(/'use client';/g, '');
  code = code.replace(/"use client";/g, '');
  
  // Fix import statements - convert destructured imports
  code = code.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g, (match, imports, source) => {
    // Split multiple imports and create individual import statements
    const importNames = imports.split(',').map((imp: string) => imp.trim());
    return importNames.map((name: string) => `import ${name} from "${source}";`).join('\n');
  });
  
  // Fix React.createElement - ensure we're using React.createElement not a.createElement
  code = code.replace(/(\w)\.createElement/g, 'React.createElement');
  
  // Add window.__REMOTION_COMPONENT assignment if not present
  if (!code.includes('window.__REMOTION_COMPONENT')) {
    const componentName = extractComponentName(code);
    if (componentName) {
      code += `\nwindow.__REMOTION_COMPONENT = ${componentName};\n`;
    }
  }
  
  return code;
}

// Extract the component name from the code
function extractComponentName(code: string): string | null {
  // Look for export default statements
  const exportMatch = /export\s+default\s+(\w+)/.exec(code);
  if (exportMatch && exportMatch[1]) return exportMatch[1];
  
  // Look for const Component = ... followed by export default
  const constMatch = /const\s+(\w+)\s*=/.exec(code);
  if (constMatch && constMatch[1] && code.includes(`export default ${constMatch[1]}`)) return constMatch[1];
  
  return null;
}

async function main() {
  try {
    console.log('Connecting to database...');
    
    // First, let's check if there's a direct components table
    const componentsTableExists = await dbUtils.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'components'
      );
    `);
    
    let components = [];
    let isComponentsTable = false;
    
    if (componentsTableExists[0].exists) {
      console.log('Using direct components table');
      components = await dbUtils.query('SELECT id, code FROM components');
      isComponentsTable = true;
    } else {
      // Try custom component jobs table
      console.log('Components table not found, trying custom_component_job table...');
      
      const customJobsExist = await dbUtils.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'bazaar-vid_custom_component_job'
        );
      `);
      
      if (customJobsExist[0].exists) {
        console.log('Using bazaar-vid_custom_component_job table');
        components = await dbUtils.query(`
          SELECT id, "tsxCode" as code
          FROM "bazaar-vid_custom_component_job"
          WHERE status = 'success'
        `);
      } else {
        console.log('No component tables found. Please check database schema.');
        return;
      }
    }
    
    console.log(`Found ${components.length} total components`);
    
    // Create a directory to save fixed components
    const fixedDir = path.join(process.cwd(), 'fixed-components');
    try {
      await fs.mkdir(fixedDir, { recursive: true });
    } catch (err) {
      console.log('Directory already exists');
    }
    
    let fixedCount = 0;
    
    // Process each component
    for (const component of components) {
      console.log(`Examining component ${component.id}`);
      
      // Skip if no code
      if (!component.code) {
        console.log(`No code for component ${component.id}, skipping`);
        continue;
      }
      
      // Check if the component has issues
      const hasIssues = 
        component.code.includes('use client') ||
        component.code.includes('import {') ||
        !component.code.includes('window.__REMOTION_COMPONENT') ||
        /\b[a-z]\.createElement\b/.test(component.code);
      
      if (hasIssues) {
        console.log(`Found issues in component ${component.id}`);
        
        // Fix the component code
        const fixedCode = fixComponentCode(component.code);
        
        // Save original and fixed code for comparison
        await fs.writeFile(path.join(fixedDir, `${component.id}-original.js`), component.code);
        await fs.writeFile(path.join(fixedDir, `${component.id}-fixed.js`), fixedCode);
        
        // Update in database based on which table we're using
        if (isComponentsTable) {
          await dbUtils.query('UPDATE components SET code = $1 WHERE id = $2', [fixedCode, component.id]);
        } else {
          await dbUtils.query('UPDATE "bazaar-vid_custom_component_job" SET "tsxCode" = $1 WHERE id = $2', [fixedCode, component.id]);
        }
        
        console.log(`Fixed and updated component ${component.id}`);
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} components`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dbUtils.closeConnection();
  }
}

main().catch(console.error); 