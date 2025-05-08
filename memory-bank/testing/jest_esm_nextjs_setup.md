// /memory-bank/testing/jest_esm_nextjs_setup.md
# Jest Configuration for ESM Support in Next.js

## Current Issues

We're experiencing the following error when running Jest tests:

```
.assumptions["dynamicImport"] is not a supported assumption.
```

This appears to be an issue with Babel's configuration for handling ESM (ECMAScript Modules) imports in the Jest test environment. The project uses modern JavaScript modules, but Jest's default configuration may not be fully compatible with them.

## Investigation Findings

1. **Duplicate Mocks**: We had duplicate mock files for OpenAI (both in `src/__mocks__/openai.js` and in `src/tests/__mocks__/openai.ts`), which were causing conflicts.
   - Resolution: Removed the `src/__mocks__/openai.js` file and centralized mocking.

2. **Missing Module**: The tests were looking for a module at `~/server/lib/openai/client.ts` that didn't exist.
   - Resolution: Created the missing module to provide a centralized OpenAI client.

3. **Babel Configuration Issue**: The `dynamicImport` assumption in Babel configuration was causing errors.
   - Resolution: Replaced `assumptions: { dynamicImport: true }` with the `@babel/plugin-syntax-dynamic-import` plugin and set modules to "auto" in the Babel preset-env configuration. This allows Babel to properly handle dynamic imports without using unsupported assumptions.

4. **Missing Babel Plugin**: After updating the configuration, we needed to install the missing Babel plugin.
   - Resolution: Installed `@babel/plugin-syntax-dynamic-import` with npm.

## Current Status

- ✅ Fixed the `dynamicImport` assumption error by updating the Babel configuration
- ✅ Installed the required Babel plugin
- ✅ Created the missing OpenAI client module
- ✅ Set up proper mocking for the OpenAI client in tests
- ✅ Tests are now running but still have database connection issues

## Remaining Issues

1. **Database Mocking**: The tests are trying to connect to a real database even though we've set up mocks for the database.
   - Expected behavior: The `db` object should be fully mocked to prevent real database connections during tests.
   - Current error: `NeonDbError: Error connecting to database: fetch failed`
   - Next steps: Need to ensure the mocking is properly intercepting all database calls, possibly by updating how the `db` is imported and mocked in the tests.

2. **TypeScript Errors**: There are still TypeScript linting errors in the test files:
   - Issues with mock implementations not matching expected types
   - Type safety concerns with mockReturnValue and mockResolvedValue

## Next Steps

1. Fix the database mocking to ensure tests don't try to connect to a real database
2. Address TypeScript errors in the mock implementations
3. Update the `animationDesigner.service.test.ts` file to use proper typed mocks
4. Consider using a mocking helper that specifically addresses the Drizzle ORM patterns
5. Document the proper approach to mocking for future reference

## References

- [Jest Manual Mocking](https://jestjs.io/docs/manual-mocks)
- [Babel Plugin Syntax Dynamic Import](https://babeljs.io/docs/babel-plugin-syntax-dynamic-import)
- [ESM Support in Jest](https://jestjs.io/docs/ecmascript-modules)