// src/tests/setEnvVars.ts
// Set environment variables for tests

process.env.OPENAI_API_KEY = 'test-api-key';
process.env.R2_PUBLIC_URL = 'https://test-r2-bucket.com/components';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/test_db';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.REMOTION_AWS_LAMBDA_REGION = 'us-east-1';
process.env.REMOTION_AWS_LAMBDA_ACCESS_KEY_ID = 'test-access-key';
process.env.REMOTION_AWS_LAMBDA_SECRET_ACCESS_KEY = 'test-secret-key'; 