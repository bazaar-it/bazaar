// src/scripts/diagnostics/direct-component-list.js
/**
 * Direct database connection script to diagnose component issues
 * Uses Node.js standard library and direct database connection
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

// No longer using require for db imports due to ES module constraints
// const { db } = require('../../server/db');
// const { customComponentJobs } = require('../../server/db/schema');

async function listAllComponents() {
  console.log('\n========= COMPONENT DIAGNOSTICS =========\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local file');
    return;
  }

  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Get all components
    console.log('📋 Fetching all components from database...\n');
    const query = `
      SELECT 
        id, 
        effect, 
        status, 
        "outputUrl", 
        "errorMessage", 
        "createdAt", 
        "updatedAt",
        "projectId"
      FROM "bazaar-vid_custom_component_job"
      ORDER BY "createdAt" DESC;
    `;
    const { rows: components } = await client.query(query);
    
    console.log(`📊 Found ${components.length} components in database\n`);
    
    if (components.length === 0) {
      console.log('No components found. Try generating a component first.');
      return;
    }
    
    // Status breakdown
    /** @type {Record<string, number>} */
    const statusCounts = {};
    components.forEach(component => {
      const status = component.status || 'unknown'; // Default to 'unknown' if status is null/undefined
      if (!statusCounts[status]) {
        statusCounts[status] = 0;
      }
      statusCounts[status] += 1;
    });
    console.log('Status breakdown:');
    for (const status in statusCounts) {
      if (statusCounts.hasOwnProperty(status)) {
        console.log(`  - ${status}: ${statusCounts[status]}`);
      }
    }
    console.log('\n');
    
    // Detailed component list - only first 10
    console.log('First 10 components (most recent first):\n');
    components.slice(0, 10).forEach((component, index) => {
      console.log(`\nComponent ${index + 1}:`);
      console.log(`  ID: ${component.id}`);
      console.log(`  Status: ${component.status}`);
      console.log(`  Effect: ${typeof component.effect === 'string' ? component.effect : JSON.stringify(component.effect)}`);
      console.log(`  TSX Code: ${component.tsx_code ? 'Present' : 'Missing'}`);
      console.log(`  Original TSX Code: ${component.original_tsx_code ? 'Present' : 'Missing'}`);
      console.log(`  Output URL: ${component.outputUrl || 'Not available'}`);
      console.log(`  Project ID: ${component.projectId}`);
      console.log(`  Created: ${new Date(component.createdAt).toString()}`);
      console.log(`  Updated: ${component.updatedAt ? new Date(component.updatedAt).toString() : 'Not updated'}`);
      
      if (component.status === 'failed' || component.status === 'error') {
        console.log(`  Error: ${component.errorMessage || 'No error message available'}`);
      }
    });
    
    // Check environment variables for R2 storage
    console.log('Checking R2 storage configuration...');
    if (process.env.R2_ENDPOINT && 
        process.env.R2_ACCESS_KEY_ID && 
        process.env.R2_SECRET_ACCESS_KEY && 
        process.env.R2_BUCKET_NAME) {
      console.log('✅ R2 configuration present in environment variables');
    } else {
      console.log('❌ R2 configuration missing or incomplete in environment variables');
    }
    console.log('\n');
    
  } catch (error) {
    console.error('Error listing components:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the script
console.log('🔍 Starting component diagnostic scan...');
listAllComponents()
  .catch(console.error)
  .finally(() => {
    console.log('\n🏁 Diagnostic scan complete.\n');
    // Give time for the connection to close properly
    setTimeout(() => process.exit(0), 500);
  });
