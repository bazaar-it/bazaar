// src/scripts/component-verify/check-component.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Pool } from 'pg';
import chalk from 'chalk';

// ESM-compatible __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.local') });

// Get command line arguments
const args = process.argv.slice(2);
const componentId = args[0];

if (!componentId) {
  console.error(chalk.red('Please provide a component ID as argument'));
  process.exit(1);
}

// Create output directory if needed
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkComponent() {
  console.log(chalk.blue(`Checking component with ID: ${componentId}`));
  
  try {
    // Get component from database
    const query = `
      SELECT * FROM "bazaar-vid_custom_component_job"
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [componentId]);
    
    if (result.rows.length === 0) {
      console.error(chalk.red(`❌ Component not found in database: ${componentId}`));
      return;
    }
    
    const component = result.rows[0];
    
    console.log(chalk.green('✅ Component found in database'));
    console.log(chalk.yellow('Component details:'));
    console.log(`ID: ${component.id}`);
    console.log(`Status: ${component.status}`);
    console.log(`Project ID: ${component.projectId}`);
    console.log(`Effect: ${component.effect}`);
    console.log(`Created: ${component.createdAt}`);
    console.log(`Updated: ${component.updatedAt}`);
    
    if (component.outputUrl) {
      console.log(`Output URL: ${component.outputUrl}`);
    } else {
      console.log(chalk.red('❌ No output URL found - component may not be fully built'));
    }
    
    if (component.errorMessage) {
      console.log(chalk.red(`Error Message: ${component.errorMessage}`));
    }
    
    // Write TSX code to file for inspection
    if (component.tsxCode) {
      const tsxPath = path.join(outputDir, `${componentId}_source.tsx`);
      fs.writeFileSync(tsxPath, component.tsxCode);
      console.log(chalk.green(`✅ TSX code written to ${tsxPath}`));
      
      // Check for common issues
      const tsxCode = component.tsxCode;
      console.log(chalk.yellow('\nAnalyzing component code:'));
      
      if (!tsxCode.includes('export default') && !tsxCode.includes('export const')) {
        console.log(chalk.red('❌ Missing export statement - component needs "export default" or "export const"'));
      }
      
      if (!tsxCode.includes('AbsoluteFill')) {
        console.log(chalk.yellow('⚠️ No AbsoluteFill usage found - this is usually required for Remotion components'));
      }
      
      if (!tsxCode.includes('useCurrentFrame') && !tsxCode.includes('useVideoConfig')) {
        console.log(chalk.yellow('⚠️ No Remotion hooks found (useCurrentFrame, useVideoConfig)'));
      }
      
      if (tsxCode.includes('import React from') && !tsxCode.includes('window.React')) {
        console.log(chalk.red('❌ Direct React import without using window.React - this will cause issues in browser context'));
      }

      if (tsxCode.includes('import {') && !tsxCode.includes('window.Remotion')) {
        console.log(chalk.red('❌ Direct imports without using window.Remotion - this will cause issues in browser context'));
      }
      
      // Check for window.__REMOTION_COMPONENT assignment
      if (!tsxCode.includes('window.__REMOTION_COMPONENT')) {
        console.log(chalk.red('❌ Missing window.__REMOTION_COMPONENT assignment - required for component loading'));
      }
      
      console.log(chalk.yellow('\nRecommended fixes:'));
      console.log('1. Ensure the component is exported with "export default" or "export const"');
      console.log('2. Use window.React instead of importing React');
      console.log('3. Use window.Remotion hooks instead of direct imports');
      console.log('4. Add "window.__REMOTION_COMPONENT = YourComponentName" at the end of the file');
    } else {
      console.log(chalk.red('❌ No TSX code found for this component'));
    }
    
    // Check R2 URL status
    if (component.outputUrl) {
      try {
        console.log(chalk.yellow('\nAttempting to fetch component from R2...'));
        
        const response = await fetch(component.outputUrl);
        
        if (response.ok) {
          console.log(chalk.green(`✅ Component accessible at URL: HTTP ${response.status}`));
          
          // Check for fallback component in response
          const text = await response.text();
          if (text.includes('Original component had syntax error') || text.includes('fallback')) {
            console.log(chalk.red('❌ The component URL serves a fallback error component'));
            
            // Extract error details if available
            const errorMatch = text.match(/Error details: (.+?)(?:\n|$)/);
            if (errorMatch && errorMatch[1]) {
              console.log(chalk.red(`Error details: ${errorMatch[1]}`));
            }
            
            // Save the fallback component content
            fs.writeFileSync(path.join(outputDir, `${componentId}_fallback.js`), text);
            console.log(chalk.green(`✅ Fallback component saved to ${path.join(outputDir, `${componentId}_fallback.js`)}`));
          } else {
            console.log(chalk.green('✅ Component content looks valid (not a fallback)'));
            
            // Save the component content
            fs.writeFileSync(path.join(outputDir, `${componentId}_r2.js`), text);
            console.log(chalk.green(`✅ Component saved to ${path.join(outputDir, `${componentId}_r2.js`)}`));
          }
        } else {
          console.log(chalk.red(`❌ Component not accessible at URL: HTTP ${response.status}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error accessing component URL: ${error instanceof Error ? error.message : error}`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red(`Error querying database: ${error instanceof Error ? error.message : error}`));
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } finally {
    await pool.end();
  }
}

checkComponent().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
}); 