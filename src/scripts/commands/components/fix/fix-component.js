/**
 * Fix a single component by ID
 * JavaScript version to run directly without TypeScript compilation
 * 
 * Usage: node src/scripts/fix-component.js <componentId>
 */

import pg from 'pg';
const { Pool } = pg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
 * Helper function to fix common issues in component code
 */
function fixComponentCode(code) {
  // Fix 'use client' directive - remove it completely
  code = code.replace(/'use client';\n*/g, '');
  code = code.replace(/"use client";\n*/g, '');
  code = code.replace(/'use client';/g, '');
  code = code.replace(/"use client";/g, '');
  
  // Fix import statements - convert destructured imports
  code = code.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g, (match, imports, source) => {
    // Split multiple imports and create individual import statements
    const importNames = imports.split(',').map(imp => imp.trim());
    return importNames.map(name => `import ${name} from "${source}";`).join('\n');
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

/**
 * Extract the component name from the code
 */
function extractComponentName(code) {
  // Look for export default statements
  const exportMatch = code.match(/export\s+default\s+(\w+)/);
  if (exportMatch && exportMatch[1]) return exportMatch[1];
  
  // Look for const Component = ... followed by export default
  const constMatch = code.match(/const\s+(\w+)\s*=/);
  if (constMatch && constMatch[1] && code.includes(`export default ${constMatch[1]}`)) return constMatch[1];
  
  return null;
}

/**
 * Main function 
 */
async function main() {
  // Check if a component ID was provided
  const componentId = process.argv[2];
  if (!componentId) {
    console.error('Please provide a component ID as a command line argument');
    console.error('Usage: node fix-component.js <componentId>');
    process.exit(1);
  }

  try {
    console.log(`Looking for component with ID: ${componentId}`);
    
    // Try custom_component_job table
    const customJobsExist = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bazaar-vid_custom_component_job'
      );
    `);
    
    let component;
    if (customJobsExist[0].exists) {
      const result = await query(`
        SELECT id, "tsxCode" as code, status
        FROM "bazaar-vid_custom_component_job"
        WHERE id = $1
      `, [componentId]);
      
      if (result.length > 0) {
        component = result[0];
        console.log(`Found component in bazaar-vid_custom_component_job table (status: ${component.status})`);
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
    
    // Update the component in the database
    await query(`
      UPDATE "bazaar-vid_custom_component_job" 
      SET "tsxCode" = $1 
      WHERE id = $2
    `, [fixedCode, componentId]);
    
    console.log(`Updated component in database`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 