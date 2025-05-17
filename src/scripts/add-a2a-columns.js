// src/scripts/add-a2a-columns.js
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function addA2AColumns() {
  console.log('Adding A2A columns to bazaar-vid_custom_component_job table...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // SQL to add all columns with IF NOT EXISTS
    const sql = `
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "task_id" TEXT;
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "internal_status" VARCHAR(50);
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "requires_input" BOOLEAN DEFAULT FALSE;
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "input_type" TEXT;
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "task_state" JSONB;
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "artifacts" JSONB;
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "history" JSONB;
      ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "sse_enabled" BOOLEAN DEFAULT FALSE;
      
      -- Create index for task_id if it doesn't exist
      CREATE INDEX IF NOT EXISTS "custom_component_job_task_id_idx" ON "bazaar-vid_custom_component_job" ("task_id");
    `;

    await client.query(sql);
    console.log('Successfully added A2A columns to the table!');

    // Verify the columns exist
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bazaar-vid_custom_component_job'
      AND column_name IN ('task_id', 'internal_status', 'requires_input', 'input_type', 'task_state', 'artifacts', 'history', 'sse_enabled');
    `);

    console.log('Verified columns:');
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

addA2AColumns().catch(console.error);
