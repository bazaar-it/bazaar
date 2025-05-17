# Next.js Webpack Configuration Fix for Log Directory Watching

## Issue 
The development server was caught in an infinite restart loop due to the Hot Module Replacement (HMR) system detecting file changes in log directories. The changes were caused by winston-daily-rotate-file creating and updating log files.

Every time a new log file was created or an existing log file was updated, Next.js would detect these changes and trigger a server restart with SIGTERM. This prevented the A2A system from functioning correctly, particularly the ScenePlannerAgent from receiving messages properly.

## Root Cause
The issue was in the webpack configuration in `next.config.js`, where we attempted to ignore certain directories from file watching. The code was incorrectly trying to modify the `config.watchOptions.ignored` property, which is a read-only property in Next.js 15.3.2.

The error was:
```
Cannot assign to read only property 'ignored' of object '#<Object>'
```

## Solution
The solution was to modify the webpack configuration to return a new configuration object with the desired `watchOptions` property, instead of trying to directly modify the existing configuration object.

### Change in next.config.js:

Original (problematic code):
```javascript
// Set up ignored patterns for file watching to prevent HMR from restarting on log rotation
const ignoredPatterns = [
  /[\\/]node_modules[\\/]/,
  /[\\/]logs[\\/]/,
  /[\\/]tmp[\\/]a2a-logs[\\/]/
];

// Try to update watchOptions with ignored patterns
config.watchOptions = {
  ...(config.watchOptions || {}),
  ignored: ignoredPatterns
};
```

Fixed code:
```javascript
// Set up a single RegExp pattern for file watching to prevent HMR from restarting on log rotation
const ignoredPattern = /[\\/]node_modules[\\/]|[\\/]logs[\\/]|[\\/]tmp[\\/]a2a-logs[\\/]/;

// Return a new config object with watchOptions property
return {
  ...config,
  watchOptions: {
    ...(config.watchOptions || {}),
    ignored: ignoredPattern
  }
};
```

## Improvements
1. Combined multiple RegExp patterns into a single pattern using the OR operator (|)
2. Used the immutable approach by returning a new configuration object instead of modifying the existing one
3. This respects the Next.js webpack configuration API and prevents the "read-only property" error

## Testing
The fix was verified by running the development server with `npm run dev`. The server now starts correctly and does not continuously restart when log files are created or updated. All logging functionality continues to work properly, with logs being written to the configured directory while not triggering HMR restarts.

## Related Documentation
- [Next.js Webpack Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack)
- [Webpack WatchOptions](https://webpack.js.org/configuration/watch/#watchoptions-ignored) 