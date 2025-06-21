// jest.config.mjs

export default {
  // Use ESM preset for ts-jest
  preset: 'ts-jest/presets/default-esm',
  
  // Set test environment to jsdom for React testing
  testEnvironment: 'jsdom',
  
  // Support both .ts and .tsx files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform TypeScript and JSX files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  
  // Module name mapping for path aliases (~/...)
  moduleNameMapper: {
    // TypeScript path mapping for ~ alias
    '^~/(.*)$': '<rootDir>/src/$1',
    
    // CSS and asset mocking
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],
  
  // ESM handling for node_modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Handle ESM modules in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@testing-library|@remotion|chalk|uuid)/)',
  ],
  
  // ESM settings - moved to transform config above to avoid deprecation warning
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.(ts|tsx)',
    '!src/**/*.spec.(ts|tsx)',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
};