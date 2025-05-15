import chalk from 'chalk';

const LOG_LEVELS = {
  error: { color: 'red', prefix: '❌' },
  warn: { color: 'yellow', prefix: '⚠️ ' },
  info: { color: 'blue', prefix: 'ℹ️ ' },
  success: { color: 'green', prefix: '✅' },
  debug: { color: 'gray', prefix: '🐛' }
};

/**
 * Create a logger with consistent formatting
 * @param {string} [context='APP'] - Context for the logger
 * @returns {Object} Logger instance with log methods
 */
export function createLogger(context = 'APP') {
  const prefix = chalk.gray(`[${new Date().toISOString()}] [${context}]`);
  
  const logger = {};
  
  // Create log methods for each level
  for (const [level, { color, prefix: levelPrefix }] of Object.entries(LOG_LEVELS)) {
    logger[level] = (...args) => {
      const coloredPrefix = chalk[color](levelPrefix);
      console.log(prefix, coloredPrefix, ...args);
    };
  }
  
  return logger;
}

// Default logger
export const logger = createLogger('SCRIPTS');

/**
 * Create a progress bar
 * @param {number} total - Total number of items
 * @param {Object} [options] - Progress bar options
 * @param {number} [options.width=30] - Width of the progress bar
 * @param {string} [options.complete='='] - Character for completed portion
 * @param {string} [options.incomplete='-'] - Character for incomplete portion
 * @returns {Function} Progress update function
 */
export function createProgressBar(total, {
  width = 30,
  complete = '=',
  incomplete = '-'
} = {}) {
  let current = 0;
  
  return (increment = 1) => {
    current += increment;
    const percent = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((width * current) / total);
    const bar = complete.repeat(filled) + incomplete.repeat(width - filled);
    process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total})`);
    
    if (current >= total) {
      process.stdout.write('\n');
    }
  };
}
