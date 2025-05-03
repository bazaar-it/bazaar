// jest.config.js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/llm/**/*.test.[jt]s?(x)'],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/tests/remotion/**/*.test.[jt]s?(x)'],
      setupFilesAfterEnv: ['./jest.setup.js'],
    },
  ],
}; 