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
 * Analyze error patterns in component jobs
 */
async function analyzeErrors() {
  try {
    console.log('Analyzing component error patterns...');
    
    // Get error components
    const errorComponents = await query(`
      SELECT id, "tsxCode" as code, "errorMessage", "effect", "createdAt" 
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'error'
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);
    
    console.log(`Found ${errorComponents.length} components with errors\n`);
    
    // Group by error types
    const errorGroups = {};
    const errorPatterns = [
      { name: 'React already declared', pattern: /React.*already been declared/i },
      { name: 'useVideoConfig not defined', pattern: /useVideoConfig.*is not defined/i },
      { name: 'Syntax error', pattern: /Syntax Error/i },
      { name: 'File not found', pattern: /Cannot find module|no such file/i },
      { name: 'Use client directive', pattern: /use client.*directive/i },
      { name: 'Missing export default', pattern: /No default export.*found/i },
      { name: 'Type error', pattern: /Type error|TypeError/i },
      { name: 'Babel parse error', pattern: /babel.*parse/i },
    ];
    
    // Count error types
    errorComponents.forEach(component => {
      const error = component.errorMessage || '';
      let matched = false;
      
      for (const pattern of errorPatterns) {
        if (pattern.pattern.test(error)) {
          errorGroups[pattern.name] = errorGroups[pattern.name] || [];
          errorGroups[pattern.name].push(component.id);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        errorGroups['Other errors'] = errorGroups['Other errors'] || [];
        errorGroups['Other errors'].push(component.id);
      }
    });
    
    // Print error type counts
    console.log('=== Error Types ===');
    Object.entries(errorGroups).forEach(([type, ids]) => {
      console.log(`${type}: ${ids.length} components`);
    });
    
    // Create analysis directory
    const analysisDir = path.join(process.cwd(), 'analysis');
    try {
      await fs.mkdir(analysisDir, { recursive: true });
      await fs.mkdir(path.join(analysisDir, 'errors'), { recursive: true });
    } catch (err) {
      // Directory exists, ignore
    }
    
    // Save a sample of each error type
    console.log('\n=== Saving Error Samples ===');
    for (const [type, ids] of Object.entries(errorGroups)) {
      if (ids.length === 0) continue;
      
      // Get a sample component for this error type
      const sampleId = ids[0];
      const component = errorComponents.find(c => c.id === sampleId);
      
      if (component) {
        const sanitizedType = type.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const samplePath = path.join(analysisDir, 'errors', `sample_${sanitizedType}.txt`);
        
        const content = `Error Type: ${type}
Component ID: ${component.id}
Effect: ${component.effect}
Created: ${component.createdAt}

ERROR MESSAGE:
${component.errorMessage || 'No error message'}

CODE SAMPLE:
${component.code || 'No code available'}
`;
        
        await fs.writeFile(samplePath, content);
        console.log(`Saved sample for "${type}" to ${samplePath}`);
      }
    }
    
    // Analyze for common code patterns in error components
    console.log('\n=== Code Pattern Analysis ===');
    
    const patterns = {
      useClientDirective: 0,
      destructuredImports: 0,
      singleLetterReact: 0,
      missingRemotionComponent: 0,
      useVideoConfig: 0,
      useCurrentFrame: 0
    };
    
    errorComponents.forEach(comp => {
      if (!comp.code) return;
      
      if (comp.code.includes('use client')) {
        patterns.useClientDirective++;
      }
      
      if (comp.code.match(/import\s*{[^}]+}\s*from/)) {
        patterns.destructuredImports++;
      }
      
      if (comp.code.match(/\b[a-z]\.createElement\b/)) {
        patterns.singleLetterReact++;
      }
      
      if (!comp.code.includes('window.__REMOTION_COMPONENT')) {
        patterns.missingRemotionComponent++;
      }
      
      if (comp.code.includes('useVideoConfig')) {
        patterns.useVideoConfig++;
      }
      
      if (comp.code.includes('useCurrentFrame')) {
        patterns.useCurrentFrame++;
      }
    });
    
    console.log('Common patterns in error components:');
    console.log(`- Components with 'use client' directive: ${patterns.useClientDirective}`);
    console.log(`- Components with destructured imports: ${patterns.destructuredImports}`);
    console.log(`- Components with single-letter React variables: ${patterns.singleLetterReact}`);
    console.log(`- Components missing window.__REMOTION_COMPONENT: ${patterns.missingRemotionComponent}`);
    console.log(`- Components using useVideoConfig: ${patterns.useVideoConfig}`);
    console.log(`- Components using useCurrentFrame: ${patterns.useCurrentFrame}`);
    
    // Save pattern analysis report
    const reportPath = path.join(analysisDir, 'error_pattern_report.md');
    const report = `# Component Error Pattern Analysis

## Error Type Distribution

${Object.entries(errorGroups)
  .map(([type, ids]) => `- **${type}**: ${ids.length} components`)
  .join('\n')}

## Code Pattern Analysis

- Components with 'use client' directive: ${patterns.useClientDirective}
- Components with destructured imports: ${patterns.destructuredImports}
- Components with single-letter React variables: ${patterns.singleLetterReact}
- Components missing window.__REMOTION_COMPONENT: ${patterns.missingRemotionComponent}
- Components using useVideoConfig: ${patterns.useVideoConfig}
- Components using useCurrentFrame: ${patterns.useCurrentFrame}

## Common Issues and Fixes

Based on this analysis, here are some common issues and their fixes:

1. **'use client' directive**: This directive is valid in Next.js but causes issues in Remotion components.
   - Fix: Remove the 'use client' directive from the component.

2. **Destructured imports**: Using imports like \`import { useState } from 'react'\` causes issues.
   - Fix: Convert to individual imports like \`import useState from 'react'\`.

3. **Single-letter React variables**: When React is imported as a single letter variable (e.g., \`import r from 'react'\`), createElement calls don't work properly.
   - Fix: Ensure React is imported as \`React\` and references use the full name.

4. **Missing Remotion component registration**: The component isn't properly registered with the Remotion runtime.
   - Fix: Add \`window.__REMOTION_COMPONENT = YourComponent\` at the end of the file.

5. **useVideoConfig issues**: The component tries to use useVideoConfig but it's not properly imported or available.
   - Fix: Ensure proper import from Remotion and handle possible undefined returns.
`;
    
    await fs.writeFile(reportPath, report);
    console.log(`\nSaved comprehensive error analysis report to ${reportPath}`);
    
  } catch (error) {
    console.error('Error analyzing components:', error);
  } finally {
    await pool.end();
  }
}

analyzeErrors(); 