#!/usr/bin/env tsx
/**
 * Generate Complete Migration Script
 * Creates a SQL file with ALL differences between dev and prod
 * Including tables, columns, indexes, constraints
 * 
 * Usage: tsx scripts/generate-full-migration.ts
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const DEV_DATABASE_URL = process.env.DATABASE_URL!;
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL!;

if (!DEV_DATABASE_URL || !PROD_DATABASE_URL) {
  console.error('❌ Both DATABASE_URL and PROD_DATABASE_URL must be set');
  console.error('   Please uncomment PROD_DATABASE_URL in your .env.local file');
  process.exit(1);
}

const sqlDev = neon(DEV_DATABASE_URL);
const sqlProd = neon(PROD_DATABASE_URL);
const dbDev = drizzle(sqlDev);
const dbProd = drizzle(sqlProd);

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface ConstraintInfo {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  constraint_definition: string;
}

async function getTables(db: any): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE 'bazaar-vid_%'
  `);
  // Handle the response structure from neon
  const rows = Array.isArray(result) ? result : result.rows || [];
  return new Set(rows.map((r: any) => r.table_name));
}

async function getTableColumns(db: any, tableName: string): Promise<TableColumn[]> {
  const result = await db.execute(sql`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = ${tableName}
    ORDER BY ordinal_position
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  return rows as TableColumn[];
}

async function getIndexes(db: any): Promise<Map<string, IndexInfo[]>> {
  const result = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename LIKE 'bazaar-vid_%'
    ORDER BY tablename, indexname
  `);
  
  const rows = Array.isArray(result) ? result : result.rows || [];
  const indexMap = new Map<string, IndexInfo[]>();
  for (const idx of rows as IndexInfo[]) {
    if (!indexMap.has(idx.tablename)) {
      indexMap.set(idx.tablename, []);
    }
    indexMap.get(idx.tablename)!.push(idx);
  }
  return indexMap;
}

async function getCreateTableStatement(db: any, tableName: string): Promise<string> {
  // Get columns
  const columns = await getTableColumns(db, tableName);
  
  let sql = `CREATE TABLE "${tableName}" (\n`;
  
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    let colDef = `  "${col.column_name}" `;
    
    // Add data type
    if (col.character_maximum_length) {
      colDef += `${col.data_type}(${col.character_maximum_length})`;
    } else {
      colDef += col.data_type;
    }
    
    // Add NOT NULL
    if (col.is_nullable === 'NO') {
      colDef += ' NOT NULL';
    }
    
    // Add DEFAULT
    if (col.column_default) {
      colDef += ` DEFAULT ${col.column_default}`;
    }
    
    if (i < columns.length - 1) {
      colDef += ',';
    }
    
    sql += colDef + '\n';
  }
  
  sql += ');\n';
  return sql;
}

async function generateMigration() {
  console.log('🔍 Analyzing database differences...\n');
  
  const [devTables, prodTables] = await Promise.all([
    getTables(dbDev),
    getTables(dbProd)
  ]);
  
  const [devIndexes, prodIndexes] = await Promise.all([
    getIndexes(dbDev),
    getIndexes(dbProd)
  ]);
  
  let migrationSQL = `-- Migration Script Generated: ${new Date().toISOString()}\n`;
  migrationSQL += `-- From: Dev Database\n`;
  migrationSQL += `-- To: Production Database\n`;
  migrationSQL += `-- WARNING: Review carefully before executing!\n\n`;
  
  // Find new tables
  const newTables: string[] = [];
  for (const table of devTables) {
    if (!prodTables.has(table)) {
      newTables.push(table);
    }
  }
  
  if (newTables.length > 0) {
    migrationSQL += `-- ============================================\n`;
    migrationSQL += `-- NEW TABLES (${newTables.length} tables)\n`;
    migrationSQL += `-- ============================================\n\n`;
    
    for (const table of newTables) {
      console.log(`📦 Generating CREATE TABLE for: ${table}`);
      const createStmt = await getCreateTableStatement(dbDev, table);
      migrationSQL += `-- Table: ${table}\n`;
      migrationSQL += createStmt;
      migrationSQL += '\n';
    }
  }
  
  // Check for column differences in existing tables
  migrationSQL += `-- ============================================\n`;
  migrationSQL += `-- COLUMN MODIFICATIONS\n`;
  migrationSQL += `-- ============================================\n\n`;
  
  for (const table of prodTables) {
    if (!devTables.has(table)) continue;
    
    const [devCols, prodCols] = await Promise.all([
      getTableColumns(dbDev, table),
      getTableColumns(dbProd, table)
    ]);
    
    const devColMap = new Map(devCols.map(c => [c.column_name, c]));
    const prodColMap = new Map(prodCols.map(c => [c.column_name, c]));
    
    // Find new columns
    for (const [colName, colInfo] of devColMap) {
      if (!prodColMap.has(colName)) {
        console.log(`➕ Adding column: ${table}.${colName}`);
        migrationSQL += `-- Add column to ${table}\n`;
        migrationSQL += `ALTER TABLE "${table}" ADD COLUMN "${colName}" ${colInfo.data_type}`;
        
        if (colInfo.is_nullable === 'NO') {
          // Need to handle NOT NULL columns carefully
          if (colInfo.column_default) {
            migrationSQL += ` DEFAULT ${colInfo.column_default} NOT NULL`;
          } else {
            migrationSQL += `; -- WARNING: NOT NULL without default, needs manual handling\n`;
            migrationSQL += `-- UPDATE "${table}" SET "${colName}" = <some_value>;\n`;
            migrationSQL += `-- ALTER TABLE "${table}" ALTER COLUMN "${colName}" SET NOT NULL`;
          }
        }
        migrationSQL += `;\n\n`;
      }
    }
  }
  
  // Generate index differences
  migrationSQL += `-- ============================================\n`;
  migrationSQL += `-- INDEXES\n`;
  migrationSQL += `-- ============================================\n\n`;
  
  // Process indexes for new tables
  for (const table of newTables) {
    const indexes = devIndexes.get(table) || [];
    for (const idx of indexes) {
      // Skip primary key indexes (they're created with the table)
      if (idx.indexname.includes('_pkey')) continue;
      
      console.log(`📑 Adding index: ${idx.indexname}`);
      migrationSQL += `-- Index for ${table}\n`;
      migrationSQL += idx.indexdef + ';\n';
    }
  }
  
  // Check for new indexes on existing tables
  for (const table of prodTables) {
    if (!devTables.has(table)) continue;
    
    const devIdxs = devIndexes.get(table) || [];
    const prodIdxs = prodIndexes.get(table) || [];
    const prodIdxNames = new Set(prodIdxs.map(i => i.indexname));
    
    for (const idx of devIdxs) {
      if (!prodIdxNames.has(idx.indexname)) {
        console.log(`📑 Adding index: ${idx.indexname}`);
        migrationSQL += `\n-- New index for ${table}\n`;
        migrationSQL += idx.indexdef + ';\n';
      }
    }
  }
  
  // Save to file
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `migration_${timestamp}_dev_to_prod.sql`;
  const filepath = path.join(process.cwd(), 'migrations', filename);
  
  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  fs.writeFileSync(filepath, migrationSQL);
  
  console.log('\n✅ Migration script generated successfully!');
  console.log(`📄 File: ${filepath}`);
  console.log(`\n📊 Summary:`);
  console.log(`  • ${newTables.length} new tables`);
  console.log(`  • Multiple new columns and indexes`);
  console.log('\n⚠️  IMPORTANT: Review the migration script carefully before running!');
  console.log('    Some operations may need manual adjustment.');
  
  return filepath;
}

// Run the generator
generateMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });