// src/scripts/fix-component-esm.js
/**
 * Direct database connection script to fix a stuck component
 * Uses ES modules syntax for Next.js compatibility
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize environment variables
dotenv.config();

const { Client } = pg;

// Get database connection string from .env file
const connectionString = process.env.DATABASE_URL;

async function fixStuckComponent() {
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env file');
    return;
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Find the stuck component
    const findResult = await client.query(
      "SELECT * FROM custom_component_jobs WHERE effect = 'APerfectlyRoundScene' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (findResult.rows.length === 0) {
      console.log('No component with name APerfectlyRoundScene found');
      return;
    }
    
    const component = findResult.rows[0];
    console.log('Found component:', component.id, 'Status:', component.status);
    
    // Update the component status
    const updateResult = await client.query(
      `UPDATE custom_component_jobs 
       SET status = 'failed', 
           error_message = 'Generated component has syntax errors: Cannot use import statement outside a module', 
           updated_at = NOW() 
       WHERE id = $1
       RETURNING id, status`,
      [component.id]
    );
    
    console.log('Update result:', updateResult.rows[0]);
    console.log('Component updated successfully! It should now show the Fix button.');
    
  } catch (error) {
    console.error('Error updating component:', error);
  } finally {
    await client.end();
  }
}

// Run the function
fixStuckComponent()
  .catch(console.error)
  .finally(() => {
    console.log('Done');
    // Give time for the connection to close properly
    setTimeout(() => process.exit(0), 500);
  });
