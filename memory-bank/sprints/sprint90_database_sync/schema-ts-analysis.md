# Schema.ts vs Database Analysis

## Overview
Analysis of how schema.ts aligns with dev and production databases.

## 1. Schema.ts Key Points

### Table Prefix
```typescript
export const createTable = pgTableCreator((name) => `bazaar-vid_${name}`);
```
All tables get `bazaar-vid_` prefix automatically.

### Critical Tables Analysis

#### `exports` Table (schema.ts lines 790-819)
**Schema.ts Definition:**
```typescript
export const exports = createTable("exports", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 }).notNull(),
  projectId: d.uuid("project_id").notNull(),
  renderId: d.text("render_id").notNull().unique(),
  // ... rest of fields
}));
```

**Reality Check:**
- ✅ Dev DB matches schema.ts perfectly
- ❌ Prod DB has WRONG types (text instead of uuid/varchar)

#### `exportAnalytics` Table (schema.ts lines 832-859)
**Schema.ts Definition:**
```typescript
exportId: d.uuid("export_id").notNull().references(() => exports.id)
```

**Reality Check:**
- ✅ Dev DB: export_id is uuid (correct)
- ❌ Prod DB: export_id is text (wrong)

#### `apiUsageMetrics` Table (schema.ts lines 983-1017)
**Schema.ts Definition:**
```typescript
export const apiUsageMetrics = createTable(
  "api_usage_metric",  // Creates "bazaar-vid_api_usage_metric"
  (d) => ({
    userId: d.varchar({ length: 255 }),
    projectId: d.uuid(),
    responseTime: d.integer(),
    tokenCount: d.integer(),
    // ...
  })
);
```

**Reality Check:**
- ❌ Dev DB: Has wrong table `api_usage_metric` (missing prefix)
- ✅ Prod DB: Has correct `bazaar-vid_api_usage_metric` BUT also has duplicate

## 2. Tables in Schema.ts but NOT in Either Database

### Recently Added (lines 242-334):
1. `promoCodes` - Promo code definitions
2. `promoCodeUsage` - Track promo usage
3. `paywallEvents` - Track paywall interactions
4. `paywallAnalytics` - Analytics aggregations

These tables are defined but don't exist in any database yet.

## 3. Tables in Database but NOT Used by Code

### Should Be Deleted:
1. `api_usage_metric` (without prefix) - Wrong table name
2. `bazaar-vid_component_error` - 0 rows, no code usage
3. `bazaar-vid_patch` - 0 rows, no code usage
4. `bazaar-vid_scene_plan` - 0 rows, no code usage
5. `bazaar-vid_scene_specs` - 0 rows, no code usage

### Need Investigation:
1. `bazaar-vid_project_memory` - 671 rows but defined in schema.ts
2. `bazaar-vid_metric` - 389 rows but defined in schema.ts
3. `bazaar-vid_agent_message` - 3 rows but defined in schema.ts

## 4. Schema.ts IS the Source of Truth

The schema.ts file represents what the application expects. Both databases should match this definition.

### Dev DB Status:
- ✅ Mostly correct types
- ❌ Has wrong `api_usage_metric` table
- ❌ Missing new promo/paywall tables

### Prod DB Status:
- ❌ Critical type mismatches in exports tables
- ❌ Has duplicate API metrics tables
- ❌ Missing new promo/paywall tables

## 5. Migration Strategy

### Phase 1: Fix Critical Issues
1. Fix production exports table types to match schema.ts
2. Fix production export_analytics table type
3. Delete duplicate `api_usage_metric` from both DBs

### Phase 2: Add New Tables
Run Drizzle migrations to add:
- promoCodes
- promoCodeUsage
- paywallEvents
- paywallAnalytics

### Phase 3: Cleanup
Delete unused tables that aren't in active use

## Summary

**Schema.ts is correct and should be the single source of truth.** Both databases need to be aligned to match exactly what's defined in schema.ts. The production database has critical type mismatches that must be fixed urgently.