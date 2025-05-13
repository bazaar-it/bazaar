import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../server/db/schema';

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';
const DATABASE_URL_NON_POOLED = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// Create connection pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Create drizzle ORM instance with all schema tables
export const db = drizzle(pool, { schema });

// Raw SQL query function for direct queries
export async function query(sql: string, params: any[] = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// List all tables in the database
export async function listTables() {
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  
  return await query(sql);
}

// Get table schema
export async function getTableSchema(tableName: string) {
  const sql = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  return await query(sql, [tableName]);
}

// Get count of rows in a table
export async function getTableCount(tableName: string) {
  const sql = `SELECT COUNT(*) as count FROM ${tableName};`;
  const result = await query(sql);
  return parseInt(result[0].count);
}

// Close the database connection
export async function closeConnection() {
  await pool.end();
}

// Export a complete DB utility for easy imports
export const dbUtils = {
  db,
  pool,
  query,
  listTables,
  getTableSchema,
  getTableCount,
  closeConnection
}; 