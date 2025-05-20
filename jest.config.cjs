    // jest.config.cjs
    const nextJest = require('next/jest');

    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    const createJestConfig = nextJest.default({
      dir: './',
    });

    // Add any custom config to be passed to Jest
    const customJestConfig = {
      // Add more setup options before each test is run
      setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'], // Keep if you have a setup file
      testEnvironment: 'jest-environment-jsdom', // Explicitly set jsdom environment
      testEnvironmentOptions: {
        customExportConditions: ['node', 'browser'],
      },
      testMatch: [
        "**/__tests__/**/*.[jt]s?(x)",
        "**/?(*.)+(spec|test).[jt]s?(x)"
      ],
      testTimeout: 30000, // Increase default timeout to 30s
      moduleNameMapper: {
        "^~/(.*)$": "<rootDir>/src/$1",
        "^@/(.*)$": "<rootDir>/src/$1",
        "^.+\\.(css|less|scss)$": "identity-obj-proxy",
        "uuid": require.resolve("uuid"),
        "observable-fns": "<rootDir>/__mocks__/observable-fns.js",
        "rxjs": "<rootDir>/__mocks__/rxjs.js",
        "rxjs/operators": "<rootDir>/__mocks__/rxjs.js"
      },
      moduleDirectories: ['node_modules', '<rootDir>'],
      // Explicitly include @t3-oss/env-nextjs and other ESM modules that need transformation
      transformIgnorePatterns: [
        // Correctly specify packages to include by negating the default node_modules ignore
        "/node_modules/(?!(?:@t3-oss/env-nextjs|nanoid)/)"
      ],
      // Explicitly mock specific modules
      modulePathIgnorePatterns: [
        "<rootDir>/.next/",
        "<rootDir>/node_modules/",
      ],
      globals: {
        "ts-jest": {
          tsconfig: "tsconfig.json",
          useESM: true,
        }
      }
    };

    // createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
    module.exports = async () => {
      const nextJestConfig = await createJestConfig(customJestConfig)();
      // Override transform configuration - properly formatted as an object with string values
      return {
        ...nextJestConfig,
      };
    };