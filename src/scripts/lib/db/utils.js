// @ts-nocheck
// src/scripts/lib/db/utils.js
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../server/db/schema';

let _db;
let _client;

/**
 * Get a database client instance
 * @returns {Promise<import('@neondatabase/serverless').Pool>}
 */
export async function getDbClient() {
  if (!_client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _client = neon(connectionString);
  }
  return _client;
}

/**
 * Get a Drizzle ORM instance
 * @returns {Promise<import('drizzle-orm/neon-http').NeonHttpDatabase<typeof schema>>}
 */
export async function getDb() {
  if (!_db) {
    const client = await getDbClient();
    _db = drizzle(client, { schema });
  }
  return _db;
}

/**
 * Execute a raw SQL query
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<any>}
 */
export async function query(sql, params = []) {
  const client = await getDbClient();
  return client.query(sql, params);
}

/**
 * Start a transaction
 * @param {(client: import('@neondatabase/serverless').PoolClient) => Promise<void>} callback
 * @returns {Promise<void>}
 */
export async function transaction(callback) {
  const client = await getDbClient();
  try {
    await client.query('BEGIN');
    await callback(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}
