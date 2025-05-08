// server-log-config.js
// Filters out noisy tRPC API logging from Next.js server logs

// Store the original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Check if ultra-quiet mode is enabled
const isUltraQuiet = process.env.ULTRA_QUIET === 'true';
// Check if absolute silence mode is enabled (only critical errors)
const isAbsoluteSilence = process.env.ABSOLUTE_SILENCE === 'true';

// Lists of strings that should be filtered in ANY console output
const ALWAYS_FILTER_LIST = [
  'fetchConnectionCache', // Filter the annoying fetch connection cache messages
  'The `fetchConnectionCache` option is deprecated', // More specific pattern to catch the exact message
  'option is deprecated',
  'project.getById',
  'GET /api/trpc',
];

// Lists to check for ultra-quiet mode
const ULTRA_QUIET_FILTER_LIST = [
  'GET /',
  'POST /',
  '200 in',
  '304 ',
  'batch=1&input',
  '/api/trpc/',
  'Slow procedure',
];

// Messages that should never be filtered
const ALWAYS_SHOW_LIST = [
  'Error loading component',
  'Component failed to register',
  'Unexpected keyword',
  'SyntaxError',
  '[ERROR]',
  '❌ tRPC failed',
  '[MARKER]:', 
];

/**
 * Determines if a message should be filtered based on its content
 * @param {string} message - The message to check 
 * @returns {boolean} - True if the message should be filtered out
 */
function shouldFilter(message) {
  if (!message || typeof message !== 'string') return false;
  
  // Never filter important messages
  for (const mustShow of ALWAYS_SHOW_LIST) {
    if (message.includes(mustShow)) {
      return false;
    }
  }
  
  // Always filter specific noisy logs
  for (const filter of ALWAYS_FILTER_LIST) {
    if (message.includes(filter)) {
      return true;
    }
  }
  
  // Additional filtering in ultra-quiet mode
  if (isUltraQuiet || isAbsoluteSilence) {
    for (const filter of ULTRA_QUIET_FILTER_LIST) {
      if (message.includes(filter)) {
        return true;
      }
    }
  }
  
  return false;
}

// Only log messages that don't match the filter patterns
console.log = function(...args) {
  if (args.length === 0) {
    originalConsole.log();
    return;
  }
  
  const message = args.join(' ');
  if (!shouldFilter(message)) {
    originalConsole.log(...args);
  }
};

console.info = function(...args) {
  if (args.length === 0) {
    originalConsole.info();
    return;
  }

  const message = args.join(' ');
  if (!shouldFilter(message)) {
    originalConsole.info(...args);
  }
};

// Filter warnings too
console.warn = function(...args) {
  if (args.length === 0) {
    originalConsole.warn();
    return;
  }

  const message = args.join(' ');
  if (!shouldFilter(message)) {
    originalConsole.warn(...args);
  }
};

console.error = function(...args) {
  if (args.length === 0) {
    originalConsole.error();
    return;
  }

  // Always let errors through, but check if it's actually a warning
  const message = args.join(' ');
  
  // Never filter important errors
  for (const keyword of ALWAYS_SHOW_LIST) {
    if (message.includes(keyword)) {
      originalConsole.error(...args);
      // If this is a component-related error, also print it with a special prefix
      if (message.includes('component')) {
        originalConsole.log('\n[ERROR] COMPONENT LOADING ISSUE:', message, '\n');
      }
      return;
    }
  }
  
  // For warning-like messages, filter them
  if (message.includes('Warning') || message.includes('warning') || message.includes('deprecated')) {
    if (!shouldFilter(message)) {
      originalConsole.error(...args);
    }
  } else {
    // Let other errors through
    originalConsole.error(...args);
  }
};

// Define marker utilities for always-visible logs
const marker = {
  /**
   * Log a message that will always be visible regardless of filtering
   * @param {string} label - The label for the marker log
   * @param {any} message - The message content to log
   */
  log: function(label, message) {
    const divider = '='.repeat(10);
    
    if (typeof message === 'object') {
      // For objects, log the label first, then the object on the next line
      originalConsole.log(`\n[MARKER]: ${divider} ${label} ${divider}`);
      originalConsole.log(message);
      originalConsole.log(`${divider}${divider}${divider}\n`);
    } else {
      originalConsole.log(`\n[MARKER]: ${divider} ${label} ${divider} ${message} ${divider}\n`);
    }
  },
  
  /**
   * Log an error that will always be visible regardless of filtering
   * @param {string} label - The label for the marker error
   * @param {any} message - The error message content to log
   */
  error: function(label, message) {
    const divider = '!'.repeat(10);
    originalConsole.error(`\n[MARKER ERROR]: ${divider} ${label} ${divider}`);
    originalConsole.error(message);
    originalConsole.error(`${divider}${divider}${divider}\n`);
  },
  
  /**
   * Log a warning that will always be visible regardless of filtering
   * @param {string} label - The label for the marker warning
   * @param {any} message - The warning message content to log
   */
  warn: function(label, message) {
    const divider = '*'.repeat(10);
    originalConsole.warn(`\n[MARKER WARNING]: ${divider} ${label} ${divider}`);
    originalConsole.warn(message);
    originalConsole.warn(`${divider}${divider}${divider}\n`);
  }
};

// Log initialization message to show the filter is active
originalConsole.log('\n🧹 tRPC log filtering ACTIVE - console will be cleaner now!' + 
            (isAbsoluteSilence ? ' (ABSOLUTE SILENCE MODE)' : isUltraQuiet ? ' (ULTRA-QUIET MODE)' : '') + '\n');

originalConsole.log('📝 Applied server log filtering configuration');

// Export the marker object for use in other modules
module.exports = { marker };