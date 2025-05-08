// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/testing/jest_mocking_type_resolution_strategy.md
# Jest Mocking and TypeScript Type Resolution Strategy

This document outlines the current strategies being employed to resolve TypeScript type errors encountered when working with Jest mocks in an ESM environment, particularly after transitioning to global mocks in `jest.setup.ts`.

## Core Problem

Many TypeScript errors stem from Jest's mock functions (e.g., `jest.fn()`, `mockResolvedValueOnce`, `mockRejectedValueOnce`) interacting with complex or custom types. TypeScript's inference sometimes struggles to align the generic types of these mock utilities with the specific shapes of the data or functions being mocked, leading to errors like "Argument of type 'X' is not assignable to parameter of type 'never'."

## Current Strategies

To address these issues, the following approaches are being applied systematically to test files (e.g., `errorRecovery.test.ts`, `dualLLMArchitecture.test.ts`, `animationDesigner.service.test.ts`):

1.  **Explicit Casting of Mock Functions**:
    *   When accessing mock-specific methods on a mocked function (especially nested ones like `chat.completions.create` or `db.select()...execute()`), explicitly cast the function property to `jest.Mock<any, any>` or a more specific signature if readily available.
    *   Example: `(mockOpenAI.chat.completions.create as jest.Mock<any, any>).mockResolvedValueOnce(...);`
    *   Example: `(mockDb.select().from(...).where(...).execute as jest.Mock<any, any>).mockResolvedValueOnce(...);`

2.  **Casting Values Passed to Mock Control Methods**:
    *   Cast the actual values (resolved data, rejected errors) being passed to methods like `mockResolvedValueOnce`, `mockRejectedValueOnce`, `mockImplementation` to `as any` if TypeScript cannot reconcile the types.
    *   Example: `.mockResolvedValueOnce(mockResponseData as any)`
    *   Example: `.mockRejectedValueOnce(new CustomError() as any)`

3.  **Non-Null Assertions (`!`)**:
    *   For properties of mock data objects or elements from a mock's call array (`mock.calls[0]`) that are known to exist based on the test's setup, use the non-null assertion operator (`!`) to satisfy TypeScript's strict null checks.
    *   Example: `const firstCallArg = mockFn.mock.calls[0]![0];`
    *   Example: `const messageContent = mockResponse.choices[0]!.message!.content;`

4.  **Literal Types with `as const`**:
    *   For properties within mock data that have a fixed set of string literal values (e.g., `role: 'assistant'`, `type: 'function'`), use `as const` to help TypeScript infer a more precise literal type rather than a general string type.
    *   Example: `message: { role: 'assistant' as const, ... }`

These strategies aim to provide TypeScript with enough information to trust the mock setups during testing, thereby resolving type errors and allowing tests to proceed.
