# Script Inventory

## Overview
This document tracks all scripts in the repository, their purpose, and their migration status in the reorganization process.

## Script Categories

### Component Fixing Scripts

| Original File | Purpose | New Location | Status | Notes |
|---------------|---------|-------------|--------|-------|
| `fix-component.js` | Fix component issues | `commands/components/fix/fix-component.js` | Moved | Base component fix script |
| `fix-component.ts` | TypeScript version | `commands/components/fix/fix-component.ts` | Moved | Prefer over JS version |
| `fix-component-syntax.ts` | Fix syntax issues | `commands/components/fix/fix-syntax.js` | Migrated | Modified to use new structure |
| `fix-component-missing-code.js` | Fix missing code | `commands/components/fix/fix-missing-code.js` | To Migrate | Need to convert to new system |
| `fix-stuck-component.js` | Fix stuck components | `commands/components/fix/fix-stuck.js` | To Migrate | Need to convert to new system |
| `fix-component-urls.js` | Fix URL issues | `commands/components/fix/fix-urls.js` | To Migrate | Need to convert to new system |
| `fix-specific-component.js` | Fix specific component | `commands/components/fix/fix-specific.js` | To Migrate | Consider consolidating |
| `fix-tetris-*.js` | Fix tetris components | `test/legacy/fix-tetris` | To Archive | No longer needed |

### Component Analysis Scripts

| Original File | Purpose | New Location | Status | Notes |
|---------------|---------|-------------|--------|-------|
| `analyze-components.ts` | Component analysis | `commands/components/analyze/analyze.js` | Migrated | Base analysis script |
| `analyze-errors.js` | Error analysis | `commands/components/analyze/analyze-errors.js` | Migrated | Error pattern detection |
| `check-component.js` | Check component | `commands/components/verify/verify-component.js` | Migrated | Enhanced with new functionality |
| `check-specific-component.js` | Check specific | `commands/components/verify/verify-specific.js` | To Migrate | Consider consolidating |

### Database Tools

| Original File | Purpose | New Location | Status | Notes |
|---------------|---------|-------------|--------|-------|
| `db-tools/*` | Database utilities | `lib/db/` | Moved | Kept original functionality |
| `explore-db.js` | Database exploration | `commands/db/analyze/explore-db.js` | To Migrate | |
| `explore-db.ts` | TypeScript version | `commands/db/analyze/explore-db.ts` | To Migrate | |
| `add-*-recovery-columns.ts` | DB schema changes | `commands/db/migrate/` | To Migrate | Convert to migration format |

### Testing & Debugging

| Original File | Purpose | New Location | Status | Notes |
|---------------|---------|-------------|--------|-------|
| `test-*.js` | Test scripts | `test/` | To Migrate | |
| `debug-*.js` | Debug utilities | `debug/` | To Migrate | |
| `diagnostics/*` | Diagnostic tools | `debug/diagnostics/` | To Migrate | |

### Creation Scripts

| Original File | Purpose | New Location | Status | Notes |
|---------------|---------|-------------|--------|-------|
| `create-test-component.ts` | Create test component | `commands/components/create/create-test.js` | To Migrate | |
| `create-simple-shape.js` | Create shape | `commands/components/create/create-shape.js` | To Migrate | |
| `add-simple-component-direct.js` | Add component | `commands/components/create/add-simple.js` | To Migrate | |

### Migration Scripts

| Original File | Purpose | New Location | Status | Notes |
|---------------|---------|-------------|--------|-------|
| `migrate-*.ts` | DB migrations | `commands/db/migrate/` | To Migrate | Convert to new migration format |
| `backfill-message-kind.ts` | Data backfill | `commands/db/migrate/` | To Migrate | |

## Next Steps

1. **Priority Migrations**:
   - `fix-component-missing-code.js` → Important for component recovery
   - `explore-db.ts` → Critical database diagnostic tool
   - `check-build-status.js` → Important for CI/CD process

2. **Low Priority Scripts**:
   - Legacy tetris-specific scripts can be archived
   - One-off migration scripts can be lower priority

3. **Consolidation Candidates**:
   - Multiple "check component" scripts should be merged
   - Several similar "fix component" scripts can be unified with command-line options

4. **Delete Candidates**:
   - Duplicate JS/TS versions (keep TS)
   - Scripts with identical functionality but different names
   - Scripts that were only needed once for a specific migration
