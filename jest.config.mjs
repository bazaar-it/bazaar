// jest.config.mjs
export default {
  // Use ts-jest for TypeScript files
  preset: 'ts-jest/presets/js-with-ts-esm',
  
  // Set to node environment
  testEnvironment: 'node',
  
  // Use ESM for modules
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mjs'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  
  // For path mapping (supporting the ~ imports)
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  
  // Tell Jest to handle the setup file as an ESM
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  
  // Test patterns - ensure we catch .ts files
  testMatch: ['**/__tests__/**/*.test.ts'],
  
  // Tell Jest to recognize ESM files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  
  // Mocked files and paths to ignore
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};
