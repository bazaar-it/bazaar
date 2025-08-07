# Codebase Database Usage Analysis

## Key Discovery: Table Prefix
**CRITICAL**: The codebase uses `pgTableCreator` with prefix `bazaar-vid_` (schema.ts:20)
```typescript
export const createTable = pgTableCreator((name) => `bazaar-vid_${name}`);
```

This means:
- Code reference: `apiUsageMetrics` → DB table: `bazaar-vid_api_usage_metric`
- Code reference: `exports` → DB table: `bazaar-vid_exports`

## 1. Exports Table Usage

### Schema Definition (schema.ts:790-819)
```typescript
export const exports = createTable("exports", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 }).notNull(),
  projectId: d.uuid("project_id").notNull(),
  // ... rest of fields
}));
```
**DB Table Name**: `bazaar-vid_exports`

### Used In:
- `/server/services/render/export-tracking.service.ts` - Export tracking
- `/server/api/routers/admin.ts` - Admin dashboard queries
- `/app/admin/exports/page.tsx` - Admin exports page

### Expected Types:
- `id`: uuid (NOT text)
- `userId`: varchar(255) (NOT text)
- `projectId`: uuid (NOT text)

**Production DB is WRONG** - Using text instead of proper types

## 2. API Usage Metrics Table

### Schema Definition (schema.ts:983-1017)
```typescript
export const apiUsageMetrics = createTable(
  "api_usage_metric",
  (d) => ({
    // Uses camelCase in TypeScript, but snake_case in DB columns
    userId: d.varchar("user_id", { length: 255 }),
    projectId: d.uuid("project_id"),
    responseTime: d.integer("response_time_ms"),
    // ...
  })
);
```
**DB Table Name**: `bazaar-vid_api_usage_metric`

### Used In:
- `/server/services/ai/monitoring.service.ts` - AI monitoring and metrics

### Column Mapping:
- TypeScript `userId` → DB column `user_id`
- TypeScript `projectId` → DB column `project_id`
- TypeScript `responseTime` → DB column `response_time_ms`

**The `api_usage_metric` table (without prefix) should NOT exist**

## 3. Export Analytics Table

### Schema Definition (schema.ts:832-856)
```typescript
export const exportAnalytics = createTable("export_analytics", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  exportId: d.uuid("export_id").notNull().references(() => exports.id),
  // ...
}));
```
**DB Table Name**: `bazaar-vid_export_analytics`

### Expected Type:
- `exportId`: uuid (references exports.id which should be uuid)

**Dev DB is WRONG** - Using text for export_id

## 4. Tables Actually Used by Code

Based on imports and queries found:
1. `bazaar-vid_user` ✓
2. `bazaar-vid_account` ✓
3. `bazaar-vid_project` ✓
4. `bazaar-vid_message` ✓
5. `bazaar-vid_scene` ✓
6. `bazaar-vid_exports` ✓
7. `bazaar-vid_export_analytics` ✓
8. `bazaar-vid_api_usage_metric` ✓
9. `bazaar-vid_credit_transaction` ✓
10. `bazaar-vid_user_credits` ✓
11. `bazaar-vid_email_subscriber` ✓
12. `bazaar-vid_custom_component_job` ✓
13. `bazaar-vid_scene_iteration` ✓
14. `bazaar-vid_shared_video` ✓
15. `bazaar-vid_feedback` ✓

## 5. Tables NOT Found in Code Usage

Need to verify if these are used:
- `api_usage_metric` (without prefix - DUPLICATE)
- `bazaar-vid_component_error`
- `bazaar-vid_component_evaluation_metric`
- `bazaar-vid_component_test_case`
- `bazaar-vid_animation_design_brief`
- `bazaar-vid_scene_plan`
- `bazaar-vid_scene_specs`
- `bazaar-vid_patch`
- `bazaar-vid_metric`
- `bazaar-vid_usage_limit`
- `bazaar-vid_user_usage`
- `bazaar-vid_verificationToken`
- `bazaar-vid_project_memory`
- `bazaar-vid_image_analysis`
- `bazaar-vid_agent_message`
- `bazaar-vid_credit_package`

## Summary of Critical Issues

1. **Production `bazaar-vid_exports` has WRONG data types**
   - Should be: id (uuid), userId (varchar), projectId (uuid)
   - Currently: id (text), user_id (text), project_id (text)

2. **Duplicate API metrics table**
   - Should only have: `bazaar-vid_api_usage_metric`
   - Remove: `api_usage_metric` (without prefix)

3. **Dev `bazaar-vid_export_analytics` has WRONG type**
   - export_id should be uuid, not text

4. **Auth schemas in dev only**
   - Need to verify if app requires auth, neon_auth, pgrst schemas