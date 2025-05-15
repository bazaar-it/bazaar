# Scripts Directory Reorganization

## Overview

This document details the reorganization of the `/src/scripts` directory in the Bazaar-Vid project, aimed at improving maintainability, reducing duplication, and standardizing the module system.

## Current Status

We've identified several issues with the scripts directory:

1. **Module System Confusion**: Inconsistent use of ESM and CommonJS module systems
2. **Redundancy**: Multiple scripts with similar purposes and duplicate functionality
3. **Lack of Documentation**: Many scripts lack clear purpose documentation
4. **Mixed File Types**: Mixture of `.js`, `.ts`, `.mjs`, and other file extensions

## New Directory Structure

We've implemented a new directory structure to address these issues:

```
src/scripts/
├── README.md                  # Overall documentation
├── package.json               # Local script dependencies (ESM-based)
├── tsconfig.json              # TypeScript configuration
├── bin/                       # Executable entry points
│   ├── fix-components.js      # Main entry point for fixing components
│   ├── analyze-components.js  # Main entry point for analysis
│   └── migrate-db.js          # Main entry point for migrations
├── lib/                       # Shared utilities
│   ├── db/                    # Database utilities
│   │   └── utils.js           # DB connection and query helpers
│   ├── components/            # Component utilities
│   │   └── component-manager.js # Component management utilities
│   ├── logger.js              # Logging utilities
│   └── env.js                 # Environment variable handling
├── commands/                  # Individual commands
│   ├── components/            # Component-related commands
│   │   ├── fix/              # Fix commands
│   │   ├── analyze/          # Analysis commands
│   │   └── verify/           # Verification commands
│   └── db/                    # Database commands
│       ├── migrate/          # Migration commands
│       └── analyze/          # Analysis commands
├── test/                      # Test scripts
├── debug/                     # Debugging utilities
└── config/                    # Configuration
    └── database.js            # Database configuration
```

## Key Features of the New Structure

1. **Standardized Module System**: Consistent use of ES Modules
2. **Entry Points**: Clean command-line entry points using Commander.js
3. **Shared Utilities**: Common functionality extracted to lib/
4. **Documentation**: README files and JSDoc comments
5. **Organized Categories**: Scripts organized by purpose and function

## Migrated Files

We've started by moving the following files into the new structure:

1. **Database Tools**: Moved from `db-tools/` to `lib/db/`
2. **Component Scripts**: Organized into `commands/components/{fix,analyze,verify}/`
3. **Test Scripts**: Consolidated into `test/`
4. **Debug Scripts**: Moved to `debug/`

## New Utility Libraries

We've created several new utility libraries to standardize common functionality:

1. **`lib/db/utils.js`**: Database connection and query utilities
2. **`lib/logger.js`**: Standardized logging with formatting
3. **`lib/env.js`**: Environment variable handling
4. **`lib/components/component-manager.js`**: Component utilities
5. **`config/database.js`**: Centralized database configuration

## Usage Examples

### Fix Component Syntax Issues

```bash
cd src/scripts
npm run fix -- syntax --component-id abc123
```

### Verify Component Integrity

```bash
cd src/scripts
npm run verify -- --component-id abc123 --check-r2
```

### Run Database Migration

```bash
cd src/scripts
npm run migrate -- 20240516-add-component-metadata
```

## Next Steps

1. **Complete Migration**: Move remaining useful scripts to the new structure
2. **TypeScript Conversion**: Convert key utilities to TypeScript
3. **Add Tests**: Add tests for critical utilities
4. **Documentation**: Complete JSDoc comments and examples
5. **Delete Redundant Scripts**: Remove duplicate and obsolete scripts

## Benefits

1. **Reduced Duplication**: Common utilities shared across scripts
2. **Better Maintainability**: Clear structure makes it easier to understand and modify
3. **Module System Consistency**: Standardized on ES Modules
4. **Improved Documentation**: README files and JSDoc comments
5. **Clearer Entry Points**: Well-defined commands with Commander.js
