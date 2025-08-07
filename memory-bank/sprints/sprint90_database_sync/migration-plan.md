# Database Migration Plan

## ⚠️ CRITICAL WARNING
Remember Sprint 32 data loss incident! Follow this plan EXACTLY.

## Overview
This migration plan addresses critical schema mismatches between dev and production databases.

## Phase 1: Backup & Preparation (MANDATORY)

### 1.1 Full Database Backups
```bash
# Production backup
pg_dump $PROD_DATABASE_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# Dev backup
pg_dump $DEV_DATABASE_URL > dev_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1.2 Create Test Database
- Clone production to a test environment
- Run all migrations on test first
- Verify data integrity

## Phase 2: Critical Type Fixes (HIGH PRIORITY)

### 2.1 Fix `bazaar-vid_exports` Table in Production

**Problem**: Production uses text instead of uuid/varchar types
**Risk**: Application failures when querying exports

```sql
-- STEP 1: Create new table with correct types
CREATE TABLE "bazaar-vid_exports_new" (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(255) NOT NULL,
    project_id uuid NOT NULL,
    render_id text NOT NULL UNIQUE,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0,
    format text DEFAULT 'mp4'::text NOT NULL,
    quality text DEFAULT 'high'::text NOT NULL,
    output_url text,
    file_size integer,
    duration integer,
    error text,
    metadata jsonb,
    download_count integer DEFAULT 0,
    last_downloaded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT NOW() NOT NULL,
    completed_at timestamp without time zone
);

-- STEP 2: Copy data with type conversion
INSERT INTO "bazaar-vid_exports_new" 
SELECT 
    id::uuid,
    user_id::varchar(255),
    project_id::uuid,
    render_id,
    status,
    progress,
    format,
    quality,
    output_url,
    file_size,
    duration,
    error,
    metadata,
    download_count,
    last_downloaded_at,
    created_at,
    completed_at
FROM "bazaar-vid_exports";

-- STEP 3: Add indexes
CREATE INDEX "exports_user_idx_new" ON "bazaar-vid_exports_new" (user_id);
CREATE INDEX "exports_project_idx_new" ON "bazaar-vid_exports_new" (project_id);
CREATE INDEX "exports_render_idx_new" ON "bazaar-vid_exports_new" (render_id);
CREATE INDEX "exports_created_idx_new" ON "bazaar-vid_exports_new" (created_at);

-- STEP 4: Add foreign keys
ALTER TABLE "bazaar-vid_exports_new" 
ADD CONSTRAINT "exports_user_fk" 
FOREIGN KEY (user_id) REFERENCES "bazaar-vid_user"(id) ON DELETE CASCADE;

ALTER TABLE "bazaar-vid_exports_new" 
ADD CONSTRAINT "exports_project_fk" 
FOREIGN KEY (project_id) REFERENCES "bazaar-vid_project"(id) ON DELETE CASCADE;

-- STEP 5: Swap tables (TRANSACTION)
BEGIN;
ALTER TABLE "bazaar-vid_exports" RENAME TO "bazaar-vid_exports_old";
ALTER TABLE "bazaar-vid_exports_new" RENAME TO "bazaar-vid_exports";
COMMIT;

-- STEP 6: After verification, drop old table
-- DROP TABLE "bazaar-vid_exports_old";
```

### 2.2 Fix `bazaar-vid_export_analytics` in Dev

**Problem**: Dev uses text for export_id instead of uuid

```sql
-- Similar process but for dev database
ALTER TABLE "bazaar-vid_export_analytics" 
ALTER COLUMN export_id TYPE uuid USING export_id::uuid;
```

## Phase 3: Remove Duplicate Tables

### 3.1 Remove `api_usage_metric` (without prefix)

```sql
-- Check if any data needs to be migrated first
SELECT COUNT(*) FROM api_usage_metric;

-- If data exists, migrate to prefixed table
INSERT INTO "bazaar-vid_api_usage_metric" 
SELECT * FROM api_usage_metric 
WHERE id NOT IN (SELECT id FROM "bazaar-vid_api_usage_metric");

-- Drop duplicate table
DROP TABLE api_usage_metric;
```

## Phase 4: Clean Unused Tables

### 4.1 Drop Empty Tables (Safe)

```sql
-- Verify they're empty first
SELECT 'component_error', COUNT(*) FROM "bazaar-vid_component_error"
UNION ALL SELECT 'patch', COUNT(*) FROM "bazaar-vid_patch"
UNION ALL SELECT 'scene_plan', COUNT(*) FROM "bazaar-vid_scene_plan"
UNION ALL SELECT 'scene_specs', COUNT(*) FROM "bazaar-vid_scene_specs";

-- Drop if empty
DROP TABLE "bazaar-vid_component_error";
DROP TABLE "bazaar-vid_patch";
DROP TABLE "bazaar-vid_scene_plan";
DROP TABLE "bazaar-vid_scene_specs";
```

### 4.2 Investigate Legacy Tables

Before dropping:
1. Check `bazaar-vid_project_memory` (621 rows)
2. Check `bazaar-vid_metric` (389 rows)
3. Check `bazaar-vid_agent_message` (3 rows)

## Phase 5: Schema Alignment

### 5.1 Auth Schemas Decision ✓

Dev has auth-related schemas that prod lacks:
- `auth` schema with functions
- `neon_auth` schema
- `pgrst` schema

**Decision: NOT REQUIRED** - These are PostgREST/Supabase schemas. The app uses NextAuth.js with JWT strategy, not database auth functions. See `auth-schema-analysis.md` for details.

**Action**: Do not add to production. Can remove from dev.

## Phase 6: Validation

### 6.1 Run Validation Queries

```sql
-- Check all foreign keys are valid
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;

-- Verify row counts match
SELECT table_name, COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public' 
GROUP BY table_name;
```

### 6.2 Application Testing

1. Deploy to staging with new schema
2. Run full test suite
3. Monitor for any errors
4. Check all CRUD operations work

## Phase 7: Schema.ts Alignment

### 7.1 Add Missing Tables from Schema.ts

After fixing critical issues, add new tables defined in schema.ts:

```sql
-- Run Drizzle migration to create new tables
npm run db:generate
npm run db:migrate
```

This will create:
- `bazaar-vid_promo_codes`
- `bazaar-vid_promo_code_usage`
- `bazaar-vid_paywall_events`
- `bazaar-vid_paywall_analytics`

## Phase 8: Production Deployment

### 7.1 Deployment Steps

1. **Maintenance Mode**: Put app in maintenance mode
2. **Final Backup**: Take final backup
3. **Run Migrations**: Execute migration scripts
4. **Verify**: Run validation queries
5. **Deploy Code**: Deploy updated application
6. **Monitor**: Watch logs for errors
7. **Rollback Plan**: Keep old tables for 24 hours

### 7.2 Rollback Plan

If issues occur:
```sql
-- Quickly revert exports table
BEGIN;
ALTER TABLE "bazaar-vid_exports" RENAME TO "bazaar-vid_exports_failed";
ALTER TABLE "bazaar-vid_exports_old" RENAME TO "bazaar-vid_exports";
COMMIT;
```

## Timeline

1. **Day 1**: Test migrations on staging
2. **Day 2**: Fix any issues found
3. **Day 3**: Production migration (low traffic time)
4. **Day 4-7**: Monitor and keep backups
5. **Day 8**: Clean up old tables if stable

## Success Criteria

- [ ] All type mismatches resolved
- [ ] No duplicate tables
- [ ] All foreign keys valid
- [ ] Application works without errors
- [ ] No data loss
- [ ] Performance maintained or improved