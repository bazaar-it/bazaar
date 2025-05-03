// jest.setup.js

// Set required environment variables for tests
process.env.AUTH_GITHUB_ID = 'test-github-id';
process.env.AUTH_GITHUB_SECRET = 'test-github-secret';
process.env.AUTH_GOOGLE_ID = 'test-google-id';
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DATABASE_URL_NON_POOLED = 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.R2_ENDPOINT = 'https://test-endpoint.com';
process.env.R2_ACCESS_KEY_ID = 'test-access-key-id';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.R2_BUCKET_NAME = 'test-bucket-name';
process.env.R2_PUBLIC_URL = 'https://test-public-url.com';
process.env.CRON_SECRET = 'test-cron-secret'; 