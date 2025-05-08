// jest.setup.js
// This file is run after the test environment is set up but before any tests run

// Import test libraries - using ES module import
import '@testing-library/jest-dom';

// Mock problematic ESM modules
jest.mock('~/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-openai-key',
    DATABASE_URL: 'test-db-url',
    R2_ACCESS_KEY_ID: 'test-r2-key',
    R2_SECRET_ACCESS_KEY: 'test-r2-secret',
    R2_BUCKET_NAME: 'test-bucket',
    R2_PUBLIC_URL: 'https://test-bucket.example.com',
    R2_ENDPOINT: 'https://test-endpoint.com',
    NODE_ENV: 'test'
    // Add any other environment variables needed by tests
  }
}), { virtual: true });

/* 
// Mock the @t3-oss/env-nextjs module
jest.mock('@t3-oss/env-nextjs', () => ({
  createEnv: jest.fn(() => ({}))
}), { virtual: true });

// Mock OpenAI client
jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{
      message: {
        content: 'Test content',
        tool_calls: [{ function: { name: 'test', arguments: '{}' } }]
      },
      finish_reason: 'stop'
    }]
  });

  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});
*/

// Mock the console.error to avoid noise in test output
const originalConsoleError = console.error;
console.error = function(...args) {
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
global.ResizeObserver = class MockResizeObserver {
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
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DATABASE_URL_NON_POOLED = 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = 'dummy-api-key-for-testing';
process.env.R2_ENDPOINT = 'https://test-endpoint.com';
process.env.R2_ACCESS_KEY_ID = 'test-access-key-id';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.R2_PUBLIC_URL = 'https://test-bucket.example.com';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-anon-key-for-testing';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key-for-testing';
process.env.REMOTION_LAMBDA_FUNCTION_NAME = 'dummy-function-name-for-testing';
process.env.AWS_ACCESS_KEY_ID = 'dummy-aws-key-for-testing';
process.env.AWS_SECRET_ACCESS_KEY = 'dummy-aws-secret-for-testing';
process.env.REMOTION_SAMPLE_COMP_NAME = 'TestComp'; 