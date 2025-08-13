#!/usr/bin/env tsx
/**
 * Database Schema Diff Tool
 * Compares schema between dev and prod databases
 * 
 * Usage: tsx scripts/db-diff.ts
 */

import { sql } from 'drizzle-orm';
import { drizzle as drizzleDev } from 'drizzle-orm/neon-http';
import { drizzle as drizzleProd } from 'drizzle-orm/neon-http';
import { neon as neonDev } from '@neondatabase/serverless';
import { neon as neonProd } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Database URLs - Dev is main DATABASE_URL, Prod needs to be explicitly set
const DEV_DATABASE_URL = process.env.DATABASE_URL!;
// Uncomment PROD_DATABASE_URL in your .env.local to use this script
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL!;

if (!DEV_DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

if (!PROD_DATABASE_URL) {
  console.error('❌ PROD_DATABASE_URL not found in environment');
  console.error('   Please uncomment PROD_DATABASE_URL in your .env.local file');
  process.exit(1);
}

const sqlDev = neonDev(DEV_DATABASE_URL);
const sqlProd = neonProd(PROD_DATABASE_URL);
const dbDev = drizzleDev(sqlDev);
const dbProd = drizzleProd(sqlProd);

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getSchema(db: any, dbName: string): Promise<Map<string, TableInfo[]>> {
  const query = sql`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name LIKE 'bazaar-vid_%'
    ORDER BY table_name, ordinal_position
  `;

  console.log(`📊 Fetching schema from ${dbName}...`);
  const results = await db.execute(query) as unknown as TableInfo[];
  
  // Group by table
  const schema = new Map<string, TableInfo[]>();
  for (const row of results) {
    if (!schema.has(row.table_name)) {
      schema.set(row.table_name, []);
    }
    schema.get(row.table_name)!.push(row);
  }
  
  return schema;
}

async function compareSchemas() {
  console.log('🔍 Database Schema Comparison Tool\n');
  
  try {
    const [devSchema, prodSchema] = await Promise.all([
      getSchema(dbDev, 'DEV'),
      getSchema(dbProd, 'PROD')
    ]);

    console.log(`\n📊 Dev tables: ${devSchema.size}`);
    console.log(`📊 Prod tables: ${prodSchema.size}\n`);

    // Find new tables in dev
    const newTables: string[] = [];
    for (const table of devSchema.keys()) {
      if (!prodSchema.has(table)) {
        newTables.push(table);
      }
    }

    if (newTables.length > 0) {
      console.log('✨ NEW TABLES IN DEV (not in prod):');
      console.log('━'.repeat(50));
      newTables.forEach(table => {
        console.log(`  📦 ${table}`);
        const columns = devSchema.get(table)!;
        console.log(`     └─ ${columns.length} columns`);
      });
      console.log('');
    }

    // Find removed tables
    const removedTables: string[] = [];
    for (const table of prodSchema.keys()) {
      if (!devSchema.has(table)) {
        removedTables.push(table);
      }
    }

    if (removedTables.length > 0) {
      console.log('🗑️  TABLES IN PROD (not in dev - possibly removed or renamed):');
      console.log('━'.repeat(50));
      removedTables.forEach(table => {
        console.log(`  ❌ ${table}`);
      });
      console.log('');
    }

    // Compare columns in existing tables
    console.log('🔄 COLUMN DIFFERENCES IN EXISTING TABLES:');
    console.log('━'.repeat(50));
    
    let hasColumnDiffs = false;
    for (const [table, devColumns] of devSchema) {
      if (!prodSchema.has(table)) continue;
      
      const prodColumns = prodSchema.get(table)!;
      const devColMap = new Map(devColumns.map(c => [c.column_name, c]));
      const prodColMap = new Map(prodColumns.map(c => [c.column_name, c]));
      
      const newColumns: string[] = [];
      const removedColumns: string[] = [];
      const modifiedColumns: string[] = [];
      
      // Find new columns
      for (const [colName, colInfo] of devColMap) {
        if (!prodColMap.has(colName)) {
          newColumns.push(`${colName} (${colInfo.data_type})`);
        } else {
          // Check if column definition changed
          const prodCol = prodColMap.get(colName)!;
          if (colInfo.data_type !== prodCol.data_type || 
              colInfo.is_nullable !== prodCol.is_nullable) {
            modifiedColumns.push(`${colName}: ${prodCol.data_type} → ${colInfo.data_type}`);
          }
        }
      }
      
      // Find removed columns
      for (const colName of prodColMap.keys()) {
        if (!devColMap.has(colName)) {
          removedColumns.push(colName);
        }
      }
      
      if (newColumns.length > 0 || removedColumns.length > 0 || modifiedColumns.length > 0) {
        hasColumnDiffs = true;
        console.log(`\n📋 ${table}:`);
        if (newColumns.length > 0) {
          console.log('  ✅ New columns:', newColumns.join(', '));
        }
        if (removedColumns.length > 0) {
          console.log('  ❌ Removed columns:', removedColumns.join(', '));
        }
        if (modifiedColumns.length > 0) {
          console.log('  🔄 Modified columns:', modifiedColumns.join(', '));
        }
      }
    }
    
    if (!hasColumnDiffs) {
      console.log('  ✅ No column differences in existing tables');
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`  • ${newTables.length} new tables in dev`);
    console.log(`  • ${removedTables.length} tables only in prod`);
    console.log(`  • Column differences detected: ${hasColumnDiffs ? 'Yes' : 'No'}`);
    
    if (newTables.length > 0 || hasColumnDiffs) {
      console.log('\n⚠️  ACTION REQUIRED: Dev schema has changes that need to be migrated to prod');
    } else if (removedTables.length === 0) {
      console.log('\n✅ Schemas are in sync!');
    }

  } catch (error) {
    console.error('❌ Error comparing schemas:', error);
    process.exit(1);
  }
}

// Run the comparison
compareSchemas().then(() => {
  console.log('\n✨ Comparison complete!');
  process.exit(0);
});