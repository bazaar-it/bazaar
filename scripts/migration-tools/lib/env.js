import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

/**
 * Get an environment variable
 * @param {string} key - Environment variable name
 * @param {any} [defaultValue] - Default value if not found
 * @returns {string|undefined}
 */
export function getEnv(key, defaultValue) {
  const value = process.env[key];
  
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value ?? defaultValue;
}

/**
 * Get a required environment variable
 * @param {string} key - Environment variable name
 * @returns {string}
 */
export function requireEnv(key) {
  const value = getEnv(key);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get a boolean environment variable
 * @param {string} key - Environment variable name
 * @param {boolean} [defaultValue] - Default value if not found
 * @returns {boolean}
 */
export function getBoolEnv(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get a number environment variable
 * @param {string} key - Environment variable name
 * @param {number} [defaultValue] - Default value if not found
 * @returns {number}
 */
export function getNumberEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  
  return num;
}
