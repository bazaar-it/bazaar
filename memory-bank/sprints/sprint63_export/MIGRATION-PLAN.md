# Export Tables Migration Plan for Production

**Created**: 2025-01-30
**Purpose**: Safe migration plan for adding export tracking tables to production

## Current Situation

### Development Branch
- ✅ Export tables created manually with correct types
- ✅ Tables: `bazaar-vid_exports` and `bazaar-vid_export_analytics`
- ✅ Using UUID for IDs, varchar(255) for user_id (NextAuth compatible)
- ✅ No dangerous migrations in queue

### What Needs to Happen for Production

## Option 1: Manual Table Creation (RECOMMENDED)

Since we manually created the tables in dev, we should do the same in production:

```sql
-- Run this SQL directly on production database after backup
-- This is the exact SQL we used in development

CREATE TABLE "bazaar-vid_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(255) NOT NULL,
  "project_id" uuid NOT NULL,
  "render_id" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL CHECK ("status" IN ('pending', 'rendering', 'completed', 'failed')),
  "progress" integer DEFAULT 0,
  "format" text DEFAULT 'mp4' NOT NULL CHECK ("format" IN ('mp4', 'webm', 'gif')),
  "quality" text DEFAULT 'high' NOT NULL CHECK ("quality" IN ('low', 'medium', 'high')),
  "output_url" text,
  "file_size" integer,
  "duration" integer,
  "error" text,
  "metadata" jsonb,
  "download_count" integer DEFAULT 0,
  "last_downloaded_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  CONSTRAINT "bazaar-vid_exports_render_id_unique" UNIQUE("render_id")
);

CREATE TABLE "bazaar-vid_export_analytics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "export_id" uuid NOT NULL,
  "event" text NOT NULL CHECK ("event" IN ('started', 'progress', 'completed', 'failed', 'downloaded', 'viewed')),
  "event_data" jsonb,
  "user_agent" text,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "bazaar-vid_exports" 
ADD CONSTRAINT "bazaar-vid_exports_user_id_bazaar-vid_user_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "bazaar-vid_user"("id") ON DELETE CASCADE;

ALTER TABLE "bazaar-vid_exports" 
ADD CONSTRAINT "bazaar-vid_exports_project_id_bazaar-vid_project_id_fk" 
FOREIGN KEY ("project_id") REFERENCES "bazaar-vid_project"("id") ON DELETE CASCADE;

ALTER TABLE "bazaar-vid_export_analytics" 
ADD CONSTRAINT "bazaar-vid_export_analytics_export_id_bazaar-vid_exports_id_fk" 
FOREIGN KEY ("export_id") REFERENCES "bazaar-vid_exports"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX "exports_user_idx" ON "bazaar-vid_exports" ("user_id");
CREATE INDEX "exports_project_idx" ON "bazaar-vid_exports" ("project_id");
CREATE INDEX "exports_render_idx" ON "bazaar-vid_exports" ("render_id");
CREATE INDEX "exports_created_idx" ON "bazaar-vid_exports" ("created_at");

CREATE INDEX "export_analytics_export_idx" ON "bazaar-vid_export_analytics" ("export_id");
CREATE INDEX "export_analytics_event_idx" ON "bazaar-vid_export_analytics" ("event");
CREATE INDEX "export_analytics_created_idx" ON "bazaar-vid_export_analytics" ("created_at");
```

## Option 2: Generate Clean Migration (More Complex)

1. On production branch, ensure schema.ts has the export tables
2. Generate a migration that ONLY contains the export tables
3. Review carefully to ensure no ALTER TABLE commands
4. Apply migration

## Deployment Steps

### Pre-deployment
1. **BACKUP PRODUCTION DATABASE**
2. Save the backup location and timestamp
3. Test restore procedure

### Deployment
1. Merge code changes (without migration files)
2. Run the SQL script above directly on production
3. Verify tables created correctly:
   ```sql
   SELECT * FROM "bazaar-vid_exports" LIMIT 1;
   SELECT * FROM "bazaar-vid_export_analytics" LIMIT 1;
   ```

### Post-deployment
1. Test export functionality
2. Monitor for any errors
3. Document deployment in memory bank

## Rollback Plan

If anything goes wrong:
```sql
-- Emergency rollback
DROP TABLE IF EXISTS "bazaar-vid_export_analytics" CASCADE;
DROP TABLE IF EXISTS "bazaar-vid_exports" CASCADE;
```

Then restore from backup if needed.

## Important Notes

- **DO NOT** use drizzle migrations that contain ALTER TABLE
- **DO NOT** change any existing column types
- **ALWAYS** backup before any database changes
- **TEST** on a staging database if available

## Verification Checklist

- [ ] Production database backed up
- [ ] SQL script reviewed by team
- [ ] No ALTER TABLE commands present
- [ ] Foreign key references verified
- [ ] Index names don't conflict
- [ ] Rollback plan ready
- [ ] Monitoring in place