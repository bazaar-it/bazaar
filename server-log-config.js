// server-log-config.js
// This file configures server-side logging to reduce console noise

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Patterns to filter out
const FILTER_PATTERNS = [
  'fetchConnectionCache',
  'Initializing Neon database',
  'Reusing existing Neon database',
  '[auth][warn][debug-enabled]',
  'Module evaluation is deferred',
  'Error: redeclaration of const',
  'Failed to load SWC binary',
];

// Override console methods
console.log = (...args) => {
  const message = args.join(' ');
  if (!FILTER_PATTERNS.some(pattern => message.includes(pattern))) {
    originalLog.apply(console, args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (!FILTER_PATTERNS.some(pattern => message.includes(pattern))) {
    originalWarn.apply(console, args);
  }
};

// Keep errors visible for debugging
console.error = originalError;

module.exports = {};