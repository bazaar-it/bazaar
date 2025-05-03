// server-log-config.js
// Filters out noisy tRPC API logging from Next.js server logs

// Store the original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Patterns to filter out
const filterPatterns = [
  /GET \/api\/trpc\//,
  /\[TRPC\] \w+\.\w+ took \d+ms to execute/,
  /The `fetchConnectionCache` option is deprecated/,
];

// Important patterns to always show (even if they match filter patterns)
const importantPatterns = [
  /Error loading component/,
  /Component failed to register/,
  /Unexpected keyword/,
  /SyntaxError/,
  /\[ERROR\]/, // Custom prefix we'll add to important errors
];

// Only log messages that don't match the filter patterns
console.log = function(...args) {
  if (!shouldFilter(args)) {
    originalConsole.log(...args);
  }
};

console.info = function(...args) {
  if (!shouldFilter(args)) {
    originalConsole.info(...args);
  }
};

// Keep all warnings and errors as they might be important
console.warn = originalConsole.warn; 
console.error = function(...args) {
  // Always show errors related to components
  originalConsole.error(...args);
  
  // If this is a component-related error, also print it with a special prefix
  // to make it more visible in the logs
  const message = args.join(' ');
  if (importantPatterns.some(pattern => pattern.test(message))) {
    originalConsole.log('\n[ERROR] COMPONENT LOADING ISSUE:', message, '\n');
  }
};

/**
 * Helper function to determine if a log message should be filtered
 * @param {any[]} args - The arguments passed to the console method
 * @returns {boolean} - Whether the message should be filtered
 */
function shouldFilter(args) {
  if (!args || !args.length) return false;
  
  // Convert arguments to string for pattern matching
  const message = args.join(' ');
  
  // Never filter important messages
  if (importantPatterns.some(pattern => pattern.test(message))) {
    return false;
  }
  
  // Filter if message matches any filter pattern
  return filterPatterns.some(pattern => pattern.test(message));
}
