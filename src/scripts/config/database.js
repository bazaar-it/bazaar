import { requireEnv } from '../lib/env';

/**
 * Database configuration
 * @type {Object}
 */
export const dbConfig = {
  connectionString: requireEnv('DATABASE_URL'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
};

/**
 * Get database connection URL with SSL options
 * @returns {string}
 */
export function getDatabaseUrl() {
  const url = new URL(dbConfig.connectionString);
  
  // Add SSL options if needed
  if (dbConfig.ssl) {
    url.searchParams.set('sslmode', 'require');
  }
  
  return url.toString();
}

/**
 * Get database connection options
 * @returns {Object}
 */
export function getConnectionOptions() {
  return {
    connectionString: dbConfig.connectionString,
    ssl: dbConfig.ssl,
    max: dbConfig.max,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
  };
}
