# Custom Component Testing Strategy

This document outlines the strategy for testing custom components in the Bazaar-Vid application, focusing on both integration testing (JSON patch operations) and component testing (PreviewPanel).

## Test Files Overview

### 1. `customComponentIntegration.test.ts`

This test validates the integration between JSON Patch operations and custom components. It ensures that patches correctly modify the video structure when:

- Adding new custom components to scenes
- Updating properties of existing components
- Removing components from scenes
- Adjusting video duration to accommodate components
- Maintaining correct scene ordering after multiple operations

The test uses a custom JSON patch implementation to avoid library compatibility issues while maintaining the expected behavior.

### 2. `PreviewPanel.test.tsx`

This test validates the PreviewPanel component's behavior with custom components, focusing on:

- Component initialization with project props
- Rendering and handling custom component loading
- Script cleanup when components are unmounted
- Refresh functionality

## Testing Challenges

### Next.js App Router Path Constraints

Testing components in directories with special characters (like `[id]`) requires special handling:

1. Special configuration files (`jest-special-paths.config.cjs`) for Jest
2. Escaping brackets in terminal commands: `"src/app/projects/\\[id\\]/edit/panels/__tests__/PreviewPanel.test.tsx"`

### React Testing Library and Zustand Store Mocking

Custom implementation is needed to mock the Zustand store:

```typescript
// Create a better mock implementation of the video state with proper typing
const createMockVideoState = () => {
  const mockGetCurrentProps = jest.fn();
  const mockSetProject = jest.fn();
  const mockForceRefresh = jest.fn();

  return {
    getCurrentProps: mockGetCurrentProps,
    setProject: mockSetProject,
    forceRefresh: mockForceRefresh,
    // Store the mock functions for assertions
    mockFunctions: {
      mockGetCurrentProps,
      mockSetProject,
      mockForceRefresh
    }
  };
};
```

### DOM Manipulation Testing

Testing script tag manipulation requires:

1. Creating actual script elements in the test environment
2. Spying on removal methods
3. Mocking `querySelectorAll` to return test elements
4. Manually triggering behavior that's difficult to test directly

## Key Solutions

### Custom JSON Patch Implementation

For `customComponentIntegration.test.ts`, we implemented a simplified JSON patch function that:

1. Deep clones the document to avoid modifying the original
2. Handles `add`, `remove`, and `replace` operations
3. Properly processes path segments with array indices
4. Supports array operations with the `-` notation

### React Component Testing

For `PreviewPanel.test.tsx`, we:

1. Added a `data-testid` attribute to the PreviewPanel component to enable easier testing
2. Created a helper function for consistent store mocking
3. Used proper TypeScript casting to fix type issues
4. Implemented direct mocking of store functions instead of trying to access React internals
5. Wrapped critical rendering and updates in `act()` to handle async React updates

## Running the Tests

```bash
# For the integration test
npm test -- src/tests/integration/customComponentIntegration.test.ts

# For the PreviewPanel component test (with special path handling)
NODE_OPTIONS=--experimental-vm-modules npx jest -c jest-special-paths.config.cjs
```

## Future Improvements

1. **Better Async Handling**: Use React 18's improved `act()` and concurrent mode features
2. **Reduced Console Noise**: Suppress Remotion license warnings during tests
3. **Component Mocking**: Create dedicated mocks for Remotion's Player to avoid unnecessary rendering
4. **Visual Regression Testing**: Add visual tests to verify component appearance 