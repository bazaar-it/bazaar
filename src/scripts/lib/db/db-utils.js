// @ts-nocheck
// src/scripts/lib/db/db-utils.js
import pg from 'pg';
const { Pool } = pg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';
const DATABASE_URL_NON_POOLED = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// R2 credentials
const R2_ENDPOINT = 'https://3a37cf04c89e7483b59120fb95af6468.r2.cloudflarestorage.com';
const R2_BUCKET_NAME = 'bazaar-vid-components';
const R2_PUBLIC_URL = 'https://bazaar-vid-components.3a37cf04c89e7483b59120fb95af6468.r2.dev/';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

/**
 * Execute a SQL query and return the results
 */
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * List all tables in the database
 */
async function listTables() {
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  
  return await query(sql);
}

/**
 * Get table schema
 */
async function getTableSchema(tableName) {
  const sql = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  return await query(sql, [tableName]);
}

/**
 * Get count of rows in a table
 */
async function getTableCount(tableName) {
  const sql = `SELECT COUNT(*) as count FROM "${tableName}";`;
  const result = await query(sql);
  return parseInt(result[0]?.count || '0');
}

/**
 * Get all projects
 */
async function getProjects(limit = 20) {
  const sql = `
    SELECT id, title, "createdAt", "updatedAt"
    FROM "bazaar-vid_project"
    ORDER BY "createdAt" DESC
    LIMIT $1;
  `;
  
  return await query(sql, [limit]);
}

/**
 * Get a project by ID
 */
async function getProjectById(projectId) {
  const sql = `
    SELECT id, title, "createdAt", "updatedAt"
    FROM "bazaar-vid_project"
    WHERE id = $1;
  `;
  
  const results = await query(sql, [projectId]);
  return results[0] || null;
}

/**
 * Get components by project ID
 */
async function getComponentsByProject(projectId) {
  const sql = `
    SELECT id, "projectId", effect, status, "createdAt", "updatedAt", "errorMessage", "outputUrl"
    FROM "bazaar-vid_custom_component_job"
    WHERE "projectId" = $1
    ORDER BY "createdAt" DESC;
  `;
  
  return await query(sql, [projectId]);
}

/**
 * Get all components with filters
 */
async function getAllComponents(status = null, limit = 20) {
  let sql = `
    SELECT id, "projectId", effect, status, "createdAt", "updatedAt", "errorMessage", "outputUrl"
    FROM "bazaar-vid_custom_component_job"
  `;
  
  const params = [];
  
  if (status) {
    sql += ` WHERE status = $1`;
    params.push(status);
  }
  
  sql += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  return await query(sql, params);
}

/**
 * Get a component by ID
 */
async function getComponentById(componentId) {
  const sql = `
    SELECT *
    FROM "bazaar-vid_custom_component_job"
    WHERE id = $1;
  `;
  
  const results = await query(sql, [componentId]);
  return results[0] || null;
}

/**
 * Get components by status
 */
async function getComponentsByStatus(status, limit = 20) {
  const sql = `
    SELECT id, "projectId", effect, status, "createdAt", "updatedAt", "errorMessage", "outputUrl"
    FROM "bazaar-vid_custom_component_job"
    WHERE status = $1
    ORDER BY "createdAt" DESC
    LIMIT $2;
  `;
  
  return await query(sql, [status, limit]);
}

/**
 * Get a count of components grouped by status
 */
async function getComponentStatusCounts() {
  const sql = `
    SELECT status, COUNT(*) as count
    FROM "bazaar-vid_custom_component_job"
    GROUP BY status
    ORDER BY count DESC;
  `;
  
  return await query(sql);
}

/**
 * Get animation design briefs that reference a component
 */
async function getADBsForComponent(componentId) {
  const sql = `
    SELECT id, "projectId", "sceneId", "componentJobId", "createdAt"
    FROM "bazaar-vid_animation_design_brief"
    WHERE "componentJobId" = $1
    ORDER BY "createdAt" DESC;
  `;
  
  return await query(sql, [componentId]);
}

/**
 * Ensure analysis directories exist
 */
async function ensureAnalysisDirectories() {
  const baseDir = path.join(process.cwd(), 'analysis');
  
  const dirs = [
    baseDir,
    path.join(baseDir, 'components'),
    path.join(baseDir, 'errors'),
    path.join(baseDir, 'projects'),
    path.join(baseDir, 'r2')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      // Directory exists, ignore
    }
  }
  
  return baseDir;
}

/**
 * Parse command line arguments
 */
function parseArgs(args = process.argv.slice(2)) {
  const result = {
    positional: [],
    options: {}
  };
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      result.options[key] = value || true;
    } else {
      result.positional.push(arg);
    }
  }
  
  return result;
}

/**
 * Close the database connection
 */
async function closeConnection() {
  await pool.end();
}

export {
  pool,
  query,
  listTables,
  getTableSchema,
  getTableCount,
  getProjects,
  getProjectById,
  getComponentsByProject,
  getAllComponents,
  getComponentById,
  getComponentsByStatus,
  getComponentStatusCounts,
  getADBsForComponent,
  ensureAnalysisDirectories,
  parseArgs,
  closeConnection,
  DATABASE_URL,
  R2_ENDPOINT,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL
};