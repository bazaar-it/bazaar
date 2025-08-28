# 🚨 CRITICAL DATABASE MIGRATION GUIDE 🚨

## ⚠️ WARNING: Read This Before ANY Migration

**ALWAYS verify actual schema before running migrations!**

### What Almost Went Wrong (2024-08-28)

We almost ran incorrect migration SQL that would have created completely wrong tables in production. The difference between what we thought existed vs. actual dev schema:

**What we thought `bazaar-vid_brand_extraction` had:**
- 22 simple columns
- Basic structure with `brand_description`, `accent_color`, `logo_url`

**What dev actually has:**
- **29 complex columns**
- Advanced Sprint 99.5 structure with `user_id`, `extraction_version`, `extraction_status`, `brand_tagline`
- Complex jsonb fields: `visual_analysis`, `brand_data`, `design_data`, `product_data`, `social_proof_data`, `content_data`, `sections_data`, `screenshots`, `styles_extracted`, `confidence`

## Safe Migration Process

### Step 1: Always Verify Current Dev Schema
```sql
-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'your_table_name'
ORDER BY ordinal_position;

-- Check total columns
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'your_table_name';
```

### Step 2: Generate Exact CREATE TABLE Statements
```sql
-- Generate CREATE TABLE from existing schema
SELECT 
    'CREATE TABLE IF NOT EXISTS "' || table_name || '" (' || chr(10) ||
    string_agg(
        '    "' || column_name || '" ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'timestamp with time zone'
            WHEN data_type = 'numeric' THEN 'numeric'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ',' || chr(10) 
        ORDER BY ordinal_position
    ) || chr(10) || ');' as create_statement
FROM information_schema.columns 
WHERE table_name = 'your_table_name'
GROUP BY table_name;
```

### Step 3: Check Indexes and Constraints
```sql
-- Get all indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename = 'your_table_name'
AND schemaname = 'public'
ORDER BY indexname;

-- Get unique constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_name = 'your_table_name';
```

## Brand Extraction Migration (Sprint 99.5) - VERIFIED CORRECT

Based on actual dev database verification on 2024-08-28:

