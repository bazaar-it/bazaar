// src/scripts/force-fix-component.js
/**
 * Force fix a component by directly calling the preprocessing step
 * This bypasses the UI/tRPC and applies the fix directly
 */

import pg from 'pg';
const { Pool } = pg;
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current directory for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

/**
 * Execute a SQL query and return the results
 */
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Load preprocessTsx from the compiled JS file
 */
async function loadPreprocessor() {
  try {
    // Try to import directly from the TypeScript file
    const { preprocessTsx } = await import('../server/utils/tsxPreprocessor.js');
    return preprocessTsx;
  } catch (error) {
    console.error('Error importing preprocessTsx:', error);
    // Create a simple preprocessor function as fallback
    return function manualPreprocessTsx(code, componentName) {
      console.log('Using fallback preprocessor');
      let issues = [];
      let fixed = false;
      
      // Remove "use client" directive
      if (code.includes('use client')) {
        code = code.replace(/'use client';\n*/g, '');
        code = code.replace(/"use client";\n*/g, '');
        code = code.replace(/'use client';/g, '');
        code = code.replace(/"use client";/g, '');
        issues.push('Removed "use client" directive');
        fixed = true;
      }
      
      // Fix import statements
      const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        const imports = match[1].split(',').map(imp => imp.trim());
        const source = match[2];
        const importStatements = imports.map(name => `import ${name} from "${source}";`).join('\n');
        code = code.replace(match[0], importStatements);
        issues.push('Fixed ES module import statement');
        fixed = true;
      }
      
      // Add window.__REMOTION_COMPONENT assignment if not present
      if (!code.includes('window.__REMOTION_COMPONENT')) {
        // Extract component name from export default statement
        const exportMatch = code.match(/export\s+default\s+(\w+)/);
        if (exportMatch && exportMatch[1]) {
          code += `\n\nwindow.__REMOTION_COMPONENT = ${exportMatch[1]};\n`;
          issues.push('Added window.__REMOTION_COMPONENT assignment');
          fixed = true;
        }
      }
      
      return { code, issues, fixed };
    };
  }
}

/**
 * Fix a component in the database
 */
async function fixComponent(componentId) {
  try {
    console.log(`Looking for component with ID: ${componentId}...`);
    
    // Find the component
    const components = await query(
      `SELECT id, effect, status, "tsxCode", "errorMessage"
       FROM "bazaar-vid_custom_component_job"
       WHERE id = $1`,
      [componentId]
    );
    
    if (components.length === 0) {
      console.log(`No component with ID ${componentId} found`);
      return;
    }
    
    const component = components[0];
    console.log(`Found component: ${component.id} (${component.effect})`);
    console.log(`Current status: ${component.status}`);
    
    if (!component.tsxCode) {
      console.log('This component has no code to fix!');
      return;
    }
    
    // Load the preprocessor
    const preprocessTsx = await loadPreprocessor();
    
    // Apply the preprocessing
    console.log('\nApplying syntax fixes...');
    const result = preprocessTsx(component.tsxCode, component.effect || 'Component');
    
    if (result.fixed) {
      console.log(`✅ Fixed ${result.issues.length} issues:`);
      result.issues.forEach(issue => console.log(`  - ${issue}`));
      
      // Save the fixed code
      const outputDir = path.join(process.cwd(), 'fixed-components');
      try {
        fs.mkdirSync(outputDir, { recursive: true });
      } catch (err) {
        // Directory exists, ignore
      }
      
      const fixedPath = path.join(outputDir, `${component.id}-fixed.js`);
      fs.writeFileSync(fixedPath, result.code, 'utf8');
      console.log(`\nSaved fixed code to ${fixedPath}`);
      
      // Update the component in the database directly
      console.log('\nUpdating component in database...');
      await query(
        `UPDATE "bazaar-vid_custom_component_job"
         SET "tsxCode" = $1,
             status = 'building',
             "errorMessage" = NULL,
             "updatedAt" = NOW()
         WHERE id = $2`,
        [result.code, component.id]
      );
      
      console.log(`✅ Component updated and set to 'building' status`);
      console.log('\nThe component will now be rebuilt automatically by the worker process.');
    } else {
      console.log('❌ No syntax issues found to fix');
    }
    
  } catch (error) {
    console.error('Error fixing component:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
if (process.argv.length < 3) {
  console.log('Please provide a component ID as a command line argument');
  console.log('Usage: node force-fix-component.js <componentId>');
  process.exit(1);
}

const componentId = process.argv[2];
fixComponent(componentId).catch(console.error);
