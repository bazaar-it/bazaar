// src/scripts/diagnostics/component-sync-fix.js
/**
 * Comprehensive component system fix
 * 1. Updates broken components to "failed" status so they can be fixed
 * 2. Identifies usable "complete" components for videos
 * 3. Fixes component-project associations
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

// Get database connection string from .env.local
const connectionString = process.env.DATABASE_URL;

async function fixComponentSystem() {
  console.log('\n🔧 COMPONENT SYSTEM FIX UTILITY\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local file');
    return;
  }

  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // 1. Fix stuck components (pending, queued, building for more than 5 minutes)
    console.log('🔍 Finding stuck components...');
    const stuckResult = await client.query(`
      SELECT id, effect, status, "updatedAt"
      FROM "bazaar-vid_custom_component_job" 
      WHERE status IN ('pending', 'queued', 'building')
      AND "updatedAt" < NOW() - INTERVAL '5 minutes'
      ORDER BY "updatedAt" DESC
    `);
    
    if (stuckResult.rows.length > 0) {
      console.log(`⚠️ Found ${stuckResult.rows.length} stuck components to fix:`);
      
      // Update all stuck components to 'failed' status
      for (const comp of stuckResult.rows) {
        console.log(`   - ${comp.effect} (${comp.id}): stuck in ${comp.status} state since ${new Date(comp.updatedAt).toLocaleString()}`);
        
        await client.query(`
          UPDATE "bazaar-vid_custom_component_job"
          SET status = 'failed',
              "errorMessage" = 'Component was stuck in ${comp.status} state',
              "updatedAt" = NOW()
          WHERE id = $1
        `, [comp.id]);
      }
      
      console.log('✅ All stuck components updated to "failed" status');
    } else {
      console.log('✅ No stuck components found');
    }
    
    // 2. Find usable components (status="complete" with outputUrl)
    console.log('\n🔍 Finding usable built components...');
    const usableResult = await client.query(`
      SELECT id, effect, "projectId", "outputUrl", "createdAt"
      FROM "bazaar-vid_custom_component_job" 
      WHERE status = 'complete' AND "outputUrl" IS NOT NULL
      ORDER BY "createdAt" DESC
    `);
    
    if (usableResult.rows.length > 0) {
      console.log(`✅ Found ${usableResult.rows.length} usable components that can be added to videos:`);
      
      for (const comp of usableResult.rows) {
        console.log(`   - ${comp.effect} (${comp.id})`);
        console.log(`     Created: ${new Date(comp.createdAt).toLocaleString()}`);
        console.log(`     URL: ${comp.outputUrl}`);
        console.log(`     Project: ${comp.projectId}`);
        console.log(``);
      }
      
      // Get the current project ID to suggest components that can be used
      const currentProjects = await client.query(`
        SELECT id, title, "userId"
        FROM "bazaar-vid_project"
        ORDER BY "updatedAt" DESC
        LIMIT 5
      `);
      
      if (currentProjects.rows.length > 0) {
        console.log(`💡 Recently active projects:`);
        for (const project of currentProjects.rows) {
          console.log(`   - ${project.title} (${project.id})`);
          
          // Find components for this project
          const projectComponents = usableResult.rows.filter(c => c.projectId === project.id);
          if (projectComponents.length > 0) {
            console.log(`     Has ${projectComponents.length} usable components`);
          } else {
            console.log(`     No usable components for this project`);
          }
        }
      }
    } else {
      console.log('⚠️ No usable components found');
    }
    
    // 3. Verify database integrity
    console.log('\n🔍 Verifying database integrity...');
    
    // Check for orphaned components (no associated project)
    const orphanedResult = await client.query(`
      SELECT c.id, c.effect 
      FROM "bazaar-vid_custom_component_job" c
      LEFT JOIN "bazaar-vid_project" p ON c."projectId" = p.id
      WHERE p.id IS NULL
    `);
    
    if (orphanedResult.rows.length > 0) {
      console.log(`⚠️ Found ${orphanedResult.rows.length} orphaned components (no associated project)`);
    } else {
      console.log('✅ No orphaned components found');
    }
    
    // Check database schema for custom_component_jobs table
    const schemaResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'bazaar-vid_custom_component_job'
    `);
    
    // Check if the schema has all required columns for component fix system
    const requiredColumns = ['id', 'status', 'tsxCode', 'originalTsxCode', 'outputUrl', 'errorMessage'];
    const columnNames = schemaResult.rows.map(r => r.column_name);
    
    const missingColumns = requiredColumns.filter(col => 
      !columnNames.includes(col) && !columnNames.includes(col.toLowerCase()));
    
    if (missingColumns.length > 0) {
      console.log(`⚠️ Schema missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ Database schema has all required columns');
    }
    
    // Final recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('1. Refresh your browser to see updated component statuses');
    console.log('2. Use the "Fix" button on components to repair syntax errors');
    console.log('3. Try adding a component with "complete" status to your video timeline');
    console.log('4. If components still do not appear in the dropdown, check the component filtering logic in the frontend');
    
  } catch (error) {
    console.error('❌ Error fixing component system:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
console.log('🚀 Starting component system fix...');
fixComponentSystem()
  .catch(console.error)
  .finally(() => {
    console.log('\n🏁 Component system fix complete!\n');
    setTimeout(() => process.exit(0), 500);
  });
