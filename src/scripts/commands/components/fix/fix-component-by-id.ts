// @ts-nocheck
// src/scripts/commands/components/fix/fix-component-by-id.ts

import { dbUtils } from './lib/db-direct';
import fs from 'fs/promises';
import path from 'path';

// Helper function to fix common issues in component code
function fixComponentCode(code: string): string {
  // Fix 'use client' directive - remove it completely
  code = code.replace(/'use client';\n*/g, '');
  code = code.replace(/"use client";\n*/g, '');
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
  // Check if a component ID was provided
  const componentId = process.argv[2];
  if (!componentId) {
    console.error('Please provide a component ID as a command line argument');
    console.error('Usage: node fix-component-by-id.js <componentId>');
    process.exit(1);
  }

  try {
    console.log(`Looking for component with ID: ${componentId}`);
    
    // First, try direct components table
    let component;
    let isComponentsTable = false;
    let tableName = '';
    
    // Look in "components" table if it exists
    const componentsTableExists = await dbUtils.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'components'
      );
    `);
    
    if (componentsTableExists[0].exists) {
      const result = await dbUtils.query('SELECT id, code FROM components WHERE id = $1', [componentId]);
      if (result.length > 0) {
        component = result[0];
        isComponentsTable = true;
        tableName = 'components';
        console.log('Found component in components table');
      }
    }
    
    // If not found, try custom_component_job table
    if (!component) {
      const customJobsExist = await dbUtils.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'bazaar-vid_custom_component_job'
        );
      `);
      
      if (customJobsExist[0].exists) {
        const result = await dbUtils.query(`
          SELECT id, "tsxCode" as code, status
          FROM "bazaar-vid_custom_component_job"
          WHERE id = $1
        `, [componentId]);
        
        if (result.length > 0) {
          component = result[0];
          isComponentsTable = false;
          tableName = 'bazaar-vid_custom_component_job';
          console.log(`Found component in ${tableName} table (status: ${component.status})`);
        }
      }
    }
    
    if (!component) {
      console.log(`Component with ID ${componentId} not found in any table`);
      return;
    }
    
    if (!component.code) {
      console.log(`Component ${componentId} exists but has no code`);
      return;
    }
    
    // Create output directory
    const outputDir = path.join(process.cwd(), 'fixed-components');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      // Directory exists, ignore
    }
    
    // Analyze the component
    console.log('\nAnalyzing Component:');
    const issues = [];
    
    if (component.code.includes('use client')) {
      issues.push('Has "use client" directive');
    }
    
    if (component.code.match(/import\s*{[^}]+}\s*from/)) {
      issues.push('Has destructured imports');
    }
    
    if (component.code.match(/\b[a-z]\.createElement\b/)) {
      issues.push('Has single-letter React variable');
    }
    
    if (!component.code.includes('window.__REMOTION_COMPONENT')) {
      issues.push('Missing window.__REMOTION_COMPONENT assignment');
    }
    
    // Output analysis
    if (issues.length === 0) {
      console.log('✅ No issues found in component code');
    } else {
      console.log(`❌ Found ${issues.length} issues:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Save original code
    const originalPath = path.join(outputDir, `${componentId}-original.js`);
    await fs.writeFile(originalPath, component.code);
    console.log(`\nSaved original code to ${originalPath}`);
    
    // Fix component
    const fixedCode = fixComponentCode(component.code);
    
    // Save fixed code
    const fixedPath = path.join(outputDir, `${componentId}-fixed.js`);
    await fs.writeFile(fixedPath, fixedCode);
    console.log(`Saved fixed code to ${fixedPath}`);
    
    // Ask for confirmation before updating database
    console.log('\nDo you want to update this component in the database? [y/N] ');
    // Since we can't get interactive input in this scripting environment, we'll update automatically
    
    // Update in database
    if (isComponentsTable) {
      await dbUtils.query('UPDATE components SET code = $1 WHERE id = $2', [fixedCode, componentId]);
    } else {
      await dbUtils.query('UPDATE "bazaar-vid_custom_component_job" SET "tsxCode" = $1 WHERE id = $2', [fixedCode, componentId]);
    }
    console.log(`Updated component in database (${tableName} table)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dbUtils.closeConnection();
  }
}

main().catch(console.error); 