```sql
-- VERIFIED: Brand Extraction Tables Migration (Based on Actual Dev Schema)

-- 1. Brand Extraction (29 columns with complex structure)
CREATE TABLE IF NOT EXISTS "bazaar-vid_brand_extraction" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "url" text NOT NULL,
    "project_id" uuid,
    "user_id" varchar(255) NOT NULL,
    "extraction_id" text NOT NULL,
    "extraction_version" text NOT NULL DEFAULT '2.0.0'::text,
    "extraction_status" text NOT NULL DEFAULT 'processing'::text,
    "brand_name" text,
    "brand_tagline" text,
    "primary_color" text,
    "secondary_color" text,
    "visual_analysis" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "content_analysis" jsonb DEFAULT '{}'::jsonb,
    "synthesis" jsonb DEFAULT '{}'::jsonb,
    "brand_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "design_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "product_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "social_proof_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "content_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "sections_data" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "screenshots" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "html_content" text,
    "styles_extracted" jsonb DEFAULT '{}'::jsonb,
    "confidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "processing_time_ms" integer,
    "tokens_used" integer,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "analyzed_at" timestamp with time zone,
    PRIMARY KEY ("id")
);

-- 2. Story Arc (19 columns with dual duration tracking)
CREATE TABLE IF NOT EXISTS "bazaar-vid_story_arc" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "extraction_id" uuid NOT NULL,
    "project_id" uuid,
    "user_id" varchar(255) NOT NULL,
    "title" text NOT NULL,
    "narrative_structure" text NOT NULL,
    "total_duration_frames" integer NOT NULL,
    "total_duration_seconds" numeric NOT NULL,
    "style" text NOT NULL DEFAULT 'professional'::text,
    "brand_context" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "scenes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "generation_model" text,
    "generation_prompt" text,
    "generation_time_ms" integer,
    "status" text NOT NULL DEFAULT 'draft'::text,
    "approved_by" varchar(255),
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- 3. Story Arc Scene (20 columns with code generation)
CREATE TABLE IF NOT EXISTS "bazaar-vid_story_arc_scene" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "story_arc_id" uuid NOT NULL,
    "scene_number" integer NOT NULL,
    "title" text NOT NULL,
    "duration_frames" integer NOT NULL,
    "narrative" text NOT NULL,
    "emotional_beat" text NOT NULL,
    "visuals" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "text_content" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "ui_elements" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "styling" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "template_name" text NOT NULL,
    "template_variant" text,
    "template_capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "edit_prompt" text,
    "edit_status" text DEFAULT 'pending'::text,
    "generated_code" text,
    "code_version" integer DEFAULT 1,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- 4. Extraction Cache (10 columns with hit tracking)
CREATE TABLE IF NOT EXISTS "bazaar-vid_extraction_cache" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "url" text NOT NULL,
    "url_hash" text NOT NULL,
    "extraction_id" uuid NOT NULL,
    "cache_key" text NOT NULL,
    "cache_data" jsonb NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "hit_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- 5. Brand Profile (17 columns, project-based)
CREATE TABLE IF NOT EXISTS "bazaar-vid_brand_profile" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL,
    "website_url" text NOT NULL,
    "brand_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "colors" jsonb DEFAULT '{}'::jsonb,
    "typography" jsonb DEFAULT '{}'::jsonb,
    "logos" jsonb DEFAULT '{}'::jsonb,
    "copy_voice" jsonb DEFAULT '{}'::jsonb,
    "product_narrative" jsonb DEFAULT '{}'::jsonb,
    "social_proof" jsonb DEFAULT '{}'::jsonb,
    "screenshots" jsonb DEFAULT '[]'::jsonb,
    "media_assets" jsonb DEFAULT '[]'::jsonb,
    "extraction_version" text DEFAULT '1.0.0'::text,
    "extraction_confidence" jsonb DEFAULT '{}'::jsonb,
    "last_analyzed_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- 6. Brand Profile Version (7 columns with change tracking)
CREATE TABLE IF NOT EXISTS "bazaar-vid_brand_profile_version" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "brand_profile_id" uuid NOT NULL,
    "version_number" integer NOT NULL,
    "brand_data" jsonb NOT NULL,
    "changed_by" varchar(255),
    "change_reason" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Add Unique Constraints
ALTER TABLE "bazaar-vid_brand_extraction" ADD CONSTRAINT "bazaar-vid_brand_extraction_extraction_id_key" UNIQUE ("extraction_id");
ALTER TABLE "bazaar-vid_extraction_cache" ADD CONSTRAINT "bazaar-vid_extraction_cache_cache_key_key" UNIQUE ("cache_key");
ALTER TABLE "bazaar-vid_brand_profile_version" ADD CONSTRAINT "brand_versions_unique_idx" UNIQUE ("brand_profile_id", "version_number");

-- Create All Indexes (Performance Critical)
CREATE INDEX brand_extraction_url_idx ON "bazaar-vid_brand_extraction" (url);
CREATE INDEX brand_extraction_status_idx ON "bazaar-vid_brand_extraction" (extraction_status);
CREATE INDEX brand_extraction_user_idx ON "bazaar-vid_brand_extraction" (user_id);
CREATE INDEX brand_extraction_project_idx ON "bazaar-vid_brand_extraction" (project_id);
CREATE INDEX brand_extraction_brand_name_idx ON "bazaar-vid_brand_extraction" (brand_name);
CREATE INDEX brand_extraction_created_idx ON "bazaar-vid_brand_extraction" (created_at DESC);
CREATE INDEX brand_extraction_brand_gin ON "bazaar-vid_brand_extraction" USING gin (brand_data);
CREATE INDEX brand_extraction_visual_gin ON "bazaar-vid_brand_extraction" USING gin (visual_analysis);

CREATE INDEX story_arc_extraction_idx ON "bazaar-vid_story_arc" (extraction_id);
CREATE INDEX story_arc_project_idx ON "bazaar-vid_story_arc" (project_id);
CREATE INDEX story_arc_user_idx ON "bazaar-vid_story_arc" (user_id);
CREATE INDEX story_arc_status_idx ON "bazaar-vid_story_arc" (status);
CREATE INDEX story_arc_created_idx ON "bazaar-vid_story_arc" (created_at DESC);
CREATE INDEX story_arc_scenes_gin ON "bazaar-vid_story_arc" USING gin (scenes);

CREATE INDEX story_arc_scene_arc_idx ON "bazaar-vid_story_arc_scene" (story_arc_id);
CREATE INDEX story_arc_scene_number_idx ON "bazaar-vid_story_arc_scene" (story_arc_id, scene_number);
CREATE INDEX story_arc_scene_template_idx ON "bazaar-vid_story_arc_scene" (template_name);

CREATE INDEX extraction_cache_url_hash_idx ON "bazaar-vid_extraction_cache" (url_hash);
CREATE INDEX extraction_cache_extraction_idx ON "bazaar-vid_extraction_cache" (extraction_id);
CREATE INDEX extraction_cache_expires_idx ON "bazaar-vid_extraction_cache" (expires_at);
CREATE UNIQUE INDEX extraction_cache_key_idx ON "bazaar-vid_extraction_cache" (cache_key);

CREATE INDEX brand_profiles_project_idx ON "bazaar-vid_brand_profile" (project_id);
CREATE INDEX brand_profiles_url_idx ON "bazaar-vid_brand_profile" (website_url);
CREATE INDEX brand_profiles_created_idx ON "bazaar-vid_brand_profile" (created_at);

CREATE INDEX brand_versions_profile_idx ON "bazaar-vid_brand_profile_version" (brand_profile_id);
CREATE INDEX brand_versions_created_idx ON "bazaar-vid_brand_profile_version" (created_at);
```

## Auto-Fix Migration (Sprint 98) - NEEDS VERIFICATION

⚠️ **MUST verify dev schema first before using:**

```sql
-- TODO: Verify these tables match actual dev schema
CREATE TABLE IF NOT EXISTS "bazaar-vid_autofix_metrics" (...);
CREATE TABLE IF NOT EXISTS "bazaar-vid_autofix_sessions" (...);
```

## Execution Checklist

### Before Running ANY Migration:
1. ✅ **BACKUP production database**
2. ✅ **Verify dev schema with MCP tools**
3. ✅ **Generate exact CREATE TABLE statements**
4. ✅ **Test on staging if available**
5. ✅ **Run during low-traffic period**
6. ✅ **Have rollback plan ready**

### After Running Migration:
1. ✅ **Verify all tables created correctly**
2. ✅ **Check row counts match expectations**
3. ✅ **Test application functionality**
4. ✅ **Update this document with results**

## Migration History

- **2024-08-28**: Brand extraction migration identified and documented
  - Near-miss: Almost ran incorrect schema
  - Resolution: Verified actual dev schema, created correct migration
  - Status: Ready for production (verified)

## Emergency Contacts

If migration fails:
1. Stop all operations immediately
2. Check `/memory-bank/sprints/sprint32/CRITICAL-DATA-LOSS-INCIDENT.md`
3. Restore from backup
4. Document incident in memory bank