# Custom Component Debugging Tools

## Overview

Based on the screenshot of failed component builds, we've created specialized debugging tools to help diagnose and fix issues with custom components. These tools allow you to inspect component code directly from the database, diagnose common issues, and apply fixes automatically.

## Available Tools

### 1. Database Debugging Tool (`debug-db.ts`)

A general-purpose tool for inspecting custom component jobs in the database:

```bash
# List all failed component builds
npx tsx src/scripts/debug-db.ts failed-components

# Show details for a specific component
npx tsx src/scripts/debug-db.ts component-details <componentId>

# Reset a component to pending status
npx tsx src/scripts/debug-db.ts fix-component <componentId>  

# Reset all failed builds to pending
npx tsx src/scripts/debug-db.ts reset-builds
```

### 2. Component Diagnostic Tool (`diagnose-component.ts`)

Analyzes a component's TSX code for common issues:

```bash
# Run diagnostics on a specific component
npx tsx src/scripts/diagnose-component.ts <componentId>

# Show the full code along with diagnostics
npx tsx src/scripts/diagnose-component.ts <componentId> --show-code
```

This tool checks for:
- "use client" directives
- Destructured import statements
- Single-letter React imports
- Missing React.createElement
- Missing exports
- Missing window.__REMOTION_COMPONENT assignment
- JavaScript syntax errors

### 3. Component Fix Tool (`fix-component.ts`)

Automatically fixes common issues in component code:

```bash
# Show what would be fixed (dry run)
npx tsx src/scripts/fix-component.ts <componentId>

# Apply fixes and reset the component to pending
npx tsx src/scripts/fix-component.ts <componentId> --apply
```

This tool can fix:
- Removing "use client" directives
- Standardizing React imports
- Adding window.__REMOTION_COMPONENT assignment
- Removing duplicate export statements

### 4. Build System Fix Tool (`fix-build-system.ts`)

Fixes structural issues in the buildCustomComponent.ts file:

```bash
# Check for nesting issues (dry run)
npx tsx src/scripts/fix-build-system.ts

# Apply fixes to the build system
npx tsx src/scripts/fix-build-system.ts --apply
```

## Common Component Issues

Based on the screenshot and our analysis, we've identified several recurring issues:

1. **"use client" Directive**: This Next.js directive is invalid when executed directly in browser scripts
2. **Import Statement Format**: Naked destructuring imports (`import { useState } from 'react'`) cause syntax errors
3. **Single-letter Variable Names**: Components using `a.createElement` instead of `React.createElement`
4. **Missing Component Registration**: The `window.__REMOTION_COMPONENT` global variable not being set
5. **Nesting Issue in Build System**: The `buildCustomComponent` function appears to be nested inside another function

## Usage Example

To fix a failing component:

1. First, diagnose the specific issues:
   ```bash
   npx tsx src/scripts/diagnose-component.ts 31ba948d-4aef-4f7e-8d82-17e872dcabfa
   ```

2. Apply the automatic fixes:
   ```bash
   npx tsx src/scripts/fix-component.ts 31ba948d-4aef-4f7e-8d82-17e872dcabfa --apply
   ```

3. Fix the build system if needed:
   ```bash
   npx tsx src/scripts/fix-build-system.ts --apply
   ```

4. Verify component builds successfully:
   ```bash
   npx tsx src/scripts/debug-db.ts component-details 31ba948d-4aef-4f7e-8d82-17e872dcabfa
   ```

## Next Steps

After applying these fixes:

1. Run the component build worker to process any pending jobs
2. Monitor for new errors and refine the diagnostic/fix tools as needed
3. Update the component generation process to prevent these issues in the future 

## Runtime Behavior in PreviewPanel: Script Management

While the tools above help with static analysis and fixing of component code and build issues, it's also important to understand how components are managed at runtime in the `PreviewPanel.tsx` when debugging UI rendering issues, especially around component refresh:

*   **Selective Script Cleanup**: `PreviewPanel.tsx` now consistently uses a selective script cleanup mechanism (`cleanupComponentScripts`). This targets only the script tag(s) associated with the specific component ID(s) being managed. This approach is used when:
    *   A component is removed from the timeline.
    *   An *individual* component is refreshed via the debug panel.
    *   The main "Refresh Preview" button is clicked (its `handleRefresh` function now also uses this selective cleanup for all active components).

Understanding this consistent script cleanup behavior can help diagnose why a component might load or unload unexpectedly during different refresh scenarios in the `PreviewPanel`.