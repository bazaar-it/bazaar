#!/usr/bin/env tsx

/**
 * Sync Database Schema
 * This script compares local schema with actual database and generates migration if needed
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function getDbSchema() {
  // Get actual database schema
  const tables = await db.execute(sql`
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
      AND t.table_name LIKE 'bazaar-vid_%'
    ORDER BY t.table_name, c.ordinal_position;
  `);

  console.log('📊 Current Database Schema:');
  console.log('========================');
  
  let currentTable = '';
  for (const col of tables) {
    if (col.table_name !== currentTable) {
      currentTable = col.table_name as string;
      console.log(`\n📋 Table: ${currentTable}`);
    }
    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  }
}

async function checkMissingColumns() {
  // Check if our new columns exist
  const sceneColumns = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'bazaar-vid_scene'
      AND column_name IN ('slug', 'dominant_colors', 'first_h1_text', 'last_focused');
  `);

  const existingColumns = sceneColumns.map(r => r.column_name);
  const requiredColumns = ['slug', 'dominant_colors', 'first_h1_text', 'last_focused'];
  const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

  if (missingColumns.length > 0) {
    console.log('\n⚠️  Missing columns in scenes table:', missingColumns);
    console.log('\n📝 Run this SQL in Neon:');
    console.log('```sql');
    console.log(`ALTER TABLE "bazaar-vid_scene"`);
    missingColumns.forEach((col, i) => {
      const comma = i < missingColumns.length - 1 ? ',' : ';';
      if (col === 'slug') console.log(`ADD COLUMN "slug" VARCHAR(255)${comma}`);
      if (col === 'dominant_colors') console.log(`ADD COLUMN "dominant_colors" JSONB${comma}`);
      if (col === 'first_h1_text') console.log(`ADD COLUMN "first_h1_text" TEXT${comma}`);
      if (col === 'last_focused') console.log(`ADD COLUMN "last_focused" BOOLEAN DEFAULT FALSE${comma}`);
    });
    console.log('```');
  } else {
    console.log('\n✅ All required columns exist!');
  }
}

async function main() {
  try {
    await getDbSchema();
    await checkMissingColumns();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main();