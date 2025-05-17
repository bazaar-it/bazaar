# A2A Database Column Migration Plan

## Overview

We needed to migrate from camelCase column names to snake_case column names in our `bazaar-vid_custom_component_job` table without losing data. This affected three critical columns:

- `originalTsxCode` → `original_tsx_code`
- `lastFixAttempt` → `last_fix_attempt`
- `fixIssues` → `fix_issues`

These columns store data needed by the A2A component fixing workflow, specifically for the Component Loading Fixer Agent to diagnose and repair broken components.

## Migration Approach

We followed the "expand and synchronize" pattern:

1. **Expand**: Keep both versions of the columns in the schema
2. **Synchronize**: Copy data bidirectionally between camelCase and snake_case columns
3. **Adapt**: Update application code to handle both naming conventions

## Implementation Details

### Schema Updates

We modified the schema definition to include both camelCase and snake_case columns:

```typescript
// CamelCase original columns
originalTsxCode: d.text(), 
lastFixAttempt: d.timestamp({ withTimezone: true }),
fixIssues: d.text(),

// Snake_case new columns
original_tsx_code: d.text('original_tsx_code'),
last_fix_attempt: d.timestamp('last_fix_attempt', { withTimezone: true }),
fix_issues: d.text('fix_issues')
```

### Data Synchronization

We created a SQL script that:
1. Checks if data needs to be migrated in either direction
2. Copies data from camelCase to snake_case columns if needed
3. Copies data from snake_case to camelCase columns if needed
4. Ensures both versions have identical data

### Code Compatibility

We updated our services to work with both naming conventions:

```typescript
// Support both camelCase and snake_case column names during migration
const originalTsxCode = task.originalTsxCode || task.original_tsx_code;
```

## Results

This approach allowed us to:
1. Maintain all existing data without data loss
2. Support code using either naming convention
3. Proceed with A2A integration testing and development
4. Gradually transition to consistent snake_case naming

## Future Steps

1. **Audit**: Ensure all application code is consistently using snake_case column names
2. **Test**: Verify all functionality works with only snake_case columns
3. **Contract**: Eventually remove the duplicate camelCase columns once code is fully migrated

## References

- [Zero Downtime Schema Changes](https://www.harness.io/blog/how-to-safely-move-a-db-column)
- [Expand-Contract Pattern for Schema Changes](https://www.sqlshack.com/sql-server-database-migrations-with-zero-data-loss-and-zero-downtime/) 