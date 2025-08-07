# Sprint 90: Database Synchronization & Cleanup

## Sprint Overview
**Goal**: Synchronize dev and production databases, establish single source of truth, and clean up unused tables/columns.

**Critical**: This sprint addresses significant database schema differences that could cause application failures.

## Sprint Status
- **Started**: 2025-07-30
- **Status**: In Progress
- **Priority**: CRITICAL

## Key Objectives
1. Document all discrepancies between dev and prod databases
2. Verify what the codebase actually uses
3. Create migration plan to sync databases safely
4. Identify and remove unused tables/columns
5. Establish single source of truth

## Critical Issues Found
1. **Data Type Mismatches**: Different types for primary/foreign keys
2. **Duplicate Tables**: Two different API metrics implementations
3. **Missing Tables**: Production missing auth-related schemas
4. **Schema Inconsistencies**: Column order and naming differences

## Documents in This Sprint
- `database-discrepancies.md` - Complete list of differences
- `codebase-usage-analysis.md` - What the code actually uses
- `migration-plan.md` - Step-by-step migration strategy
- `unused-tables-analysis.md` - Tables/columns to remove
- `TODO.md` - Sprint-specific tasks
- `progress.md` - Sprint progress tracking

## ⚠️ CRITICAL WARNINGS
- DO NOT run any migrations without thorough testing
- BACKUP production database before any changes
- Review Sprint 32 data loss incident before proceeding