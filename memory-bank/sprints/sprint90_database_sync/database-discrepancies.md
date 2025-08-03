# Database Discrepancies Analysis

## Overview
This document comprehensively lists all differences between dev and production databases, verified against the codebase.

## 1. Critical Data Type Mismatches

### `bazaar-vid_exports` Table
**Issue**: Primary and foreign key type mismatch
- **Production DB**: 
  - id: `text`
  - user_id: `text`
  - project_id: `text`
- **Dev DB**: 
  - id: `uuid`
  - user_id: `character varying(255)`
  - project_id: `uuid`
- **Codebase (schema.ts:791-793)**:
  ```typescript
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 }).notNull(),
  projectId: d.uuid("project_id").notNull()
  ```
- **Verdict**: Dev DB matches codebase. Production is WRONG.
- **Risk**: HIGH - Type mismatches will cause query failures

### `bazaar-vid_export_analytics` Table
**Issue**: Foreign key type mismatch with exports table
- **Production DB**: export_id: `uuid`
- **Dev DB**: export_id: `text`
- **Codebase (schema.ts:835)**:
  ```typescript
  exportId: d.uuid("export_id").notNull().references(() => exports.id)
  ```
- **Verdict**: Production matches codebase. Dev is WRONG.
- **Risk**: HIGH - Foreign key constraint violations

## 2. Duplicate API Usage Metrics Tables

### Two Different Tables Exist:
1. **`api_usage_metric`** (Both DBs)
   - Uses camelCase columns: `userId`, `projectId`, `responseTime`
   - Dev has: `tokenCount`, `errorType`
   
2. **`bazaar-vid_api_usage_metric`** (Production only)
   - Uses snake_case columns: `user_id`, `project_id`, `response_time_ms`
   - Has: `input_tokens`, `output_tokens`, `total_tokens`

### Codebase Analysis (schema.ts:983-984):
```typescript
export const apiUsageMetrics = createTable(
  "api_usage_metric",
```
- Table name: `bazaar-vid_api_usage_metric` (with prefix)
- Columns use snake_case in DB but camelCase in code

**Verdict**: Neither DB fully matches codebase. Need to check which table is actually being used.

## 3. Schema/Namespace Differences

### Dev-only Schemas:
- `auth` schema with functions:
  - `auth.session()`
  - `auth.user_id()`
- `neon_auth` schema with table:
  - `users_sync`
- `pgrst` schema with function:
  - `pre_config()`

### Production-only:
- `show_db_tree()` function in public schema

**Verdict**: Need to verify if auth schemas are required by the application.

## 4. Column Field Differences

### Multiple tables have mismatched column orders:
- `bazaar-vid_custom_component_job`
- `bazaar-vid_message`
- `bazaar-vid_scene_iteration`

**Risk**: LOW - Column order doesn't affect functionality

## 5. Missing Column Comments

Dev has helpful comments on:
- `bazaar-vid_animation_design_brief.originalTsxCode`
- `bazaar-vid_animation_design_brief.lastFixAttempt`
- `bazaar-vid_animation_design_brief.fixIssues`

**Risk**: NONE - Documentation only

## Next Steps
1. Search codebase for actual table usage patterns
2. Identify which API metrics table is being used
3. Check if auth schemas are required
4. Create migration plan to fix type mismatches