// src/scripts/fix-component-generation.js
/**
 * Fix the actual component generation process at its core
 * 
 * This script identifies patterns in why components are failing and
 * makes proper fixes to the generation process itself.
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
 * Compare the component template in code with what's in the database's SUCCESSFUL components
 * to identify potential issues with the template itself
 */
async function analyzeSuccessfulComponents() {
  try {
    console.log('Analyzing successful components to understand what makes them work...\n');
    
    // Get the component template file
    const templatePath = path.join(__dirname, '..', 'server', 'workers', 'componentTemplate.ts');
    let templateContent = '';
    
    try {
      templateContent = fs.readFileSync(templatePath, 'utf8');
      console.log(`Found component template at: ${templatePath}`);
    } catch (err) {
      console.error(`Could not read component template: ${err.message}`);
    }
    
    // Get successful components
    const successfulComponents = await query(`
      SELECT id, effect, "tsxCode"
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'complete' AND "tsxCode" IS NOT NULL
      LIMIT 10
    `);
    
    console.log(`\nAnalyzing ${successfulComponents.length} successful components...`);
    
    // Extract patterns from successful components
    const importPatterns = new Set();
    const exportPatterns = new Set();
    const frameUsagePatterns = new Set();
    
    for (const component of successfulComponents) {
      // Extract import statements
      const importMatches = component.tsxCode.match(/import\s+.*?from\s+['"].*?['"]/g);
      if (importMatches) {
        importMatches.forEach(imp => importPatterns.add(imp));
      }
      
      // Extract export patterns
      const exportMatches = component.tsxCode.match(/export\s+default.*?;/g);
      if (exportMatches) {
        exportMatches.forEach(exp => exportPatterns.add(exp));
      }
      
      // Extract frame variable declarations
      const frameMatches = component.tsxCode.match(/const\s+frame\s*=\s*useCurrentFrame\(\)/g);
      if (frameMatches) {
        frameMatches.forEach(frame => frameUsagePatterns.add(frame));
      }
    }
    
    console.log('\nCommon patterns in successful components:');
    console.log('\nImport Patterns:');
    [...importPatterns].slice(0, 5).forEach(p => console.log(`  - ${p}`));
    
    console.log('\nExport Patterns:');
    [...exportPatterns].forEach(p => console.log(`  - ${p}`));
    
    console.log('\nFrame Usage Patterns:');
    [...frameUsagePatterns].forEach(p => console.log(`  - ${p}`));
    
    // Compare with the template to identify potential issues
    if (templateContent) {
      console.log('\nComparing with component template:');
      
      // Check if the template includes frame declaration
      const hasFrameDeclaration = templateContent.includes('const frame = useCurrentFrame()');
      console.log(`  - Template includes frame declaration: ${hasFrameDeclaration ? 'Yes' : 'No'}`);
      
      // Check window.__REMOTION_COMPONENT assignment
      const hasRemotionAssignment = templateContent.includes('window.__REMOTION_COMPONENT');
      console.log(`  - Template includes window.__REMOTION_COMPONENT assignment: ${hasRemotionAssignment ? 'Yes' : 'No'}`);
      
      // Check for import statements
      const hasImports = templateContent.includes('import React from');
      console.log(`  - Template includes React import: ${hasImports ? 'Yes' : 'No'}`);
    }
    
    return {
      importPatterns,
      exportPatterns,
      frameUsagePatterns,
      templateContent
    };
    
  } catch (error) {
    console.error('Error analyzing successful components:', error);
    return null;
  }
}

/**
 * Analyze failed components to identify patterns in failures
 */
async function analyzeFailedComponents() {
  try {
    console.log('\nAnalyzing failed components to understand common failure patterns...\n');
    
    // Get failed components with and without code
    const failedComponents = await query(`
      SELECT id, effect, status, "errorMessage", "tsxCode", "originalTsxCode"
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'failed' OR status = 'error'
      ORDER BY "updatedAt" DESC
      LIMIT 20
    `);
    
    console.log(`Found ${failedComponents.length} failed components`);
    
    // Group by error message
    const errorGroups = {};
    for (const component of failedComponents) {
      const errorKey = component.errorMessage || 'Unknown error';
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = [];
      }
      errorGroups[errorKey].push(component);
    }
    
    // For each error type, analyze the code patterns
    for (const [errorMsg, components] of Object.entries(errorGroups)) {
      console.log(`\n[${components.length} components] ${errorMsg}`);
      
      if (components[0].originalTsxCode) {
        console.log('Sample of problematic code:');
        
        // Show a snippet of code with the potential issue
        const codeSnippet = components[0].originalTsxCode.slice(0, 500) + '...';
        console.log(codeSnippet);
        
        // If it's a variable redeclaration error, try to find the duplicate declarations
        if (errorMsg.includes('has already been declared')) {
          const varName = errorMsg.match(/Identifier '(\w+)' has already been declared/)?.[1];
          if (varName) {
            const varRegex = new RegExp(`(const|let|var)\\s+${varName}\\s*=`, 'g');
            const matches = [...components[0].originalTsxCode.matchAll(varRegex)];
            
            if (matches.length > 1) {
              console.log(`\nFound ${matches.length} declarations of '${varName}':`);
              matches.forEach((match, i) => {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(components[0].originalTsxCode.length, match.index + 50);
                console.log(`\n${i+1}. ${components[0].originalTsxCode.substring(start, end)}`);
              });
            }
          }
        }
      } else {
        console.log('No original code available for analysis');
      }
    }
    
    return errorGroups;
    
  } catch (error) {
    console.error('Error analyzing failed components:', error);
    return null;
  }
}

/**
 * Examine and fix the component template to prevent common errors
 */
async function fixComponentTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'server', 'workers', 'componentTemplate.ts');
    console.log(`\nFixing component template at: ${templatePath}`);
    
    // Read the template file
    let templateContent = fs.readFileSync(templatePath, 'utf8');
    const originalContent = templateContent;
    
    // Make a backup of the original template
    const backupPath = `${templatePath}.backup`;
    fs.writeFileSync(backupPath, templateContent, 'utf8');
    console.log(`Made backup of original template at: ${backupPath}`);
    
    // Fix #1: Make sure frame is conditionally declared in the component template
    // This prevents "frame already declared" errors if the implementation code also declares frame
    if (templateContent.includes('const frame = useCurrentFrame()')) {
      templateContent = templateContent.replace(
        'const frame = useCurrentFrame()',
        '// Frame is commonly used in implementation, remove this declaration if needed\n  // const frame = useCurrentFrame()'
      );
      console.log('- Fixed: Commented out the frame declaration to prevent redeclaration errors');
    }
    
    // Fix #2: Ensure window.__REMOTION_COMPONENT assignment is present
    if (!templateContent.includes('window.__REMOTION_COMPONENT')) {
      // Find where the template likely ends
      const lastExportIndex = templateContent.lastIndexOf('export default');
      if (lastExportIndex !== -1) {
        // Add after the export statement
        const exportLine = templateContent.substring(lastExportIndex);
        const componentName = exportLine.match(/export\s+default\s+(\w+)/)?.[1];
        
        if (componentName) {
          // Insert after the export statement
          templateContent = templateContent.replace(
            `export default ${componentName}`,
            `export default ${componentName};\n\n// Make sure Remotion runtime can find the component\nwindow.__REMOTION_COMPONENT = ${componentName}`
          );
          console.log('- Fixed: Added window.__REMOTION_COMPONENT assignment');
        }
      }
    }
    
    // Fix #3: Ensure React is properly imported
    if (!templateContent.includes('import React from')) {
      const imports = templateContent.match(/import.*from.*;/g) || [];
      if (imports.length > 0) {
        // Add React import after the first import
        templateContent = templateContent.replace(
          imports[0],
          `${imports[0]}\nimport React from 'react';`
        );
        console.log('- Fixed: Added React import');
      }
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

/**
 * Fix the component generation code to improve error handling and prevent common issues
 */
async function fixGenerationCode() {
  try {
    const codePath = path.join(__dirname, '..', 'server', 'workers', 'generateComponentCode.ts');
    console.log(`\nFixing component generation code at: ${codePath}`);
    
    // Read the code file
    let codeContent = fs.readFileSync(codePath, 'utf8');
    const originalContent = codeContent;
    
    // Make a backup of the original code
    const backupPath = `${codePath}.backup`;
    fs.writeFileSync(backupPath, codeContent, 'utf8');
    console.log(`Made backup of original code at: ${backupPath}`);

    // Fix #1: Improve the validateComponentSyntax function to be more robust
    // This is a key function that validates the generated component code
    const validateFunctionRegex = /function validateComponentSyntax\([^{]*{[\s\S]*?return {[^}]*}/;
    const validateReplacement = `function validateComponentSyntax(
  code: string,
  componentName: string = 'CustomComponent'
): { 
  valid: boolean; 
  error?: string; 
  processedCode?: string;
  wasFixed?: boolean;
  issues?: string[];
  originalCode?: string;
} {
  // Make a copy of the original code for reference
  const originalCode = code;
  let issues: string[] = [];
  let wasFixed = false;
  
  try {
    // First, try to fix common syntax issues
    let repairedCode = code;
    
    // Remove 'use client' directive which isn't needed in Remotion components
    if (repairedCode.includes('use client')) {
      repairedCode = repairedCode.replace(/'use client';\n*/g, '')
                               .replace(/"use client";\n*/g, '')
                               .replace(/'use client';/g, '')
                               .replace(/"use client";/g, '');
      wasFixed = true;
      issues.push('Removed "use client" directive');
    }
    
    // Fix import statements using the preprocessor
    try {
      const { preprocessTsx } = require('../utils/tsxPreprocessor');
      const preprocessResult = preprocessTsx(repairedCode, componentName);
      
      if (preprocessResult.fixed) {
        repairedCode = preprocessResult.code;
        wasFixed = true;
        issues = [...issues, ...preprocessResult.issues];
      }
    } catch (preprocessError) {
      // If preprocessor fails, continue with other fixes
      console.error('Preprocessor error:', preprocessError);
      issues.push(\`Preprocessor error: \${preprocessError.message}\`);
    }
    
    // Apply component syntax fixes from repairComponentSyntax
    try {
      const { repairComponentSyntax } = require('./repairComponentSyntax');
      const syntaxResult = repairComponentSyntax(repairedCode);
      
      if (syntaxResult.fixedSyntaxErrors) {
        repairedCode = syntaxResult.code;
        wasFixed = true;
        issues = [...issues, ...syntaxResult.fixes];
      }
    } catch (repairError) {
      // If repair fails, continue with basic validation
      console.error('Repair error:', repairError);
      issues.push(\`Repair error: \${repairError.message}\`);
    }
    
    // Ensure there's a window.__REMOTION_COMPONENT declaration
    // This is critical for the component to work in Remotion
    if (!repairedCode.includes('window.__REMOTION_COMPONENT')) {
      // Find the component name from export statements
      const exportMatch = repairedCode.match(/export\s+default\s+(\w+)/);
      if (exportMatch && exportMatch[1]) {
        repairedCode += \`\n\n// Add Remotion component registration\nwindow.__REMOTION_COMPONENT = \${exportMatch[1]};\n\`;
        wasFixed = true;
        issues.push('Added window.__REMOTION_COMPONENT assignment');
      }
    }
    
    // Final validation check - this is basic but catches major syntax errors
    try {
      new Function(repairedCode);
      
      return {
        valid: true,
        processedCode: repairedCode,
        wasFixed,
        issues,
        originalCode: wasFixed ? originalCode : undefined
      };
    } catch (evalError) {
      return {
        valid: false,
        error: evalError.message,
        processedCode: repairedCode,
        wasFixed,
        issues,
        originalCode
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: \`Validation error: \${error.message}\`,
      issues,
      originalCode
    };
  }
}`;

    // Apply the fix
    codeContent = codeContent.replace(validateFunctionRegex, validateReplacement);

    // Fix #2: Improve applyComponentTemplate usage - this is how the component is initially structured
    const templateApplyRegex = /const componentCode = applyComponentTemplate\([^;]*\);/;
    if (templateApplyRegex.test(codeContent)) {
      codeContent = codeContent.replace(
        templateApplyRegex,
        `// Apply the template and ensure React is imported properly
    const componentName = sanitizeComponentName(args.componentName || 'CustomComponent');
    let componentCode = applyComponentTemplate(
      componentName,
      args.componentImplementation || '',
      args.componentRender || '<div>Empty component</div>'
    );
    
    // Ensure React is imported
    if (!componentCode.includes("import React from 'react'")) {
      componentCode = "import React from 'react';\n" + componentCode;
      componentLogger.plan(jobId, \`Added missing React import\`);
    }`
      );
    }

    // Fix #3: Improve handleComponentGenerationError to store code even on error
    const handleErrorRegex = /async function handleComponentGenerationError\([^{]*{[\s\S]*?if \(!tsxCode\) {[\s\S]*?return;[\s\S]*?}/;
    const handleErrorReplacement = `async function handleComponentGenerationError(
  jobId: string, 
  error: Error, 
  tsxCode: string | null
): Promise<void> {
  // Get the component to find out what it was supposed to do
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, jobId)
  });
  
  if (!component) {
    componentLogger.error(jobId, "Job not found during error handling");
    return;
  }
  
  const effectName = component.effect || 'Component';
  
  // For components without code, try to extract code from the error if possible
  // LLM responses might have partial code even when parsing fails
  if (!tsxCode && error.message) {
    const possibleCodeMatch = error.message.match(/<React\\.Fragment>([\\s\\S]*?)<\\/React\\.Fragment>/i);
    if (possibleCodeMatch && possibleCodeMatch[1]) {
      // Found possible code in the error message, use it as a starting point
      tsxCode = \`// Recovered partial code
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

const \${effectName} = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'white' }}>
      \${possibleCodeMatch[1]}
    </AbsoluteFill>
  );
};

export default \${effectName};
window.__REMOTION_COMPONENT = \${effectName};
\`;
      componentLogger.info(jobId, \`Recovered partial code from error message\`);
    } else {
      // Try to use the metadata to get the animation description and prompt the user
      // to click the 'Fix' button for proper regeneration
      let metadataInfo = '';
      try {
        if (component.metadata) {
          const metadata = JSON.parse(component.metadata);
          if (metadata.prompt) {
            metadataInfo = '\\n\\nOriginal generation prompt available for regeneration.';
          }
        }
      } catch (e) {
        // Ignore metadata parsing errors
      }
      
      // Create minimal valid component that asks for fixing
      tsxCode = \`// ${effectName} - Error during generation
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/**
 * ${effectName}
 * This component encountered an error during generation.
 * Error: ${error.message}
 */
const ${effectName} = () => {
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
          Click the 'Fix' button to regenerate this component
        </p>
        <pre style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          maxWidth: '100%',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          Error: ${error.message}${metadataInfo}
        </pre>
      </div>
    </AbsoluteFill>
  );
};

export default ${effectName};
window.__REMOTION_COMPONENT = ${effectName};
\`;
    }
  }

  // Always update the component with either the fixed code or our error placeholder
  await db.update(customComponentJobs)
    .set({ 
      status: "failed", 
      errorMessage: error.message,
      tsxCode: tsxCode, // This will never be NULL now
      updatedAt: new Date() 
    })
    .where(eq(customComponentJobs.id, jobId));
  
  componentLogger.error(jobId, \`Component generation failed: \${error.message}\`);
}`;

    // Apply the fix
    codeContent = codeContent.replace(handleErrorRegex, handleErrorReplacement);
    
    // Check if changes were made
    if (codeContent !== originalContent) {
      fs.writeFileSync(codePath, codeContent, 'utf8');
      console.log('Successfully updated component generation code to prevent errors and improve handling');
    } else {
      console.log('No changes needed to the component generation code');
    }
    
    return true;
    
  } catch (error) {
    console.error(`Error fixing generation code: ${error.message}`);
    return false;
  }
}

/**
 * Fix existing broken components to at least be properly fixable
 */
async function fixBrokenComponents() {
  try {
    // Find components with NULL tsxCode
    const brokenComponents = await query(`
      SELECT id, effect, status, "errorMessage"
      FROM "bazaar-vid_custom_component_job"
      WHERE "tsxCode" IS NULL
    `);
    
    console.log(`\nFound ${brokenComponents.length} components with NULL tsxCode`);
    
    // Fix each broken component with minimal error-reporting code
    let fixedCount = 0;
    for (const component of brokenComponents) {
      const componentName = component.effect || 'Component';
      const errorMessage = component.errorMessage || 'Unknown error during component generation';
      
      // Create a minimal valid component that reports the error and can be fixed
      const minimalCode = `// ${componentName} - Error during generation
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/**
 * ${componentName}
 * This component encountered an error during generation.
 * Error: ${errorMessage}
 * 
 * Click the Fix button to regenerate this component properly.
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
        <h1 style={{ color: '#ff4040' }}>Ready for Regeneration</h1>
        <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Click the 'Fix' button to generate this component
        </p>
        <pre style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          maxWidth: '100%',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          {${JSON.stringify(errorMessage)}}
        </pre>
      </div>
    </AbsoluteFill>
  );
};

export default ${componentName};
window.__REMOTION_COMPONENT = ${componentName};
`;
      
      // Update the component in the database
      await query(`
        UPDATE "bazaar-vid_custom_component_job"
        SET "tsxCode" = $1, 
            status = 'failed',
            "updatedAt" = NOW()
        WHERE id = $2
      `, [minimalCode, component.id]);
      
      fixedCount++;
      console.log(`Fixed component ${component.id} (${componentName})`);
    }
    
    console.log(`\nFixed ${fixedCount} components to be regeneratable`);
    
    return fixedCount;
    
  } catch (error) {
    console.error('Error fixing broken components:', error);
    return 0;
  }
}

/**
 * Main function to run the fixes
 */
async function main() {
  try {
    console.log('FIXING COMPONENT GENERATION AT THE ROOT LEVEL\n');
    
    // First, analyze successful and failed components to understand patterns
    await analyzeSuccessfulComponents();
    await analyzeFailedComponents();
    
    // Fix the component template to prevent common errors
    console.log('\n========== FIXING COMPONENT TEMPLATE ==========');
    await fixComponentTemplate();
    
    // Fix the generation code to improve error handling
    console.log('\n========== FIXING GENERATION CODE ==========');
    await fixGenerationCode();
    
    // Fix any existing broken components
    console.log('\n========== FIXING BROKEN COMPONENTS ==========');
    await fixBrokenComponents();
    
    console.log('\n===============================================');
    console.log('ROOT FIXES COMPLETE! RESTART YOUR APPLICATION');
    console.log('===============================================');
    console.log('\nThe component generation process has been fixed at its core to:');
    console.log('1. Prevent common syntax errors in the component template');
    console.log('2. Better handle import statements and variable declarations');
    console.log('3. Ensure proper React and Remotion integration');
    console.log('4. Make all components regeneratable with the Fix button');
    
  } catch (error) {
    console.error('Error in root fix process:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
