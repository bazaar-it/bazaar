// jest.env.setup.js
// This file sets up mock environment variables for testing.
// .env.local is now expected to be pre-loaded by dotenv-cli via the npm test script.

console.log('Jest setup: .env.local should have been pre-loaded by dotenv-cli.');
console.log('Jest setup: Value of DATABASE_URL from pre-loaded env:', process.env.DATABASE_URL);
console.log('Jest setup: Value of OPENAI_API_KEY from pre-loaded env:', process.env.OPENAI_API_KEY ? '********' : 'undefined');
console.log('Jest setup: Value of NODE_ENV from pre-loaded env:', process.env.NODE_ENV); // Jest usually sets this to 'test'

// Set any specific mock/override variables needed for tests that ARE NOT in .env.local
// or if you need to ensure a specific test value different from .env.local for some tests.
process.env.AUTH_GITHUB_ID = 'test-github-id-from-jest-setup';
process.env.AUTH_GITHUB_SECRET = 'test-github-secret-from-jest-setup';
process.env.AUTH_GOOGLE_ID = 'test-google-id-from-jest-setup';
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret-from-jest-setup';

// NO LONGER SETTING FALLBACKS for .env.local variables here.
// We rely purely on dotenv-cli for DATABASE_URL, OPENAI_API_KEY, R2_*, etc.
// Example of a variable that might truly need a default IF NOT in .env.local and not critical for this test's core issue:
// process.env.DEFAULT_ADB_MODEL = process.env.DEFAULT_ADB_MODEL || 'o4-mini';

console.log('--- End of jest.env.setup.js ---');
