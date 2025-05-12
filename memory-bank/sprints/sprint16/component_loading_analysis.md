# Custom Component Loading Issue Analysis

## Error Messages

We're seeing consistent errors when loading custom components:

```
Error: Unexpected token '{'. import call expects one or two arguments.
🔴 [INTERCEPTED] "[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: 7bff90dd-a813-455e-9622-c2d7eb7fa36f"
🔴 [INTERCEPTED] "[CustomScene] Metadata fetch timeout for component 7bff90dd-a813-455e-9622-c2d7eb7fa36f after 5 seconds"
```

## Understanding the Error Chain

After examining the source code, we can now precisely trace the error chain:

1. **"Unexpected token '{'. import call expects one or two arguments"**
   - This is a JavaScript syntax error occurring during script evaluation
   - The browser encounters invalid ES module syntax in the component code
   - The error message indicates a problem specifically with a naked `{` - likely in imports
   - The key pattern causing this error is likely: `import {something} from "react"` (without a preceding variable)
   - This syntax error prevents the entire component script from executing

2. **"[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found"**
   - This comes from `useRemoteComponent.tsx` line 164
   - The script's `onload` handler fired (script was delivered) but execution failed
   - The conditional check `if (window.__REMOTION_COMPONENT)` (line 156) evaluated to false
   - Since the script failed to execute due to the syntax error, `window.__REMOTION_COMPONENT` was never set

3. **"[CustomScene] Metadata fetch timeout for component... after 5 seconds"**
   - This comes from `CustomScene.tsx` lines 83-85 where a 5-second timeout is set
   - The metadata fetch process starts, but when the component isn't loaded properly, the process stalls
   - The timeout is triggered after 5 seconds with no successful metadata resolution

## Investigating the 🔴 [INTERCEPTED] Message

The "[INTERCEPTED]" prefix indicates these messages are being captured by a console interceptor, likely in our debug system. This is a custom logging mechanism we've implemented to catch and highlight important error messages from different parts of the application.

## Component Loading Process Flow

After reviewing the code, here's a detailed breakdown of how components are loaded:

1. **Component Generation**
   - LLM generates component code with imports, props, and animations
   - The generated code is processed and stored in R2 storage
   - A database record is created in `customComponentJobs` with status "complete"

2. **Component Loading (Client Side - useRemoteComponent.tsx)**
   - The loading sequence is triggered by:
     ```typescript
     // Line 130-146 of useRemoteComponent.tsx
     const script = document.createElement('script');
     script.id = scriptId as string;
     // Add timestamp for cache busting
     const urlWithTimestamp = componentId.includes('?') 
       ? `${componentId}&t=${timestamp}` 
       : `${componentId}?t=${timestamp}`;
     let scriptUrl = urlWithTimestamp;
     if (!scriptUrl.startsWith('/api/')) {
       scriptUrl = `/api/components/${urlWithTimestamp}`;
     }
     script.src = scriptUrl;
     ```
   - The script's `onload` handler (lines 153-179) checks if `window.__REMOTION_COMPONENT` exists
   - If not found, it logs the error but doesn't attempt to recover

3. **Component Serving (Server Side - route.ts)**
   - The API route handler follows these steps:
     ```typescript
     // Simplified flow from route.ts
     // 1. Get component job from database
     const job = await db.query.customComponentJobs.findFirst({
       where: eq(customComponentJobs.id, componentId)
     });
     // 2. Fetch JS content from R2
     const r2Response = await fetch(job.outputUrl);
     let jsContent = await r2Response.text();
     // 3. Process content with regex replacements
     jsContent = jsContent.replace(/import\s+([a-z]),/g, 'import React,');
     // 4. Add window.__REMOTION_COMPONENT assignment
     // 5. Return processed JS
     ```
   - The processed content is returned with `Content-Type: application/javascript`

4. **Component Execution (Client Browser)**
   - Browser attempts to execute the script as JavaScript
   - If syntax is valid, then `window.__REMOTION_COMPONENT` gets set
   - If there's a syntax error, execution stops and no global variable is set
   - The `onload` handler fires regardless of whether execution succeeded

