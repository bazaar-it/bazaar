// Mock implementation of the env.js file
// This will be used by Jest instead of the actual env.js file

const env = {
  OPENAI_API_KEY: 'test-openai-key',
  DATABASE_URL: 'test-db-url',
  R2_ACCESS_KEY_ID: 'test-r2-key',
  R2_SECRET_ACCESS_KEY: 'test-r2-secret',
  R2_BUCKET_NAME: 'test-bucket',
  R2_PUBLIC_URL: 'https://test-bucket.example.com',
  R2_ENDPOINT: 'https://test-endpoint.com',
  NODE_ENV: 'test'
  // Add any other environment variables needed by tests
};

module.exports = { env };
