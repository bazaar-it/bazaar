// src/scripts/diagnostics/component-analyzer.js
/**
 * Comprehensive component analyzer for Bazaar-Vid
 * Diagnoses component issues and suggests fixes
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

// Get database connection string from .env.local
const connectionString = process.env.DATABASE_URL;

async function analyzeComponents() {
  console.log('\n========= COMPONENT SYSTEM ANALYZER =========\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local file');
    return;
  }

  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Get component table structure first
    const tableResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'bazaar-vid_custom_component_job'
      ORDER BY ordinal_position
    `);
    
    console.log(`📊 Component Table Structure (${tableResult.rows.length} columns):`);
    const columnNames = tableResult.rows.map(r => r.column_name);
    console.log('  ' + columnNames.join(', '));
    console.log('');
    
    // Get all components
    console.log('📋 Fetching all components from database...\n');
    const result = await client.query(`
      SELECT * FROM "bazaar-vid_custom_component_job" 
      ORDER BY "createdAt" DESC
    `);
    
    const components = result.rows;
    console.log(`Found ${components.length} components in database\n`);
    
    if (components.length === 0) {
      console.log('No components found. Try generating a component first.');
      return;
    }
    
    // Display component statistics
    const statusCounts = {};
    components.forEach(comp => {
      const status = comp.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('💡 Component Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} components`);
    });
    console.log('\n');
    
    // Find associated projects
    console.log('🔍 Analyzing Component-Project Relationships:');
    const projectIds = [...new Set(components.map(c => c.projectId))];
    
    const projectsResult = await client.query(`
      SELECT id, title, "userId" FROM "bazaar-vid_project"
      WHERE id = ANY($1)
    `, [projectIds]);
    
    const projectMap = {};
    projectsResult.rows.forEach(p => {
      projectMap[p.id] = p;
    });
    
    const userIds = [...new Set(projectsResult.rows.map(p => p.userId))];
    
    // Check for orphaned components (no project)
    const orphanedComponents = components.filter(c => !projectMap[c.projectId]);
    if (orphanedComponents.length > 0) {
      console.log(`⚠️ Found ${orphanedComponents.length} orphaned components (no associated project)`);
    }
    
    // Check for components with code but failed status
    const fixableComponents = components.filter(c => 
      (c.status === 'failed' || c.status === 'error' || c.status === 'queued') && 
      c.tsxCode
    );
    if (fixableComponents.length > 0) {
      console.log(`🛠️ Found ${fixableComponents.length} components that could be fixed (have code but failed status)`);
    }
    
    // Check for components with successful build but not used in videos
    const unusedComponents = components.filter(c => 
      c.status === 'complete' && c.outputUrl && !c.lastUsedAt
    );
    if (unusedComponents.length > 0) {
      console.log(`💡 Found ${unusedComponents.length} built components not used in any videos yet`);
    }
    
    console.log('\n');
    
    // Display details for each component
    console.log('🧩 Component Details:');
    components.forEach((comp, index) => {
      const project = projectMap[comp.projectId] || { title: 'Unknown Project' };
      const hasCode = comp.tsxCode ? '✓' : '✗';
      const hasOriginalCode = comp.originalTsxCode ? '✓' : '✗';
      const hasOutput = comp.outputUrl ? '✓' : '✗';
      
      console.log(`${index + 1}. ${comp.effect || 'Unnamed'} (${comp.id})`);
      console.log(`   Status: ${comp.status || 'unknown'}`);
      console.log(`   Project: ${project.title} (${comp.projectId})`);
      console.log(`   Created: ${new Date(comp.createdAt || '').toLocaleString()}`);
      console.log(`   Updated: ${new Date(comp.updatedAt || '').toLocaleString()}`);
      console.log(`   Code: ${hasCode}, Original: ${hasOriginalCode}, Output: ${hasOutput}`);
      
      if (comp.errorMessage) {
        console.log(`   Error: ${comp.errorMessage}`);
      }
      
      if (comp.fixIssues) {
        console.log(`   Fix Issues: ${comp.fixIssues}`);
      }
      
      // Show output URL if available
      if (comp.outputUrl) {
        console.log(`   Output URL: ${comp.outputUrl}`);
      }
      
      console.log("");
    });

    // Check for R2 configuration
    console.log('📁 R2 Storage Configuration:');
    if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && 
        process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
      console.log('✅ R2 configuration present in environment variables');
      console.log(`   Bucket: ${process.env.R2_BUCKET_NAME}`);
      console.log(`   Public URL: ${process.env.R2_PUBLIC_URL || 'Not configured'}`);
    } else {
      console.log('❌ R2 configuration missing or incomplete in environment variables');
    }
    console.log('\n');
    
    // Provide diagnostic summary
    console.log('🔍 DIAGNOSTIC SUMMARY:');
    
    // Issue 1: Components with no code
    const noCodeComponents = components.filter(c => !c.tsxCode);
    if (noCodeComponents.length > 0) {
      console.log(`❌ Found ${noCodeComponents.length} components with no code - these need to be regenerated`);
    }
    
    // Issue 2: Components stuck in a non-terminal state
    const stuckComponents = components.filter(c => 
      ['pending', 'building', 'queued'].includes(c.status) && 
      (new Date() - new Date(c.updatedAt)) > 5 * 60 * 1000 // Older than 5 minutes
    );
    if (stuckComponents.length > 0) {
      console.log(`⚠️ Found ${stuckComponents.length} components stuck in non-terminal states - these need manual status updates`);
      for (const comp of stuckComponents) {
        console.log(`   - ${comp.effect} (${comp.id}): stuck in ${comp.status} state since ${new Date(comp.updatedAt).toLocaleString()}`);
      }
    }
    
    // Issue 3: Components with syntax errors
    const syntaxErrorComponents = components.filter(c => 
      c.errorMessage && c.errorMessage.includes('syntax') && c.tsxCode
    );
    if (syntaxErrorComponents.length > 0) {
      console.log(`🔧 Found ${syntaxErrorComponents.length} components with syntax errors that can likely be fixed`);
    }
    
    console.log('\n');
    
    // Provide fix suggestions
    console.log('✨ RECOMMENDATIONS:');
    
    if (stuckComponents.length > 0) {
      console.log('1. Update status of stuck components:');
      console.log('   - Create a script to update component statuses from "pending/queued" to "failed"');
      console.log('   - This will make them show up in the fixable components list');
    }
    
    if (syntaxErrorComponents.length > 0) {
      console.log('2. Fix components with syntax errors:');
      console.log('   - Use the component fix system in the UI to apply automated fixes');
      console.log('   - Verify the preprocessor is handling common syntax issues correctly');
    }
    
    if (unusedComponents.length > 0) {
      console.log('3. Use built components in your videos:');
      console.log('   - You have ready-to-use components with complete status');
      console.log('   - Try adding them to your video timeline');
    }
    
  } catch (error) {
    console.error('Error analyzing components:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the script
console.log('🔍 Starting component system analysis...');
analyzeComponents()
  .catch(console.error)
  .finally(() => {
    console.log('\n🏁 Component system analysis complete.\n');
    setTimeout(() => process.exit(0), 500);
  });
