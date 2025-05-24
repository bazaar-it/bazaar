// src/scripts/commands/components/component-verify/check-component.ts
// @ts-nocheck
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
const inputArg = args[0];

if (!inputArg) {
  console.error(chalk.red('Please provide a component ID, a comma-separated list of IDs, or --all-complete as an argument.'));
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

interface ComponentCheckResult {
  id: string;
  dbFound: boolean;
  tsxFound: boolean;
  r2UrlValid?: boolean;
  r2Accessible?: boolean;
  r2IsFallback?: boolean;
  staticAnalysisIssues: string[];
  error?: string;
}

async function getComponentIdsToProcess(input: string): Promise<string[]> {
  if (input === '--all-complete') {
    console.log(chalk.blue('Fetching all components with status \'complete\'...'));
    const result = await pool.query('SELECT id FROM "bazaar-vid_custom_component_job" WHERE status = $1 ORDER BY "updatedAt" DESC', ['complete']);
    const ids = result.rows.map(row => row.id);
    console.log(chalk.green(`Found ${ids.length} 'complete' components.`));
    return ids;
  } else if (input.includes(',')) {
    return input.split(',').map(id => id.trim()).filter(id => id);
  } else {
    return [input.trim()];
  }
}

async function checkSingleComponent(componentId: string): Promise<ComponentCheckResult> {
  console.log(chalk.blue(`\n--- Checking component with ID: ${componentId} ---`));
  const result: ComponentCheckResult = {
    id: componentId,
    dbFound: false,
    tsxFound: false,
    staticAnalysisIssues: [],
  };
  
  try {
    const query = `
      SELECT * FROM "bazaar-vid_custom_component_job"
      WHERE id = $1
    `;
    const dbResult = await pool.query(query, [componentId]);
    
    if (dbResult.rows.length === 0) {
      console.error(chalk.red(`❌ Component not found in database: ${componentId}`));
      result.error = 'Not found in DB';
      return result;
    }
    result.dbFound = true;
    const component = dbResult.rows[0];
    
    console.log(chalk.green('✅ Component found in database'));
    console.log(chalk.yellow('Component details:'));
    console.log(`  ID: ${component.id}`);
    console.log(`  Status: ${component.status}`);
    console.log(`  Output URL: ${component.outputUrl || 'N/A'}`);
    console.log(`  Error Message: ${component.errorMessage || 'N/A'}`);
        
    if (component.tsxCode) {
      result.tsxFound = true;
      const tsxPath = path.join(outputDir, `${componentId}_source.tsx`);
      fs.writeFileSync(tsxPath, component.tsxCode);
      console.log(chalk.green(`  ✅ TSX code written to ${tsxPath}`));
      
      const tsxCode = component.tsxCode;
      console.log(chalk.yellow('  Analyzing component code:'));
      
      if (!tsxCode.includes('export default') && !tsxCode.includes('export const')) {
        result.staticAnalysisIssues.push('Missing export statement');
      }
      if (!tsxCode.includes('AbsoluteFill')) {
        result.staticAnalysisIssues.push('No AbsoluteFill usage found');
      }
      if (!tsxCode.includes('useCurrentFrame') && !tsxCode.includes('useVideoConfig')) {
        result.staticAnalysisIssues.push('No Remotion hooks found (useCurrentFrame, useVideoConfig)');
      }
      if (tsxCode.includes('import React from') && !tsxCode.includes('window.React')) {
        result.staticAnalysisIssues.push('Direct React import without using window.React');
      }
      if (tsxCode.includes('import {') && !tsxCode.includes('window.Remotion')) {
        result.staticAnalysisIssues.push('Direct Remotion imports without using window.Remotion');
      }
      if (!tsxCode.includes('window.__REMOTION_COMPONENT')) {
        result.staticAnalysisIssues.push('Missing window.__REMOTION_COMPONENT assignment');
      }

      if(result.staticAnalysisIssues.length > 0){
        console.log(chalk.red(`  ❌ Static analysis found ${result.staticAnalysisIssues.length} issue(s):`));
        result.staticAnalysisIssues.forEach(issue => console.log(chalk.red(`    - ${issue}`)));
      } else {
        console.log(chalk.green('  ✅ TSX code passed basic static analysis.'));
      }

    } else {
      console.log(chalk.red('  ❌ No TSX code found for this component'));
      result.error = result.error ? result.error + '; No TSX' : 'No TSX';
    }
    
    if (component.outputUrl) {
      result.r2UrlValid = true;
      try {
        console.log(chalk.yellow('\n  Attempting to fetch component from R2...'));
        const response = await fetch(component.outputUrl);
        result.r2Accessible = response.ok;
        
        if (response.ok) {
          console.log(chalk.green(`  ✅ Component accessible at URL: HTTP ${response.status}`));
          const text = await response.text();
          if (text.includes('Original component had syntax error') || text.includes('fallback')) {
            console.log(chalk.red('  ❌ The component URL serves a fallback error component'));
            result.r2IsFallback = true;
            const errorMatch = /Error details: (.+?)(?:\n|$)/.exec(text);
            if (errorMatch && errorMatch[1]) {
              console.log(chalk.red(`    Error details from fallback: ${errorMatch[1]}`));
            }
            fs.writeFileSync(path.join(outputDir, `${componentId}_fallback.js`), text);
            console.log(chalk.green(`    ✅ Fallback component saved to ${path.join(outputDir, `${componentId}_fallback.js`)}`));
          } else {
            result.r2IsFallback = false;
            console.log(chalk.green('  ✅ Component content looks valid (not a fallback)'));
            fs.writeFileSync(path.join(outputDir, `${componentId}_r2.js`), text);
            console.log(chalk.green(`    ✅ Component saved to ${path.join(outputDir, `${componentId}_r2.js`)}`));
          }
        } else {
          console.log(chalk.red(`  ❌ Component not accessible at R2 URL: HTTP ${response.status}`));
          result.error = result.error ? result.error + '; R2 Not Accessible' : 'R2 Not Accessible';
        }
      } catch (e: any) {
        result.r2Accessible = false;
        console.log(chalk.red(`  ❌ Error accessing component R2 URL: ${e.message}`));
        result.error = result.error ? result.error + `; R2 Fetch Error: ${e.message}` : `R2 Fetch Error: ${e.message}`;
      }
    } else {
        console.log(chalk.yellow('  🟡 No output URL found for component - cannot check R2.'));
        result.r2UrlValid = false;
    }
    
  } catch (e: any) {
    console.error(chalk.red(`  ❌ Error processing component ${componentId}: ${e.message}`));
    result.error = e.message;
    if (e.stack) {
      console.error(chalk.gray(e.stack));
    }
  }
  return result;
}

async function main() {
  const componentIds = await getComponentIdsToProcess(inputArg); 
  if (componentIds.length === 0) {
    console.log(chalk.yellow('No component IDs to process. Exiting.'));
    return;
  }

  console.log(chalk.inverse(`\nProcessing ${componentIds.length} component(s)...\n`));
  const allResults: ComponentCheckResult[] = [];

  for (const id of componentIds) {
    const singleResult = await checkSingleComponent(id);
    allResults.push(singleResult);
  }

  console.log(chalk.inverse('\n\n--- Overall Summary ---'));
  const totalChecked = allResults.length;
  const dbFoundCount = allResults.filter(r => r.dbFound).length;
  const tsxFoundCount = allResults.filter(r => r.tsxFound).length;
  const r2OkCount = allResults.filter(r => r.r2UrlValid && r.r2Accessible && !r.r2IsFallback).length;
  const staticAnalysisFailures = allResults.filter(r => r.staticAnalysisIssues.length > 0);
  const hardFailures = allResults.filter(r => r.error || (r.r2UrlValid && (!r.r2Accessible || r.r2IsFallback)) || r.staticAnalysisIssues.length > 0);

  console.log(`Total components processed: ${totalChecked}`);
  console.log(`Found in DB: ${dbFoundCount}/${totalChecked}`);
  console.log(`TSX code present: ${tsxFoundCount}/${totalChecked}`);
  console.log(`Successfully fetched from R2 (and not fallback): ${r2OkCount}/${allResults.filter(r=>r.r2UrlValid).length} (of those with URLs)`);
  
  if (staticAnalysisFailures.length > 0) {
    console.log(chalk.yellow(`
Components with static analysis issues (${staticAnalysisFailures.length}):`));
    staticAnalysisFailures.forEach(r => {
      console.log(chalk.yellow(`  ID: ${r.id} - Issues: ${r.staticAnalysisIssues.join(', ')}`));
    });
  }

  if (hardFailures.length > 0) {
    console.log(chalk.red(`
Components with significant issues (${hardFailures.length}):`));
    hardFailures.forEach(r => {
      const issues = [];
      if(r.error) issues.push(`Error: ${r.error}`);
      if(!r.dbFound) issues.push('Not in DB');
      else if(!r.tsxFound) issues.push('No TSX Code');
      if(r.r2UrlValid === false) issues.push('No R2 URL');
      else if(r.r2Accessible === false) issues.push('R2 URL not accessible');
      else if(r.r2IsFallback === true) issues.push('R2 serves fallback');
      if(r.staticAnalysisIssues.length > 0) issues.push(`Static Analysis: ${r.staticAnalysisIssues.join('/')}`);
      console.log(chalk.red(`  ID: ${r.id} - ${issues.join('; ')}`));
    });
  } else {
    console.log(chalk.green('\n✅ All processed components passed basic checks (DB, TSX, R2, Static Analysis).'));
  }
  console.log(chalk.inverse('--- End of Summary ---'));
}

main().catch(e => {
  console.error('Unhandled error in main:', e);
  process.exit(1);
}).finally(async () => {
  await pool.end();
  console.log(chalk.magenta('\nDatabase pool closed.'));
});