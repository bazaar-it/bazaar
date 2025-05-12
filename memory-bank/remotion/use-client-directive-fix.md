# Fixing "use client" Directive in Remotion Custom Components

## Problem Identified

We've been encountering persistent errors when loading custom components in Remotion:

```
Error: Unexpected token '{'. import call expects one or two arguments.
🔴 [INTERCEPTED] "[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: 7bff90dd-a813-455e-9622-c2d7eb7fa36f"
🔴 [INTERCEPTED] "[CustomScene] Metadata fetch timeout for component 7bff90dd-a813-455e-9622-c2d7eb7fa36f after 5 seconds"
```

After analyzing the logs, we discovered the root cause:

```
{"error":"Cannot use import statement outside a module","level":"error","message":"[API:COMPONENT:ERROR][ID:31ba948d-4aef-4f7e-8d82-17e872dcabfa] Component has syntax errors, providing fallback","timestamp":"2025-05-12T13:55:31.335Z"}
```

The issue is that our component code starts with the string literal `"use client";` which is:

1. Valid in Next.js/React source files to indicate a Client Component
2. Invalid standard JavaScript syntax when loaded directly in the browser via a script tag

This directive causes the browser's JavaScript parser to fail immediately, leading to the component not being registered and the fallback error component being displayed.

## Solution Implemented

We implemented a comprehensive fix by modifying several key files:

### 1. Updated Component Template (`src/server/workers/componentTemplate.ts`)

- Removed the `"use client";` directive completely
- Changed the imports to use global references (`window.React`, `window.Remotion`)
- Added robustness to the IIFE component registration with error handling
- Added a fallback component in case of errors

### 2. Updated Build Process (`src/server/workers/buildCustomComponent.ts`)

- Added explicit removal of `"use client";` directive in `wrapTsxWithGlobals`
- Changed esbuild configuration to use `format: 'iife'` instead of `'esm'`
- Fixed React/Remotion imports to work correctly with globals
- Improved IIFE wrapping for more reliable component registration
- Added better error handling and fallback components

### 3. Updated API Route (`src/app/api/components/[componentId]/route.ts`)

- Added explicit check and removal of `"use client";` directive
- Simplified component registration by focusing on the core issue
- Enhanced the IIFE wrapper for more reliable execution
- Improved error reporting and fallback components
- Maintained fallback component generation for syntax errors

## Why This Works

1. The `"use client";` directive is a Next.js-specific feature meant for source files, not for runtime execution
2. When a JavaScript file is loaded directly in a browser via a `<script>` tag, it executes in the global scope
3. Our fix removes invalid syntax and provides a consistent environment for component execution
4. The IIFE pattern ensures the component registration code runs reliably and in isolation
5. Multiple fallback mechanisms ensure something always renders, even in error cases

## Testing

To test this fix:

1. Generate a new custom component
2. Check browser console for any syntax errors
3. Verify component loads and renders correctly
4. Check that `window.__REMOTION_COMPONENT` is properly set

The component should now load without syntax errors and register properly with Remotion. 