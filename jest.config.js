// jest.config.js
export default {
  // Use ts-jest for TypeScript files
  preset: 'ts-jest',
  
  // Set to node environment
  testEnvironment: 'node',
  
  // Use ESM for modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  
  // For path mapping (supporting the ~ imports)
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test patterns
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],
  
  // Tell Jest to recognize .mjs files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  
  // Mocked files
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};
