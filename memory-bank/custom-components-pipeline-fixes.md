# Custom Components Pipeline - Issues and Fixes

## Overview

The custom components pipeline in Bazaar-Vid allows users to generate custom Remotion components with LLM-generated code. However, there are several issues in the loading mechanism that need to be addressed.

## Identified Issues

1. **Component Registration Issues**:
   - Components marked as "success" in database don't always exist in R2 storage
   - Components don't properly register with the `window.__REMOTION_COMPONENT` global
   - Some components register with custom variable names instead of using `window.__REMOTION_COMPONENT`

2. **Script Cleanup Problems**:
   - The `PreviewPanel.tsx` script cleanup is too aggressive, removing components before proper registration
   - Script tags aren't properly identified and removed during component refresh

3. **Error Handling Gaps**:
   - Failed components during LLM generation are marked as successful
   - Missing validation and error handling throughout the pipeline

4. **Loading Race Conditions**:
   - Timing issues between script loading and component registration
   - Script loading via `src` attribute has caching problems

## Proposed Fixes

### 1. API Route Enhancements (`api/components/[componentId]/route.ts`)

- Improve component registration by analyzing component code for:
  - Different export patterns (default exports, named exports, etc.)
  - Component variable naming conventions
  - Missing imports
- Add fallback mechanisms when components aren't explicitly registered
- Implement more robust error detection and reporting

### 2. Component Loading Improvements (`useRemoteComponent.tsx`)

- Replace direct script tag `src` with fetch + inline script approach
- Add proper `AbortController` for better cleanup on unmount
- Implement component validation before rendering
- Enhance retry logic with backoff
- Improve error recovery by scanning global scope for possible component functions

### 3. Preview Panel Fixes (`PreviewPanel.tsx`)

- Implement more thorough script tag identification and removal
- Track component status with visual indicators
- Separate full refresh from partial refresh logic

### 4. Verification Toolkit

- Create a comprehensive pipeline verification tool
- Test the entire component pipeline from generation to rendering
- Implement database verification utilities to ensure consistency

## Implementation Plan

1. First fix the API route's component code processing to handle various registration patterns
2. Update the `useRemoteComponent` hook to use the fetch+inline approach and improve error handling
3. Enhance the script cleanup and refresh logic in `PreviewPanel`
4. Develop verification tools to test and fix database inconsistencies

This multi-layered approach will significantly improve the reliability of the custom component pipeline by addressing issues at each step of the process. 