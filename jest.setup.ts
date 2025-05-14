// jest.setup.ts
// This file is run after the test environment is set up but before any tests run

// Import test libraries - using ES module import
import '@testing-library/jest-dom';

// Mock the console.error to avoid noise in test output
const originalConsoleError = console.error;
console.error = function(...args: any[]) { 
  // Filter out React DOM warnings, etc. that pollute test output
  if (
    args[0] && typeof args[0] === 'string' && 
    (
      args[0].includes('Warning: Invalid DOM property') ||
      args[0].includes('Warning: ReactDOM.render has been deprecated')
    )
  ) {
    return;
  }
  
  originalConsoleError.apply(console, args);
};

// Set up global mocks
(global as any).ResizeObserver = class MockResizeObserver { 
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Set required environment variables for tests
process.env.AUTH_GITHUB_ID = 'test-github-id';
process.env.AUTH_GITHUB_SECRET = 'test-github-secret';
process.env.AUTH_GOOGLE_ID = 'test-google-id';
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret';
