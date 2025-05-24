// @ts-nocheck
// src/server/workers/rootFix.js
/**
 * FIX THE ROOT CAUSE of component generation issues
 * 
 * This script adds a proper fallback mechanism to the component generation process 
 * to ensure we NEVER have NULL tsxCode in the database, even when errors occur.
 */

import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
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
 * Generate a fallback component code template for when LLM generation fails
 */
function generateFallbackCode(componentName, errorMessage) {
  return `// FALLBACK COMPONENT - Generated after error: ${errorMessage}
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

/**
 * ${componentName} - Fallback version
 * This component was created as a fallback after the original generation failed.
 * Error: ${errorMessage}
 */
const ${componentName} = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '80%' }}>
        <h1 style={{ color: '#ff4040' }}>Component Generation Error</h1>
        <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          There was an error generating this component:
        </p>
        <pre style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          maxWidth: '100%',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          {errorMessage}
        </pre>
        <p style={{ marginTop: '2rem', opacity: 0.7 + (Math.sin(frame / 10) * 0.3) }}>
          Please try regenerating this component.
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Make sure to properly export the component
export default ${componentName};
window.__REMOTION_COMPONENT = ${componentName};
`;
}

/**
 * Patch the handleComponentGenerationError function by inserting the modified version into generateComponentCode.ts
 */
async function patchComponentGenerationCode() {
  const filePath = path.join(__dirname, 'generateComponentCode.ts');
  console.log(`Patching file: ${filePath}`);
  
  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Target the handleComponentGenerationError function
    const targetFunctionRegex = /async function handleComponentGenerationError\([^{]*{[\s\S]*?if \(!tsxCode\) {[\s\S]*?return;[\s\S]*?}/;
    
    // Replacement with improved error handling ensuring we never store NULL code
    const replacement = `async function handleComponentGenerationError(
  jobId: string, 
  error: Error, 
  tsxCode: string | null
): Promise<void> {
  // Get component details
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, jobId)
  });
  
  if (!component) {
    componentLogger.error(jobId, "Job not found during error handling");
    return;
  }
  
  // If no code was generated, create a fallback component
  if (!tsxCode) {
    // Generate a fallback component that at least renders an error message
    const componentName = component.effect || 'FallbackComponent';
    const fallbackCode = \`// FALLBACK COMPONENT - Generated after error: \${error.message}
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

/**
 * \${componentName} - Fallback version
 * This component was created as a fallback after the original generation failed.
 * Error: \${error.message}
 */
const \${componentName} = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '80%' }}>
        <h1 style={{ color: '#ff4040' }}>Component Generation Error</h1>
        <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          There was an error generating this component:
        </p>
        <pre style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          maxWidth: '100%',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          \${error.message}
        </pre>
        <p style={{ marginTop: '2rem', opacity: 0.7 + (Math.sin(frame / 10) * 0.3) }}>
          Please try regenerating this component.
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Make sure to properly export the component
export default \${componentName};
window.__REMOTION_COMPONENT = \${componentName};
\`;

    // Update the database with the fallback code
    await db.update(customComponentJobs)
      .set({ 
        status: "failed", 
        errorMessage: \`\${error.message} (Fallback component created)\`,
        tsxCode: fallbackCode, // We store fallback code instead of NULL
        updatedAt: new Date() 
      })
      .where(eq(customComponentJobs.id, jobId));
    
    componentLogger.error(jobId, \`Component generation failed: \${error.message} (Fallback created)\`);
    return;
  }`;
    
    // Replace the function in the file
    const updatedContent = fileContent.replace(targetFunctionRegex, replacement);
    
    // Check if replacement took place
    if (updatedContent === fileContent) {
      console.error("Failed to find and replace the handleComponentGenerationError function!");
      return false;
    }
    
    // Write the updated content back to file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Successfully patched ${filePath}`);
    
    console.log(`\nNow, let's also fix existing broken components in the database...`);
    
    // Find components with NULL tsxCode
    const brokenComponents = await query(`
      SELECT id, effect, status, "errorMessage", metadata::text
      FROM "bazaar-vid_custom_component_job"
      WHERE "tsxCode" IS NULL
    `);
    
    console.log(`\nFound ${brokenComponents.length} components with NULL tsxCode`);
    
    // Fix each broken component by adding the fallback code
    let fixedCount = 0;
    for (const component of brokenComponents) {
      const componentName = component.effect || 'FallbackComponent';
      const errorMessage = component.errorMessage || 'Unknown error during component generation';
      const fallbackCode = generateFallbackCode(componentName, errorMessage);
      
      await query(`
        UPDATE "bazaar-vid_custom_component_job"
        SET "tsxCode" = $1, 
            status = 'failed',
            "errorMessage" = $2,
            "updatedAt" = NOW()
        WHERE id = $3
      `, [fallbackCode, `${errorMessage} (Fallback component created)`, component.id]);
      
      fixedCount++;
      console.log(`Fixed component ${component.id} (${componentName})`);
    }
    
    console.log(`\nSummary: Fixed ${fixedCount} broken components by adding fallback code`);
    return true;
    
  } catch (error) {
    console.error('Error patching component generation code:', error);
    return false;
  }
}

/**
 * Fix all components with NULL tsxCode in the database
 */
async function fixBrokenComponents() {
  try {
    // Find components with NULL tsxCode
    const brokenComponents = await query(`
      SELECT id, effect, status, "errorMessage"
      FROM "bazaar-vid_custom_component_job"
      WHERE "tsxCode" IS NULL
    `);
    
    console.log(`Found ${brokenComponents.length} components with NULL tsxCode`);
    
    // Fix each broken component by adding the fallback code
    let fixedCount = 0;
    for (const component of brokenComponents) {
      const componentName = component.effect || 'FallbackComponent';
      const errorMessage = component.errorMessage || 'Unknown error during component generation';
      const fallbackCode = generateFallbackCode(componentName, errorMessage);
      
      await query(`
        UPDATE "bazaar-vid_custom_component_job"
        SET "tsxCode" = $1, 
            status = 'failed',
            "errorMessage" = $2,
            "updatedAt" = NOW()
        WHERE id = $3
      `, [fallbackCode, `${errorMessage} (Fallback component created)`, component.id]);
      
      fixedCount++;
      console.log(`Fixed component ${component.id} (${componentName})`);
    }
    
    console.log(`\nSummary: Fixed ${fixedCount} broken components by adding fallback code`);
    
  } catch (error) {
    console.error('Error fixing broken components:', error);
  }
}

/**
 * Main function to run the fixes
 */
async function main() {
  try {
    console.log('Starting root fix for component generation issues...\n');
    
    // If only fixing components is needed
    if (process.argv.includes('--fix-components-only')) {
      await fixBrokenComponents();
    } else {
      // Run both patches
      const patchResult = await patchComponentGenerationCode();
      
      if (!patchResult) {
        console.log('\nSkipping database fixes since code patch failed.');
      }
    }
    
    console.log('\nRoot fix process completed!');
    console.log('You should now restart your application for the changes to take effect.');
    
  } catch (error) {
    console.error('Error in root fix process:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
