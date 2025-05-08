// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/testing/jest_mocking_strategy.md
# Jest Mocking Strategy for TypeScript ESM Projects

## Current Issues and Solutions

### 1. TypeScript Mock Type Errors

The most common errors encountered in our tests are:

- `Generic type 'Mock' requires between 0 and 1 type arguments`
- `Argument of type 'X' is not assignable to parameter of type 'never'`

These errors occur due to TypeScript's strict type checking when working with Jest mocks in an ESM environment.

### Solutions:

#### 1. Use `jest.Mock` without generic type arguments

**Bad:**
```typescript
const mockFn = something as jest.Mock<any, any>;
```

**Good:**
```typescript
const mockFn = something as jest.Mock;
```

#### 2. Cast complex mock values with `as any`

When providing values to mock functions that TypeScript struggles to type correctly:

**Bad:**
```typescript
mockFn.mockResolvedValueOnce(complexObject);
```

**Good:**
```typescript
mockFn.mockResolvedValueOnce(complexObject as any);
```

#### 3. Add non-null assertions for mock calls

When accessing mock call arguments that TypeScript might see as possibly undefined:

**Bad:**
```typescript
expect(mockFn.mock.calls[0][0]).toEqual(expectedValue);
```

**Good:**
```typescript
expect(mockFn.mock.calls[0]![0]).toEqual(expectedValue);
```

## Implementation Example

Here's an example of correctly typing and mocking a complex function:

```typescript
// Mock the function
(mockDb.select().from(schema.animationDesigns).where(eq(schema.animationDesigns.sceneId, 'scene-1')).execute as jest.Mock)
  .mockResolvedValueOnce(mockDesignsData as any);

// Verify mock was called with expected arguments
const selectCall = (mockDb.select()...execute as jest.Mock).mock.calls[0]!;
expect(selectCall[0]).toEqual(expectedArg);
```

This approach ensures TypeScript properly understands our mock types and prevents "not assignable to parameter of type 'never'" errors.
