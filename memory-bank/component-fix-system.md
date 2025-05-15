# Custom Component Fix System

## Overview

The Custom Component Fix System provides a comprehensive solution for diagnosing and fixing issues with custom Remotion components in Bazaar-vid. It addresses three key problems that were preventing custom components from appearing in the preview panel:

1. Components marked as "ready" but missing `outputUrl` values in the database
2. Components with syntax errors (particularly extra semicolons after JSX closing tags)
3. Components missing the required `window.__REMOTION_COMPONENT` assignment

This document explains how to use the tools and components we've developed to identify and fix these issues.

## Tools and Components

### 1. Command-Line Scripts

#### `fix-custom-components.ts`

This is the primary script that identifies and fixes issues with custom components.

```bash
# Fix all components in a project
npx tsx src/scripts/fix-custom-components.ts [project-id]

# Check for issues but don't fix them
npx tsx src/scripts/fix-custom-components.ts [project-id] --check

# Fix a specific component
npx tsx src/scripts/fix-custom-components.ts --component=component-id

# Show detailed logs
npx tsx src/scripts/fix-custom-components.ts [project-id] --verbose
```

#### `run-fix-custom-components.sh`

A convenience shell script that loads environment variables before running the fix script.

```bash
# Make the script executable
chmod +x src/scripts/run-fix-custom-components.sh

# Run the script
./src/scripts/run-fix-custom-components.sh [project-id] [options]
```

### 2. Specialized Fix Scripts

The system includes several specialized scripts for fixing specific issues:

- `fix-missing-outputUrl.ts`: Fixes components with missing output URLs
- `fix-remotion-component-assignment.ts`: Fixes components missing the required `window.__REMOTION_COMPONENT` assignment
- `fix-component-syntax.ts`: Fixes common syntax errors like extra semicolons

### 3. UI Component

The `CustomComponentDiagnostic` React component provides a user-friendly interface for diagnosing and fixing component issues directly from the application. It shows:

- Count of components with various issues
- Detailed information about each problematic component
- Buttons to fix issues with one click
- Code viewer for examining problematic components

## Common Issues and Fixes

### 1. Missing Output URL

**Problem**: Components with status 'ready' or 'complete' but missing `outputUrl` values in the database.

**Fix**: The system generates the correct R2 URL based on the component ID and updates the database record.

### 2. Extra Semicolons in JSX

**Problem**: Components with syntax errors like `</div>;` (semicolon after closing JSX tag).

**Fix**: The system removes these extra semicolons to make the code valid.

### 3. Missing Remotion Component Assignment

**Problem**: Components missing the required `window.__REMOTION_COMPONENT = MyComponent;` line.

**Fix**: The system detects the component name and adds the required assignment at the end of the file.

### 4. Missing React/Remotion References

**Problem**: Components missing the required references to React and Remotion globals.

**Fix**: The system adds:
```javascript
const React = window.React;
const { AbsoluteFill } = window.Remotion;
```

## Working with Environment Variables

The scripts require access to environment variables for database and R2 storage connections. Ensure these variables are correctly set in your `.env` or `.env.local` file:

- `DATABASE_URL`: Connection string for the Neon database
- `R2_PUBLIC_URL`: Public URL for the R2 storage bucket

## Creating Guaranteed Working Components

In some cases, it may be useful to create a guaranteed working component for testing. The `create-test-component.ts` script can be used for this purpose:

```bash
npx tsx src/scripts/create-test-component.ts [project-id]
```

This creates a simple circle component that is guaranteed to work in the Remotion preview.

## Debug Component Template

The `debug-component-template.tsx` file provides a reference template for creating Remotion components that work correctly. This template includes all necessary boilerplate and can be used as a basis for new components.

## Best Practices for Custom Components

When creating custom Remotion components, follow these best practices to avoid common issues:

1. **Proper Global References**:
   ```javascript
   const React = window.React;
   const { AbsoluteFill, useVideoConfig } = window.Remotion;
   ```

2. **Component Registration**:
   ```javascript
   window.__REMOTION_COMPONENT = MyComponent;
   ```

3. **Clean JSX Syntax**:
   - No extra semicolons after JSX closing tags
   - Proper nesting of elements
   - Correct use of React fragments

4. **Safe Variable Usage**:
   - Avoid redefining variables from destructured hooks
   - Use unique variable names to prevent conflicts

5. **Proper Export**:
   ```javascript
   export default MyComponent;
   ```

## Integration with the Build System

When components are fixed, they are automatically queued for rebuilding by setting their status to 'pending' and clearing their `outputUrl` value. The build system will then pick up these components and rebuild them.

## Troubleshooting

If components still aren't appearing in the preview after fixing:

1. Check the browser console for errors
2. Verify that the component was successfully rebuilt (status should be 'ready' or 'complete')
3. Ensure the component has a valid `outputUrl` value
4. Try manually refreshing the preview panel
5. Check if the component code itself has other issues not caught by the fix scripts 