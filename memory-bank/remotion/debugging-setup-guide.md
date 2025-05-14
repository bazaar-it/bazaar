# Custom Component Debugging Setup Guide

## Environment Setup

To use the debugging tools, you'll need to set up your environment correctly:

1. Install required dependencies:
   ```bash
   npm install postgres@^3.3.0 chalk
   ```

2. Create a `.env.local.debug` file in the project root with your database connection:
   ```
   # Database connection
   DATABASE_URL=postgres://user:password@db.example.neon.tech/neondb?sslmode=require
   ```

3. Replace the placeholder in DATABASE_URL with your actual Neon PostgreSQL connection string.

## Available Tools

### 1. Component ID Extractor

The `extract-component-ids.js` script scans log files and creates a convenient reference file with all component IDs for testing.

```bash
node src/scripts/extract-component-ids.js
```

This creates a file at `memory-bank/component-ids.md` with all the component IDs organized alphabetically.

### 2. Standalone Database Debugger

The `debug-standalone.ts` script allows direct database access for debugging components, bypassing the need for the full environment setup.

```bash
# List all failed components
npx tsx src/scripts/debug-standalone.ts failed-components

# View details of a specific component
npx tsx src/scripts/debug-standalone.ts component-details <componentId>

# Reset a component to pending status
npx tsx src/scripts/debug-standalone.ts fix-component <componentId>

# Reset all failed builds
npx tsx src/scripts/debug-standalone.ts reset-builds
```

### 3. Component Build System Fixer

Fixes nesting issues in the buildCustomComponent.ts file:

```bash
# Test the fix (dry run)
npx tsx src/scripts/fix-build-system.ts

# Apply the fix
npx tsx src/scripts/fix-build-system.ts --apply
```

### 4. Component Diagnostic Tool

Analyzes components for common issues:

```bash
npx tsx src/scripts/diagnose-component.ts <componentId>
```

### 5. Component Fixer

Automatically fixes common issues in component code:

```bash
# Dry run to see what would be fixed
npx tsx src/scripts/fix-component.ts <componentId>

# Apply the fixes
npx tsx src/scripts/fix-component.ts <componentId> --apply
```

## Debugging Workflow

1. Extract component IDs from logs:
   ```bash
   node src/scripts/extract-component-ids.js
   ```

2. Fix the build system structure if needed:
   ```bash
   npx tsx src/scripts/fix-build-system.ts --apply
   ```

3. Examine a failed component:
   ```bash
   npx tsx src/scripts/debug-standalone.ts component-details <componentId>
   ```

4. Diagnose specific issues:
   ```bash
   npx tsx src/scripts/diagnose-component.ts <componentId>
   ```

5. Fix the component:
   ```bash
   npx tsx src/scripts/fix-component.ts <componentId> --apply
   ```

6. Reset it to pending to trigger a rebuild:
   ```bash
   npx tsx src/scripts/debug-standalone.ts fix-component <componentId>
   ```

## Component Error Patterns

Based on our analysis, common issues include:

1. **"use client" directive** - This Next.js directive is invalid in direct browser execution
2. **Import statement format** - Naked destructuring imports cause syntax errors
3. **Component registration** - Missing `window.__REMOTION_COMPONENT` assignment
4. **Build system nesting** - The `buildCustomComponent` function being nested within another function

## Sample Connection String

For Neon Postgres, the connection string format is:

```
postgres://[user]:[password]@[hostname]/[database]?sslmode=require
```

You can find this in your Neon dashboard under "Connection Details". 