5. **Error Handling and Fallbacks**
   - If the script loads but contains syntax errors:
     1. The browser's JavaScript engine reports a syntax error
     2. The `onload` handler checks for `window.__REMOTION_COMPONENT` (not found)
     3. Error is logged: "Component loaded but __REMOTION_COMPONENT not found"
     4. No fallback rendering mechanism exists for syntax errors

## Specific Failure Identified

After analyzing the code and error messages, we can now pinpoint exactly what's happening:

1. **The Naked Import Statement Problem:**
   - The component code likely contains an import statement with a naked curly brace pattern:
     ```javascript
     import {useState, useEffect} from 'react';
     ```
   - This exact pattern is NOT handled by our current regex replacements in the route.ts file
   - The regex we have only handles:
     ```javascript
     import a from 'react';  // Single-letter replacements
     import a, {useState} from 'react';  // Single-letter with destructuring
     ```
   - But we don't have a pattern for standalone destructuring imports

2. **The Script Execution Dilemma:**
   - When the browser encounters the syntax error, it stops executing the entire script
   - This means none of our other code (including the window.__REMOTION_COMPONENT assignment) ever runs
   - Importantly, our fallback detection code never gets a chance to execute either

3. **Missing Recovery Mechanism:**
   - The `useRemoteComponent` hook doesn't have a way to recover from syntax errors
   - Once the script fails to execute, there's no fallback rendering path
   - The error detection only happens after the fact

## Recommended Solutions

1. **Fix the Import Pattern (Primary Solution):**
   - Add a specific regex to handle naked import destructuring:
     ```typescript
     // Add this to route.ts
     // Replace naked destructuring imports with React + destructuring
     jsContent = jsContent.replace(
       /import\s*\{([^}]*)\}\s*from\s*["']react["']/g, 
       'import React, {$1} from "react"'
     );
     ```
   - This pattern specifically targets imports with only destructuring from 'react'

2. **Add Escape Hatch for Syntax Errors:**
   - Wrap the entire component in a try/catch at the API level:
     ```typescript
     // Try parsing the component before returning it to catch syntax errors
     try {
       // Add a special wrapper to safely validate the code can be evaluated
       Function('"use strict";' + jsContent);
     } catch (syntaxError) {
       // If there's a syntax error, return a safe fallback component instead
       jsContent = `
         console.error('[Component Loader] Syntax error in component, using fallback:', ${JSON.stringify(syntaxError.message)});
         window.__REMOTION_COMPONENT = props => {
           return React.createElement('div', {
             style: { backgroundColor: 'red', color: 'white', padding: '20px' }
           }, [
             React.createElement('h2', {key: 'title'}, 'Component Syntax Error'),
             React.createElement('p', {key: 'message'}, ${JSON.stringify(syntaxError.message)})
           ]);
         };
       `;
     }
     ```

3. **Standardize Component Output:**
   - Update the component generation process to produce consistent output format
   - Always use a standard pattern like:
     ```javascript
     import React from 'react';
     import {useCurrentFrame, useVideoConfig} from 'remotion';
     
     const MyComponent = (props) => {
       // Component implementation
     };
     
     window.__REMOTION_COMPONENT = MyComponent;
     ```
   - This would eliminate the need for complex regex transformations

## Testing Plan

To verify our solutions, we should:

1. **Capture real component code:**
   ```bash
   # Run with server running
   curl http://localhost:3000/api/components/7bff90dd-a813-455e-9622-c2d7eb7fa36f > component.js
   ```

2. **Test our regex fixes on real examples:**
   ```bash
   # Create a test script to apply our regexes and check for syntax errors
   node -e "const fs = require('fs');
   const code = fs.readFileSync('component.js', 'utf8');
   const fixed = code.replace(/import\s*\{([^}]*)\}\s*from\s*[\"']react[\"']/g, 
     'import React, {$1} from \"react\"');
   fs.writeFileSync('fixed.js', fixed);
   console.log('Fixed.');"
   
   # Try to parse it (will throw error if syntax is invalid)
   node -e "require('./fixed.js')"
   ```

3. **Update our approach based on actual component data:**
   - We may find additional patterns that need fixing
   - The goal is to handle all common patterns without introducing new errors
