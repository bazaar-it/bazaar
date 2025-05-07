// jest.setup.mjs
// This file is run after the test environment is set up but before any tests run

// Import test libraries
import '@testing-library/jest-dom';

// Mock the console.error to avoid noise in test output
const originalConsoleError = console.error;
console.error = function(...args) {
  // Filter out React DOM warnings, etc. that pollute test output
  if (args[0] && typeof args[0] === 'string' && 
     (args[0].includes('Warning:') || args[0].includes('Error:'))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Mock the console.warn
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  // Filter out warnings that pollute test output
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};
