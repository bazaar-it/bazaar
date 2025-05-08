/** @type {import('jest').Config} */
module.exports = {
  // Set to node environment
  testEnvironment: 'node',
  
  // Transform TypeScript files
  transform: {
    '^.+\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        // Add ts-jest specific ESM settings
        tsconfig: 'tsconfig.json',
      },
    ],
    '^.+\.(js|jsx|mjs)$': ['babel-jest', { configFile: './babel.jest.config.cjs' }]
  },
  
  // Expanded transformIgnorePatterns to include all problematic ESM packages
  transformIgnorePatterns: [
    '/node_modules/(?!(@t3-oss|superjson|zod|zod-to-json-schema|drizzle-orm|openai|@remotion|remotion|framer-motion|uuid|react-colorful|next-auth|framer)/)'
  ],
  
  // For path mapping (supporting the ~ imports)
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  
  // Mocked files and paths to ignore
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  
  // Test patterns - ensure we catch .ts files
  testMatch: ['**/__tests__/**/*.test.ts'],
  
  // Tell Jest to recognize ESM files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],

  // Treat .ts and .tsx files as ESM
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Mock environment variables for testing
  setupFiles: ['<rootDir>/jest.env.setup.js'],
  
  // Setup file for global mocks
  setupFilesAfterEnv: ['./jest.setup.ts'],
  
  // Global settings for ts-jest
  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true,
    }
  },
  
  // Required for proper handling of ESM modules
  resolver: undefined
};