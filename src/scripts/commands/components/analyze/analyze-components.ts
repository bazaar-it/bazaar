// src/scripts/commands/components/analyze/analyze-components.ts
// @ts-nocheck
import { dbUtils } from './lib/db-direct';
import fs from 'fs/promises';
import path from 'path';

/**
 * This script analyzes components in the database and provides detailed reports
 * of issues and patterns found in the component code.
 */
async function analyzeComponents() {
  try {
    console.log('Connecting to Neon database...');
    
    // First determine where components are stored - let's check custom_component_job
    const sql = `
      SELECT * FROM information_schema.tables 
      WHERE table_schema = 'public' AND 
            table_name LIKE '%component%' OR
            table_name LIKE '%custom%';
    `;
    
    const componentTables = await dbUtils.query(sql);
    console.log(`Found ${componentTables.length} potential component tables:`);
    componentTables.forEach(table => console.log(`- ${table.table_name}`));
    
    // First try: Check the bazaar-vid_custom_component_job table
    const customJobsExist = componentTables.some(t => t.table_name === 'bazaar-vid_custom_component_job');
    
    if (customJobsExist) {
      console.log('\nAnalyzing bazaar-vid_custom_component_job table...');
      
      // Get components with their status
      const components = await dbUtils.query(`
        SELECT id, effect, status, "tsxCode" as code, "errorMessage", "outputUrl"
        FROM "bazaar-vid_custom_component_job"
        ORDER BY "createdAt" DESC
        LIMIT 100
      `);
      
      console.log(`Found ${components.length} components`);
      console.log('\nStatus breakdown:');
      
      // Group by status
      const statusCounts: Record<string, number> = {};
      components.forEach(comp => {
        statusCounts[comp.status] = (statusCounts[comp.status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`- ${status}: ${count} components`);
      });
      
      // Analyze code patterns in successful components
      const successfulComponents = components.filter(c => c.status === 'success');
      console.log(`\nAnalyzing ${successfulComponents.length} successful components...`);
      
      if (successfulComponents.length > 0) {
        // Create analysis directory
        const analysisDir = path.join(process.cwd(), 'analysis');
        await fs.mkdir(analysisDir, { recursive: true });
        
        // Save a sample of the components for analysis
        await fs.writeFile(
          path.join(analysisDir, 'component-sample.json'), 
          JSON.stringify(successfulComponents.slice(0, 5), null, 2)
        );
        
        // Analyze for patterns in component code
        analyzeComponentPatterns(successfulComponents);
      }
      
      // Analyze error messages
      const failedComponents = components.filter(c => c.status === 'error');
      console.log(`\nAnalyzing ${failedComponents.length} failed components...`);
      
      if (failedComponents.length > 0) {
        // Group by error message
        const errorCounts: Record<string, number> = {};
        failedComponents.forEach(comp => {
          const shortError = (comp.errorMessage || '').substring(0, 50);
          errorCounts[shortError] = (errorCounts[shortError] || 0) + 1;
        });
        
        console.log('Common error types:');
        Object.entries(errorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([error, count]) => {
            console.log(`- "${error}..." (${count} occurrences)`);
          });
          
        // Save error samples
        const errorDir = path.join(process.cwd(), 'analysis', 'errors');
        await fs.mkdir(errorDir, { recursive: true });
        
        for (let i = 0; i < Math.min(5, failedComponents.length); i++) {
          const comp = failedComponents[i];
          await fs.writeFile(
            path.join(errorDir, `error-${comp.id}.txt`),
            `ERROR: ${comp.errorMessage}\n\nCODE:\n${comp.code || 'No code'}`
          );
        }
      }
    } else {
      // Check for a standalone components table (direct check)
      const componentsExist = await dbUtils.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'components'
        );
      `);
      
      if (componentsExist[0].exists) {
        console.log('\nAnalyzing components table...');
        
        // Get schema
        const schema = await dbUtils.getTableSchema('components');
        console.log('Components table schema:');
        schema.forEach(column => {
          console.log(`- ${column.column_name} (${column.data_type})`);
        });
        
        // Get sample data
        const components = await dbUtils.query(`
          SELECT * FROM components
          LIMIT 10
        `);
        
        console.log(`\nFound ${components.length} components in sample`);
        
        // Create analysis directory
        const analysisDir = path.join(process.cwd(), 'analysis');
        await fs.mkdir(analysisDir, { recursive: true });
        
        // Save the sample
        await fs.writeFile(
          path.join(analysisDir, 'components-table-sample.json'),
          JSON.stringify(components, null, 2)
        );
        
        // If components have code, analyze patterns
        if (components.length > 0 && components[0].code) {
          analyzeComponentPatterns(components);
        }
      } else {
        console.log('Could not find a standard components table.');
        console.log('Please inspect the tables listed above and modify this script accordingly.');
      }
    }
  } catch (error) {
    console.error('Error analyzing components:', error);
  } finally {
    await dbUtils.closeConnection();
  }
}

/**
 * Analyzes code patterns in a set of components and outputs findings
 */
function analyzeComponentPatterns(components: any[]) {
  console.log('\nCode Pattern Analysis:');
  
  // Initialize pattern counters
  const patterns = {
    useClientDirective: 0,
    destructuredImports: 0,
    singleLetterVars: 0,
    missingRemotionComponent: 0,
    totalWithCode: 0
  };
  
  // Analyze each component
  components.forEach(comp => {
    const code = comp.code || '';
    if (!code) return;
    
    patterns.totalWithCode++;
    
    // Check for 'use client' directive
    if (code.includes('use client')) {
      patterns.useClientDirective++;
    }
    
    // Check for destructured imports { x } from 'y'
    if (code.match(/import\s*{[^}]+}\s*from/)) {
      patterns.destructuredImports++;
    }
    
    // Check for single-letter variables using createElement
    if (code.match(/\b[a-z]\.createElement\b/)) {
      patterns.singleLetterVars++;
    }
    
    // Check for missing window.__REMOTION_COMPONENT
    if (!code.includes('window.__REMOTION_COMPONENT')) {
      patterns.missingRemotionComponent++;
    }
  });
  
  // Output findings
  console.log(`Total components with code: ${patterns.totalWithCode}`);
  console.log(`- Components with 'use client' directive: ${patterns.useClientDirective} (${percentage(patterns.useClientDirective, patterns.totalWithCode)}%)`);
  console.log(`- Components with destructured imports: ${patterns.destructuredImports} (${percentage(patterns.destructuredImports, patterns.totalWithCode)}%)`);
  console.log(`- Components with single-letter variables: ${patterns.singleLetterVars} (${percentage(patterns.singleLetterVars, patterns.totalWithCode)}%)`);
  console.log(`- Components missing window.__REMOTION_COMPONENT: ${patterns.missingRemotionComponent} (${percentage(patterns.missingRemotionComponent, patterns.totalWithCode)}%)`);
}

// Helper function to calculate percentage
function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

analyzeComponents(); 