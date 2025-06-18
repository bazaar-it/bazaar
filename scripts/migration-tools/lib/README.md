# Script Utilities

This directory contains shared utilities for the Bazaar-Vid scripts.

## Available Utilities

### Database (`db/`)
- `utils.js` - Database connection and query utilities
  - `getDbClient()` - Get a Neon database client
  - `getDb()` - Get a Drizzle ORM instance
  - `query(sql, params)` - Execute a raw SQL query
  - `transaction(callback)` - Run a database transaction

### Environment (`env.js`)
- Environment variable utilities
  - `getEnv(key, defaultValue)` - Get an environment variable
  - `requireEnv(key)` - Get a required environment variable
  - `getBoolEnv(key, defaultValue)` - Get a boolean environment variable
  - `getNumberEnv(key, defaultValue)` - Get a number environment variable

### Logging (`logger.js`)
- Logging utilities with consistent formatting
  - `createLogger(context)` - Create a logger with a context
  - `logger` - Default logger instance
  - `createProgressBar(total, options)` - Create a progress bar

## Usage

```javascript
// Import utilities
import { getDb } from './lib/db/utils';
import { logger } from './lib/logger';
import { requireEnv } from './lib/env';

// Example usage
async function example() {
  try {
    // Get environment variable
    const apiKey = requireEnv('API_KEY');
    
    // Log messages
    logger.info('Starting script...');
    
    // Use database
    const db = await getDb();
    const users = await db.query.users.findMany();
    
    // Create a progress bar
    const progress = createProgressBar(users.length);
    for (const user of users) {
      // Process user...
      progress(1);
    }
    
    logger.success('Script completed successfully');
  } catch (error) {
    logger.error('Script failed:', error);
    process.exit(1);
  }
}
```

## Adding New Utilities

1. Create a new file in the appropriate directory
2. Add JSDoc comments for all exported functions
3. Update this README to document the new utility
4. Add tests if applicable
