// Mock for ~/env module (CommonJS for Jest compatibility)
module.exports = {
  env: {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test',
  OPENAI_API_KEY: 'test-key',
  // R2 config expected by packages/r2
  R2_ENDPOINT: 'https://example.com',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
  R2_BUCKET_NAME: 'test-bucket',
  R2_PUBLIC_URL: 'https://r2.example.com/public',
  // Legacy/other envs used elsewhere (kept for compatibility)
  CLOUDFLARE_R2_BUCKET_NAME: 'test-bucket',
  CLOUDFLARE_R2_ACCOUNT_ID: 'test-account',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-access-key',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-secret',
  AUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-aws-key',
  AWS_SECRET_ACCESS_KEY: 'test-aws-secret',
  REMOTION_FUNCTION_NAME: 'test-function',
  REMOTION_BUCKET_NAME: 'test-bucket',
  RENDER_MODE: 'local',
  LOG_LEVEL: 'error', // Reduce log noise in tests
  },
};
