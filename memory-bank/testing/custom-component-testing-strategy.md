# Custom Component Testing Strategy

This document outlines the strategy for testing custom component integration in the Bazaar Video Editor, particularly focusing on how components are loaded, rendered, and updated in the PreviewPanel.

## Key Components and Their Interactions

1. **PreviewPanel** (`src/app/projects/[id]/edit/panels/PreviewPanel.tsx`)
   - Manages the player state and custom component lifecycle
   - Handles component script cleanup and refresh operations
   - Monitors component status changes

2. **DynamicVideo** (`src/remotion/compositions/DynamicVideo.tsx`)
   - The main Remotion composition that renders scenes
   - Handles the refreshToken mechanism to trigger component remounts

3. **JSON Patch Operations** (`src/types/json-patch.ts`)
   - Used to update the video state through RFC-6902 JSON patches
   - Critical for adding, removing, and updating custom components

4. **InputProps Schema** (`src/types/input-props.ts`)
   - Defines the structure of video data including scenes and components

## Testing Approaches

We've implemented three main testing approaches to verify the correct behavior of custom components:

### 1. Automated Unit Tests

Located in `src/app/projects/[id]/edit/panels/__tests__/PreviewPanel.test.tsx`, these tests focus on:

- Component initialization with project props
- Detection of custom component changes
- Proper cleanup of component scripts when components are removed
- Refresh token propagation to the DynamicVideo component

These tests use Jest and React Testing Library to mock the player and verify component behavior.

### 2. Integration Tests

Located in `src/tests/integration/customComponentIntegration.test.ts`, these tests focus on:

- JSON Patch operations on the InputProps structure
- Verifying that patches correctly modify the video data
- Ensuring component additions and removals work as expected
- Validating that the video duration is correctly adjusted when needed

These tests don't depend on the DOM or React, focusing solely on data transformation operations.

### 3. Manual Browser Tests

Located in `src/scripts/manualTestCustomComponents.js`, this script can be executed in the browser console to:

- Add test components to the current project
- Simulate component loaded events
- Remove components
- Test the full component lifecycle from addition to rendering
- Verify DOM manipulation and script management

## Key Aspects to Test

When testing custom component integration, focus on these critical aspects:

1. **Component Addition**
   - When a custom component is added via JSON patch, does it appear in the scene list?
   - Is the video duration adjusted if necessary?

2. **Component Loading**
   - When a component script loads, does the component appear in the preview?
   - Are loading status indicators updated correctly?

3. **Component Refreshing**
   - When the refresh button is clicked, are components properly reloaded?
   - Does the refreshToken mechanism cause components to remount?

4. **Component Removal**
   - When a component is removed, are its scripts properly cleaned up?
   - Is the DOM left in a clean state?

5. **Error Handling**
   - Are errors in component loading properly reported?
   - Does the system gracefully handle malformed components?

## Running Tests

### Automated Tests

```bash
# Run unit tests for PreviewPanel
npm test -- -t "PreviewPanel"

# Run integration tests for JSON Patch operations
npm test -- -t "Custom Component Integration"
```

### Manual Browser Tests

1. Navigate to a project edit page in your development environment
2. Open the browser console
3. Copy and paste the entire contents of `src/scripts/manualTestCustomComponents.js`
4. Run the test functions as described in the console output

Example:
```javascript
// Run all tests in sequence
bazaarTests.runAllTests()

// Or run individual tests
bazaarTests.addCustomComponent()
bazaarTests.testFullComponentFlow()
```

## Common Issues and Solutions

### Issue: Components not appearing in preview

**Possible causes:**
- Component scripts not properly loaded
- Errors in component code
- refreshToken not properly propagated

**Debugging steps:**
1. Check browser console for script loading errors
2. Verify window.__REMOTION_COMPONENT is set
3. Ensure the component ID in the scene data matches the loaded component

### Issue: Components disappearing after refresh

**Possible causes:**
- Insufficient script cleanup
- Race conditions in component loading
- Component state not preserved

**Debugging steps:**
1. Use `bazaarTests.logComponentStatus()` to check component scripts
2. Examine the cleanupComponentScripts function behavior
3. Verify refreshToken changes are triggering remounts

## Future Testing Improvements

1. **End-to-End Tests** - Implement Cypress or Playwright tests that verify the full user flow
2. **Performance Testing** - Measure and optimize component loading times
3. **Visual Regression Testing** - Ensure components render consistently across browsers 